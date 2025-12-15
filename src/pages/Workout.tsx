import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, Play, Pause, Dumbbell, PlusCircle } from "lucide-react";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import ExerciseGroupCard, { CompletedSetData } from "@/components/ExerciseGroupCard";
import ManualExerciseLogEntry from "@/components/ManualExerciseLogEntry";
import { toast } from "sonner";
import { rescheduleRemainingWorkouts } from "@/hooks/useRescheduleWorkouts";

interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  weight: string | null;
  notes: string | null;
  video_url: string | null;
  rest_seconds: number | null;
  rir: string | null;
  order_index: number;
  superset_group: string | null;
}

interface ExerciseLog {
  exercise_id: string;
  sets: number;
  reps: string;
  weight: string | null;
}

interface SessionState {
  startedAt: number | null; // timestamp when workout started
  isPaused: boolean;
  pausedAt: number | null; // timestamp when paused
  totalPausedMs: number; // accumulated paused time
  completedExercises: string[];
  exerciseWeights: Record<string, CompletedSetData[]>;
  swappedExercises: Record<string, string>; // exerciseId -> swapped exercise name
}

const getSessionKey = (workoutId: string) => `workout_session_${workoutId}`;

const Workout = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set());
  const [exerciseWeights, setExerciseWeights] = useState<Record<string, CompletedSetData[]>>({});
  const [swappedExercises, setSwappedExercises] = useState<Record<string, string>>({});
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  
  // Timer state - now based on timestamps for persistence
  const [sessionState, setSessionState] = useState<SessionState | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const sessionLoaded = useRef(false);

  // Load session from localStorage on mount
  useEffect(() => {
    if (!id || sessionLoaded.current) return;
    
    const stored = localStorage.getItem(getSessionKey(id));
    if (stored) {
      try {
        const parsed: SessionState = JSON.parse(stored);
        setSessionState(parsed);
        setCompletedExercises(new Set(parsed.completedExercises));
        setExerciseWeights(parsed.exerciseWeights);
        setSwappedExercises(parsed.swappedExercises || {});
      } catch (e) {
        console.error("Failed to parse session state:", e);
      }
    }
    sessionLoaded.current = true;
  }, [id]);

  // Save session to localStorage whenever state changes
  const saveSession = useCallback((state: SessionState) => {
    if (!id) return;
    localStorage.setItem(getSessionKey(id), JSON.stringify(state));
  }, [id]);

  // Calculate elapsed time based on timestamps
  useEffect(() => {
    const calculateElapsed = () => {
      if (!sessionState?.startedAt) {
        setElapsedSeconds(0);
        return;
      }
      
      const now = Date.now();
      let elapsed = now - sessionState.startedAt - sessionState.totalPausedMs;
      
      // If currently paused, subtract time since pause started
      if (sessionState.isPaused && sessionState.pausedAt) {
        elapsed -= (now - sessionState.pausedAt);
      }
      
      setElapsedSeconds(Math.max(0, Math.floor(elapsed / 1000)));
    };

    calculateElapsed();
    
    // Only run interval if workout is active and not paused
    if (sessionState?.startedAt && !sessionState.isPaused) {
      timerRef.current = setInterval(calculateElapsed, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [sessionState?.startedAt, sessionState?.isPaused, sessionState?.pausedAt, sessionState?.totalPausedMs]);

  const hasStarted = !!sessionState?.startedAt;
  const isTimerRunning = hasStarted && !sessionState?.isPaused;

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const startWorkout = () => {
    const newState: SessionState = {
      startedAt: Date.now(),
      isPaused: false,
      pausedAt: null,
      totalPausedMs: 0,
      completedExercises: [],
      exerciseWeights: {},
      swappedExercises: {},
    };
    setSessionState(newState);
    saveSession(newState);
  };

  const toggleTimer = () => {
    if (!sessionState) return;
    
    const now = Date.now();
    let newState: SessionState;
    
    if (sessionState.isPaused) {
      // Resuming - add paused duration to total
      const pausedDuration = sessionState.pausedAt ? now - sessionState.pausedAt : 0;
      newState = {
        ...sessionState,
        isPaused: false,
        pausedAt: null,
        totalPausedMs: sessionState.totalPausedMs + pausedDuration,
      };
    } else {
      // Pausing
      newState = {
        ...sessionState,
        isPaused: true,
        pausedAt: now,
      };
    }
    
    setSessionState(newState);
    saveSession(newState);
  };

  const { data: workout, isLoading } = useQuery({
    queryKey: ["workout", id],
    queryFn: async () => {
      if (!user || !id) return null;

      const { data: userWorkout, error: workoutError } = await supabase
        .from("user_workouts")
        .select("*, workout_templates(*)")
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (workoutError) throw workoutError;
      if (!userWorkout) return null;

      const { data: exercises, error: exercisesError } = await supabase
        .from("exercises")
        .select("*")
        .eq("workout_template_id", userWorkout.workout_template_id)
        .order("order_index");

      if (exercisesError) throw exercisesError;

      // Fetch logs for THIS workout (used when viewing completed workouts)
      const { data: workoutLogs, error: workoutLogsError } = await supabase
        .from("exercise_logs")
        .select("exercise_id, set_number, reps, weight, completed_at, swapped_exercise_name")
        .eq("user_id", user.id)
        .eq("user_workout_id", id)
        .order("exercise_id")
        .order("set_number");

      if (workoutLogsError) throw workoutLogsError;

      // Extract swapped exercise names for completed workouts
      const savedSwappedExercises: Record<string, string> = {};
      if (workoutLogs) {
        workoutLogs.forEach((log: any) => {
          if (log.swapped_exercise_name) {
            savedSwappedExercises[log.exercise_id] = log.swapped_exercise_name;
          }
        });
      }

      // Fetch last workout logs for each exercise
      const exerciseIds = (exercises || []).map((e: Exercise) => e.id);
      const { data: lastLogs } = await supabase
        .from("exercise_logs")
        .select("exercise_id, set_number, reps, weight, completed_at")
        .eq("user_id", user.id)
        .in("exercise_id", exerciseIds)
        .order("completed_at", { ascending: false });

      // Group logs by exercise and get the most recent session
      const lastWorkoutByExercise: Record<string, ExerciseLog> = {};
      if (lastLogs) {
        const exerciseLogGroups: Record<string, typeof lastLogs> = {};
        lastLogs.forEach((log) => {
          if (!exerciseLogGroups[log.exercise_id]) {
            exerciseLogGroups[log.exercise_id] = [];
          }
          exerciseLogGroups[log.exercise_id].push(log);
        });

        Object.entries(exerciseLogGroups).forEach(([exerciseId, logs]) => {
          if (logs.length > 0) {
            const latestDate = logs[0].completed_at;
            const sessionLogs = logs.filter((l) => l.completed_at === latestDate);
            lastWorkoutByExercise[exerciseId] = {
              exercise_id: exerciseId,
              sets: sessionLogs.length,
              reps: sessionLogs[0]?.reps || "",
              weight: sessionLogs[0]?.weight || null,
            };
          }
        });
      }

      return {
        ...userWorkout,
        workout_template: userWorkout.workout_templates,
        exercises: exercises as Exercise[],
        lastWorkoutByExercise,
        workoutLogs: workoutLogs || [],
        savedSwappedExercises,
      };
    },
    enabled: !!user && !!id,
  });

  // Load saved swapped exercises for completed workouts
  useEffect(() => {
    if (workout?.savedSwappedExercises && Object.keys(workout.savedSwappedExercises).length > 0) {
      setSwappedExercises(workout.savedSwappedExercises);
    }
  }, [workout?.savedSwappedExercises]);

  const handleExerciseComplete = (exerciseId: string, isComplete: boolean, completedSets: CompletedSetData[]) => {
    setCompletedExercises((prev) => {
      const next = new Set(prev);
      if (isComplete) {
        next.add(exerciseId);
      } else {
        next.delete(exerciseId);
      }
      
      // Update session state and persist
      const newCompleted = Array.from(next);
      const newWeights = {
        ...exerciseWeights,
        [exerciseId]: completedSets,
      };
      
      if (sessionState) {
        const newState: SessionState = {
          ...sessionState,
          completedExercises: newCompleted,
          exerciseWeights: newWeights,
        };
        setSessionState(newState);
        saveSession(newState);
      }
      
      return next;
    });
    setExerciseWeights((prev) => ({
      ...prev,
      [exerciseId]: completedSets,
    }));
  };

  // Handle exercise swap
  const handleExerciseSwap = (exerciseId: string, newExercise: { name: string; videoUrl: string | null; isQuickAdd: boolean }) => {
    setSwappedExercises((prev) => {
      const updated = { ...prev, [exerciseId]: newExercise.name };
      
      if (sessionState) {
        const newState: SessionState = {
          ...sessionState,
          swappedExercises: updated,
        };
        setSessionState(newState);
        saveSession(newState);
      }
      
      return updated;
    });
  };

  // Calculate total weight lifted from all completed sets
  const totalWeightLifted = Object.values(exerciseWeights).reduce((total, sets) => {
    return total + sets.reduce((setTotal, set) => {
      const weight = parseFloat(set.weight) || 0;
      const reps = parseInt(set.reps) || 0;
      return setTotal + (weight * reps);
    }, 0);
  }, 0);

  // Determine if this is a completed workout (viewing history)
  const isCompletedWorkout = workout?.completed === true;
  const [showManualEntry, setShowManualEntry] = useState(false);
  
  // Check if workout has any logged sets
  const hasMissingLogs = isCompletedWorkout && (!workout?.workoutLogs || workout.workoutLogs.length === 0);

  type SavedSetRow = { reps: string; weight: string; completed: boolean };

  // Parse saved sets data from workout logs for completed workouts
  const savedSetsDataByExercise = useMemo(() => {
    if (!isCompletedWorkout || !workout?.workoutLogs) return {};

    const result: Record<string, SavedSetRow[]> = {};
    workout.workoutLogs.forEach((log: any) => {
      if (!result[log.exercise_id]) result[log.exercise_id] = [];
      result[log.exercise_id].push({
        reps: log.reps ?? "",
        weight: log.weight ?? "",
        completed: true,
      });
    });

    return result;
  }, [isCompletedWorkout, workout?.workoutLogs]);


  // Calculate saved total weight for completed workouts
  const savedTotalWeight = useMemo(() => {
    if (!isCompletedWorkout || !workout?.workoutLogs) return 0;
    return workout.workoutLogs.reduce((total: number, log: any) => {
      const weight = parseFloat(log.weight) || 0;
      const reps = parseInt(log.reps) || 0;
      return total + (weight * reps);
    }, 0);
  }, [isCompletedWorkout, workout?.workoutLogs]);

  // Display either active or saved total weight
  const displayedTotalWeight = isCompletedWorkout ? savedTotalWeight : totalWeightLifted;

  // Group exercises by superset_group from database
  const exerciseGroups = useMemo(() => {
    if (!workout?.exercises) return [];
    
    const groups: { id: string; label: string; exercises: (Exercise & { label?: string })[] }[] = [];
    const exercises = workout.exercises;
    
    if (exercises.length === 0) return groups;
    
    // Group exercises by their superset_group
    let currentGroupLabel = 'A';
    let i = 0;
    
    while (i < exercises.length) {
      const exercise = exercises[i];
      
      if (exercise.superset_group) {
        // Find all exercises with the same superset_group
        const groupExercises = exercises.filter(e => e.superset_group === exercise.superset_group);
        
        // Add labels to exercises in the group
        const labeledExercises = groupExercises.map((ex, idx) => ({
          ...ex,
          label: `${currentGroupLabel}${idx + 1}`,
        }));
        
        groups.push({
          id: `group-${exercise.superset_group}-${i}`,
          label: currentGroupLabel,
          exercises: labeledExercises,
        });
        
        // Skip all exercises in this superset group
        i += groupExercises.length;
      } else {
        // Standalone exercise
        groups.push({
          id: exercise.id,
          label: currentGroupLabel,
          exercises: [{ ...exercise, label: currentGroupLabel }],
        });
        i++;
      }
      
      currentGroupLabel = String.fromCharCode(currentGroupLabel.charCodeAt(0) + 1);
    }
    
    return groups;
  }, [workout?.exercises]);

  const progress = isCompletedWorkout
    ? 100
    : workout?.exercises
      ? Math.round((completedExercises.size / workout.exercises.length) * 100)
      : 0;


  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary">Loading workout...</div>
      </div>
    );
  }

  if (!workout) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Workout not found</p>
        <Button onClick={() => navigate("/")} variant="outline">
          Back to Home
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <p className="text-primary text-sm font-medium uppercase tracking-wider">
                {workout.workout_template?.subtitle}
              </p>
              <h1 className="text-xl font-bold text-foreground">
                {workout.workout_template?.title}
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Workout Info - Top Bar */}
      <div className="container mx-auto px-4 py-6">
        <div className="card-gradient rounded-xl border border-border p-4 mb-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              {isCompletedWorkout ? (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <span className="text-foreground font-mono font-semibold min-w-[60px]">
                    {formatTime(workout.duration_seconds || 0)}
                  </span>
                  <span className="text-xs text-muted-foreground">Completed</span>
                </div>
              ) : !hasStarted ? (
                <Button onClick={startWorkout} size="sm" className="bg-primary hover:bg-primary/90">
                  <Play className="w-4 h-4 mr-2" />
                  Start
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleTimer}
                    className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
                  >
                    {isTimerRunning ? (
                      <Pause className="w-4 h-4 text-foreground" />
                    ) : (
                      <Play className="w-4 h-4 text-foreground" />
                    )}
                  </button>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    <span className="text-foreground font-mono font-semibold min-w-[60px]">
                      {formatTime(elapsedSeconds)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Total Weight Lifted */}
            {(hasStarted || isCompletedWorkout) && (
              <div className="flex items-center gap-2">
                <Dumbbell className="w-4 h-4 text-primary" />
                <span className="text-foreground font-semibold">
                  {Math.round(displayedTotalWeight).toLocaleString()} lbs
                </span>
              </div>
            )}
            
            {/* Progress */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Progress</span>
              <span className="text-primary font-bold">{progress}%</span>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-blue-300 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Exercises */}
        <div className="border-t border-border pt-4">
          <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-4">
            Strength / Power
          </p>
          
          <div className="space-y-0">
            {exerciseGroups.map((group) => (
              <ExerciseGroupCard
                key={group.id}
                groupLabel={group.label}
                exercises={group.exercises.map((exercise) => ({
                  id: exercise.id,
                  name: swappedExercises[exercise.id] || exercise.name,
                  sets: exercise.sets,
                  reps: exercise.reps,
                  weight: exercise.weight,
                  notes: exercise.notes,
                  videoUrl: exercise.video_url,
                  restSeconds: exercise.rest_seconds,
                  rir: exercise.rir,
                  label: (exercise as any).label || group.label,
                  lastWorkout: workout.lastWorkoutByExercise?.[exercise.id]
                    ? {
                        sets: workout.lastWorkoutByExercise[exercise.id].sets,
                        reps: workout.lastWorkoutByExercise[exercise.id].reps,
                        weight: workout.lastWorkoutByExercise[exercise.id].weight,
                      }
                    : null,
                }))}
                isExpanded={expandedGroupId === group.id}
                onToggleExpand={() =>
                  setExpandedGroupId(expandedGroupId === group.id ? null : group.id)
                }
                onComplete={isCompletedWorkout ? () => {} : handleExerciseComplete}
                onSwap={isCompletedWorkout ? undefined : handleExerciseSwap}
                readOnly={isCompletedWorkout}
                initialSetsDataByExercise={
                  isCompletedWorkout ? (savedSetsDataByExercise as any) : undefined
                }
              />
            ))}
          </div>

          {/* Manual Entry Button for Completed Workouts with Missing Data */}
          {hasMissingLogs && (
            <div className="mt-6">
              <Button
                onClick={() => setShowManualEntry(true)}
                variant="outline"
                className="w-full border-primary text-primary hover:bg-primary/10"
              >
                <PlusCircle className="w-4 h-4 mr-2" />
                Add Missing Exercise Data
              </Button>
            </div>
          )}
        </div>
        {!isCompletedWorkout && (
          <>
            {/* Complete Button */}
            <div className="mt-8 pb-8">
              <Button
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-6 text-lg glow"
                disabled={progress < 100}
                onClick={async () => {
                  if (progress === 100 && id && user) {
                    const completedAt = new Date().toISOString();

                    // Save exercise logs to the database
                    const exerciseLogsToInsert = Object.entries(exerciseWeights).flatMap(
                      ([exerciseId, sets]) =>
                        sets.map((set, index) => ({
                          user_id: user.id,
                          user_workout_id: id,
                          exercise_id: exerciseId,
                          set_number: index + 1,
                          reps: set.reps || "0",
                          weight: set.weight || null,
                          completed_at: completedAt,
                          swapped_exercise_name: swappedExercises[exerciseId] || null,
                        }))
                    );

                    // Warn if no exercise data to save
                    if (exerciseLogsToInsert.length === 0) {
                      console.warn("No exercise logs to save - exerciseWeights:", exerciseWeights);
                      toast.warning("No exercise data was logged. Your workout will be saved without set details.");
                    }

                    if (exerciseLogsToInsert.length > 0) {
                      const { error: logsError } = await supabase
                        .from("exercise_logs")
                        .insert(exerciseLogsToInsert);

                      if (logsError) {
                        console.error("Failed to save exercise logs:", logsError);
                        toast.error("Failed to save exercise logs");
                        return;
                      }
                    }

                    const { error } = await supabase
                      .from("user_workouts")
                      .update({
                        completed: true,
                        completed_at: completedAt,
                        duration_seconds: elapsedSeconds,
                      })
                      .eq("id", id);

                    if (error) {
                      toast.error("Failed to save workout");
                    } else {
                      // Clear session from localStorage
                      localStorage.removeItem(getSessionKey(id));

                      // Reschedule remaining workouts to maintain weekday pattern
                      try {
                        await rescheduleRemainingWorkouts(user.id, id);
                      } catch (rescheduleError) {
                        console.error("Failed to reschedule workouts:", rescheduleError);
                      }

                      toast.success(`Workout completed in ${formatTime(elapsedSeconds)}!`);
                      queryClient.invalidateQueries({ queryKey: ["next-workout"] });
                      queryClient.invalidateQueries({ queryKey: ["upcomingWorkouts"] });
                      queryClient.invalidateQueries({ queryKey: ["client-workouts"] });
                      queryClient.invalidateQueries({ queryKey: ["user-stats"] });
                      queryClient.invalidateQueries({ queryKey: ["personal-records"] });
                      navigate("/");
                    }
                  }
                }}
              >
                {progress < 100 ? `Complete All Exercises (${progress}%)` : "Finish Workout"}
              </Button>
            </div>
          </>
        )}

        {/* Manual Exercise Log Entry Dialog */}
        {showManualEntry && workout?.exercises && id && user && (
          <ManualExerciseLogEntry
            open={showManualEntry}
            onOpenChange={setShowManualEntry}
            workoutId={id}
            userId={user.id}
            exercises={workout.exercises.map((ex) => ({ id: ex.id, name: ex.name }))}
          />
        )}
      </div>
    </div>
  );
};

export default Workout;
