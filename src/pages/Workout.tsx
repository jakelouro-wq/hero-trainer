import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, Play, Pause, Dumbbell, PlusCircle, AlertTriangle } from "lucide-react";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import ExerciseGroupCard, { CompletedSetData } from "@/components/ExerciseGroupCard";
import { toast } from "sonner";
import { rescheduleRemainingWorkouts } from "@/hooks/useRescheduleWorkouts";
import { useWeightUnit } from "@/hooks/useWeightUnit";
import { useBadges, useCheckAndAwardBadges, useUserStats, Badge } from "@/hooks/useBadges";
import BadgeCelebration from "@/components/BadgeCelebration";
import WorkoutCompletionDialog from "@/components/WorkoutCompletionDialog";
import ShareDialog from "@/components/ShareDialog";
import { useWorkoutDraft } from "@/hooks/useWorkoutDraft";

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
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { weightUnit } = useWeightUnit();
  const queryClient = useQueryClient();
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set());
  const [exerciseWeights, setExerciseWeights] = useState<Record<string, CompletedSetData[]>>({});
  const [swappedExercises, setSwappedExercises] = useState<Record<string, string>>({});
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  
  // Badge celebration state
  const [celebrationBadge, setCelebrationBadge] = useState<Badge | null>(null);
  const [celebrationQueue, setCelebrationQueue] = useState<Badge[]>([]);
  const { data: allBadges } = useBadges();
  const checkBadges = useCheckAndAwardBadges();
  const { data: userStats, refetch: refetchStats } = useUserStats();
  
  // Workout completion and share state
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [completedWorkoutData, setCompletedWorkoutData] = useState<{
    workoutName: string;
    date: Date;
    duration: string;
    totalWeight: number;
    intensityRating: number;
  } | null>(null);
  
  // Timer state - now based on timestamps for persistence
  const [sessionState, setSessionState] = useState<SessionState | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const sessionLoaded = useRef(false);
  
  // Database draft backup for data safety
  const { queueSave: queueDraftSave, flushSave: flushDraftSave, loadDraft, deleteDraft } = useWorkoutDraft(id);

  // Load session from localStorage on mount, with database fallback for recovery
  useEffect(() => {
    if (!id || sessionLoaded.current) return;
    
    const initSession = async () => {
      const stored = localStorage.getItem(getSessionKey(id));
      if (stored) {
        try {
          const parsed: SessionState = JSON.parse(stored);
          setSessionState(parsed);
          setCompletedExercises(new Set(parsed.completedExercises));
          setExerciseWeights(parsed.exerciseWeights);
          setSwappedExercises(parsed.swappedExercises || {});
          sessionLoaded.current = true;
          return;
        } catch (e) {
          console.error("Failed to parse session state:", e);
        }
      }
      
      // Try to recover from database if localStorage is empty/corrupted
      const dbDraft = await loadDraft();
      if (dbDraft && (Object.keys(dbDraft.exerciseWeights).length > 0 || dbDraft.startedAt)) {
        console.log("[Workout] Recovered session from database backup");
        toast.info("Recovered your workout progress from backup!");
        const recoveredSession: SessionState = {
          startedAt: dbDraft.startedAt,
          isPaused: false,
          pausedAt: null,
          totalPausedMs: dbDraft.totalPausedMs,
          completedExercises: dbDraft.completedExercises,
          exerciseWeights: dbDraft.exerciseWeights,
          swappedExercises: dbDraft.swappedExercises,
        };
        setSessionState(recoveredSession);
        setCompletedExercises(new Set(dbDraft.completedExercises));
        setExerciseWeights(dbDraft.exerciseWeights);
        setSwappedExercises(dbDraft.swappedExercises);
        // Also save to localStorage
        localStorage.setItem(getSessionKey(id), JSON.stringify(recoveredSession));
      } else {
        // No stored session - create an empty one
        const freshSession: SessionState = {
          startedAt: null,
          isPaused: false,
          pausedAt: null,
          totalPausedMs: 0,
          completedExercises: [],
          exerciseWeights: {},
          swappedExercises: {},
        };
        setSessionState(freshSession);
      }
      sessionLoaded.current = true;
    };
    
    initSession();
  }, [id, loadDraft]);

  // Save session to localStorage
  const saveSession = useCallback(
    (state: SessionState) => {
      if (!id) return;
      localStorage.setItem(getSessionKey(id), JSON.stringify(state));
    },
    [id]
  );

  // Build a snapshot that includes the latest inputs (reps/weight/checkboxes/swaps)
  const getSessionSnapshot = useCallback((): SessionState | null => {
    if (!sessionState) return null;

    return {
      ...sessionState,
      completedExercises: Array.from(completedExercises),
      exerciseWeights,
      swappedExercises,
    };
  }, [sessionState, completedExercises, exerciseWeights, swappedExercises]);

  // Auto-save on EVERY change (including each input keystroke) - to localStorage AND database
  useEffect(() => {
    const snapshot = getSessionSnapshot();
    if (!snapshot) return;
    
    // Save to localStorage immediately
    saveSession(snapshot);
    
    // Also queue database backup (debounced)
    queueDraftSave({
      exerciseWeights: snapshot.exerciseWeights,
      swappedExercises: snapshot.swappedExercises,
      completedExercises: snapshot.completedExercises,
      startedAt: snapshot.startedAt,
      totalPausedMs: snapshot.totalPausedMs,
    });
  }, [getSessionSnapshot, saveSession, queueDraftSave]);

  // Force save when app is backgrounded or closed
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "hidden") return;
      const snapshot = getSessionSnapshot();
      if (snapshot) {
        saveSession(snapshot);
        flushDraftSave(); // Immediately flush to database
      }
    };

    const handleBeforeUnload = () => {
      const snapshot = getSessionSnapshot();
      if (snapshot) {
        saveSession(snapshot);
        flushDraftSave(); // Immediately flush to database
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handleBeforeUnload);
    };
  }, [getSessionSnapshot, saveSession, flushDraftSave]);

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
    // IMPORTANT: don't wipe already-entered data; only start the timer
    const newState: SessionState = {
      startedAt: Date.now(),
      isPaused: false,
      pausedAt: null,
      totalPausedMs: 0,
      completedExercises: Array.from(completedExercises),
      exerciseWeights,
      swappedExercises,
    };
    setSessionState(newState);
    saveSession(newState);
  };

  const toggleTimer = () => {
    const base = getSessionSnapshot();
    if (!base) return;

    const now = Date.now();
    let newState: SessionState;

    if (base.isPaused) {
      // Resuming - add paused duration to total
      const pausedDuration = base.pausedAt ? now - base.pausedAt : 0;
      newState = {
        ...base,
        isPaused: false,
        pausedAt: null,
        totalPausedMs: base.totalPausedMs + pausedDuration,
      };
    } else {
      // Pausing
      newState = {
        ...base,
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

  const handleExerciseComplete = useCallback(
    (exerciseId: string, isComplete: boolean, completedSets: CompletedSetData[]) => {
      // Always store the latest inputs, even if the exercise isn't marked complete yet
      setExerciseWeights((prev) => ({
        ...prev,
        [exerciseId]: completedSets,
      }));

      setCompletedExercises((prev) => {
        const already = prev.has(exerciseId);
        if (isComplete && already) return prev;
        if (!isComplete && !already) return prev;

        const next = new Set(prev);
        if (isComplete) next.add(exerciseId);
        else next.delete(exerciseId);
        return next;
      });
    },
    []
  );

  // Handle exercise swap
  const handleExerciseSwap = useCallback(
    (
      exerciseId: string,
      newExercise: { name: string; videoUrl: string | null; isQuickAdd: boolean }
    ) => {
      setSwappedExercises((prev) => ({
        ...prev,
        [exerciseId]: newExercise.name,
      }));
    },
    []
  );

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
  const isEditMode = searchParams.get('edit') === 'true' && isCompletedWorkout;
  const [isSaving, setIsSaving] = useState(false);
  
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

  // Initialize exerciseWeights from saved data when entering edit mode
  useEffect(() => {
    if (isEditMode && Object.keys(savedSetsDataByExercise).length > 0 && Object.keys(exerciseWeights).length === 0) {
      const converted: Record<string, CompletedSetData[]> = {};
      Object.entries(savedSetsDataByExercise).forEach(([exerciseId, sets]) => {
        converted[exerciseId] = sets.map(s => ({
          reps: s.reps,
          weight: s.weight,
          completed: true,
        }));
      });
      setExerciseWeights(converted);
    }
  }, [isEditMode, savedSetsDataByExercise]);


  // Calculate saved total weight for completed workouts
  const savedTotalWeight = useMemo(() => {
    if (!isCompletedWorkout || !workout?.workoutLogs) return 0;
    return workout.workoutLogs.reduce((total: number, log: any) => {
      const weight = parseFloat(log.weight) || 0;
      const reps = parseInt(log.reps) || 0;
      return total + (weight * reps);
    }, 0);
  }, [isCompletedWorkout, workout?.workoutLogs]);

  // Display either active or saved total weight, converted to lbs if user logs in kg
  const rawTotalWeight = isCompletedWorkout ? savedTotalWeight : totalWeightLifted;
  const displayedTotalWeight = weightUnit === "kg" ? rawTotalWeight * 2.20462 : rawTotalWeight;

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

  // Process celebration queue one badge at a time
  useEffect(() => {
    if (celebrationQueue.length > 0 && !celebrationBadge) {
      setCelebrationBadge(celebrationQueue[0]);
      setCelebrationQueue(prev => prev.slice(1));
    }
  }, [celebrationQueue, celebrationBadge]);

  const handleCloseCelebration = () => {
    setCelebrationBadge(null);
    // If no more badges to show, navigate home
    if (celebrationQueue.length === 0) {
      navigate("/");
    }
  };

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
      {/* Badge Celebration Popup */}
      <BadgeCelebration 
        badge={celebrationBadge} 
        isOpen={!!celebrationBadge} 
        onClose={handleCloseCelebration} 
      />

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
                onComplete={isCompletedWorkout && !isEditMode ? () => {} : handleExerciseComplete}
                onSwap={isCompletedWorkout && !isEditMode ? undefined : handleExerciseSwap}
                readOnly={isCompletedWorkout && !isEditMode}
                initialSetsDataByExercise={
                  isCompletedWorkout && !isEditMode
                    ? (savedSetsDataByExercise as any)
                    : (Object.keys(exerciseWeights).length > 0
                        ? (Object.fromEntries(
                            Object.entries(exerciseWeights).map(([exerciseId, sets]) => [
                              exerciseId,
                              (sets || []).map((s: any) => ({
                                reps: s.reps ?? "",
                                weight: s.weight ?? "",
                                completed: !!s.completed,
                              })),
                            ])
                          ) as any)
                        : undefined)
                }
              />
            ))}
          </div>

          {/* Edit button for completed workouts (not in edit mode) */}
          {isCompletedWorkout && !isEditMode && (
            <div className="mt-6">
              <Button
                onClick={() => navigate(`/workout/${id}?edit=true`)}
                variant="outline"
                className="w-full border-primary text-primary hover:bg-primary/10"
              >
                <PlusCircle className="w-4 h-4 mr-2" />
                {hasMissingLogs ? "Add Exercise Data" : "Edit Exercise Data"}
              </Button>
            </div>
          )}
        </div>
        
        {/* Spacer for sticky button */}
        {(!isCompletedWorkout || isEditMode) && <div className="h-44" />}
      </div>

      {/* Sticky Save Changes Button for Edit Mode */}
      {isEditMode && (
        <div className="fixed bottom-20 left-0 right-0 p-4 bg-background/95 backdrop-blur-sm border-t border-border z-40">
          <div className="container mx-auto max-w-2xl flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => navigate(`/workout/${id}`)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              disabled={isSaving}
              onClick={async () => {
                if (!id || !user) return;
                setIsSaving(true);
                
                try {
                  // Delete existing logs for this workout
                  const { error: deleteError } = await supabase
                    .from("exercise_logs")
                    .delete()
                    .eq("user_workout_id", id);
                  
                  if (deleteError) {
                    toast.error("Failed to update workout data");
                    return;
                  }
                  
                  // Insert updated logs
                  const exerciseLogsToInsert = Object.entries(exerciseWeights).flatMap(
                    ([exerciseId, sets]) =>
                      sets.filter(s => s.reps || s.weight).map((set, index) => ({
                        user_id: user.id,
                        user_workout_id: id,
                        exercise_id: exerciseId,
                        set_number: index + 1,
                        reps: set.reps || "0",
                        weight: set.weight || null,
                        completed_at: workout?.completed_at || new Date().toISOString(),
                        swapped_exercise_name: swappedExercises[exerciseId] || null,
                      }))
                  );
                  
                  if (exerciseLogsToInsert.length > 0) {
                    const { error: insertError } = await supabase
                      .from("exercise_logs")
                      .insert(exerciseLogsToInsert);
                    
                    if (insertError) {
                      toast.error("Failed to save exercise data");
                      return;
                    }
                  }
                  
                  toast.success("Workout updated successfully");
                  queryClient.invalidateQueries({ queryKey: ["workout", id] });
                  queryClient.invalidateQueries({ queryKey: ["user-stats"] });
                  queryClient.invalidateQueries({ queryKey: ["personal-records"] });
                  navigate(`/workout/${id}`);
                } finally {
                  setIsSaving(false);
                }
              }}
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      )}

      {/* Sticky Finish Workout Button */}
      {!isCompletedWorkout && (
        <div className="fixed bottom-20 left-0 right-0 p-4 bg-background/95 backdrop-blur-sm border-t border-border z-40">
          <div className="container mx-auto max-w-2xl">
            <Button
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-6 text-lg glow"
              disabled={progress < 100}
              onClick={() => {
                if (progress === 100) {
                  setShowCompletionDialog(true);
                }
              }}
            >
              {progress < 100 ? `Complete All Exercises (${progress}%)` : "Finish Workout"}
            </Button>
          </div>
        </div>
      )}

      {/* Workout Completion Dialog */}
      <WorkoutCompletionDialog
        isOpen={showCompletionDialog}
        workoutName={workout?.workout_template?.title || "Workout"}
        duration={formatTime(elapsedSeconds)}
        totalWeight={Math.round(displayedTotalWeight)}
        onCancel={() => setShowCompletionDialog(false)}
        onComplete={async (intensityRating) => {
          if (!id || !user) return;
          
          setShowCompletionDialog(false);
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
              intensity_rating: intensityRating,
            })
            .eq("id", id);

          if (error) {
            toast.error("Failed to save workout");
          } else {
            // Clear session from localStorage AND database
            localStorage.removeItem(getSessionKey(id));
            await deleteDraft();

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
            queryClient.invalidateQueries({ queryKey: ["user-full-stats"] });

            // Store workout data for sharing
            setCompletedWorkoutData({
              workoutName: workout?.workout_template?.title || "Workout",
              date: new Date(),
              duration: formatTime(elapsedSeconds),
              totalWeight: Math.round(displayedTotalWeight),
              intensityRating,
            });
            
            // Check for new badges after workout completion
            try {
              const { data: updatedStats } = await refetchStats();
              if (updatedStats && allBadges) {
                checkBadges.mutate(updatedStats, {
                  onSuccess: (newBadgeIds) => {
                    if (newBadgeIds && newBadgeIds.length > 0) {
                      const newBadges = allBadges.filter(b => newBadgeIds.includes(b.id));
                      setCelebrationQueue(newBadges);
                    } else {
                      // No badges, show share dialog
                      setShowShareDialog(true);
                    }
                  },
                  onError: () => {
                    setShowShareDialog(true);
                  }
                });
              } else {
                setShowShareDialog(true);
              }
            } catch {
              setShowShareDialog(true);
            }
          }
        }}
      />

      {/* Share Dialog */}
      <ShareDialog
        isOpen={showShareDialog}
        onClose={() => {
          setShowShareDialog(false);
          navigate("/");
        }}
        data={completedWorkoutData ? {
          type: "workout",
          ...completedWorkoutData,
        } : null}
      />
    </div>
  );
};

export default Workout;
