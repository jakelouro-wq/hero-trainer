import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, Play, Pause, Dumbbell } from "lucide-react";
import { useState, useEffect, useRef, useMemo } from "react";
import ExerciseGroupCard, { CompletedSetData } from "@/components/ExerciseGroupCard";
import { toast } from "sonner";

interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  weight: string | null;
  notes: string | null;
  video_url: string | null;
  rest_seconds: number | null;
  order_index: number;
}

interface ExerciseLog {
  exercise_id: string;
  sets: number;
  reps: string;
  weight: string | null;
}

const Workout = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set());
  const [exerciseWeights, setExerciseWeights] = useState<Record<string, CompletedSetData[]>>({});
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  
  // Timer state
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Timer effect
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning]);

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
    setHasStarted(true);
    setIsTimerRunning(true);
  };

  const toggleTimer = () => {
    setIsTimerRunning(!isTimerRunning);
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
      };
    },
    enabled: !!user && !!id,
  });

  const handleExerciseComplete = (exerciseId: string, isComplete: boolean, completedSets: CompletedSetData[]) => {
    setCompletedExercises((prev) => {
      const next = new Set(prev);
      if (isComplete) {
        next.add(exerciseId);
      } else {
        next.delete(exerciseId);
      }
      return next;
    });
    setExerciseWeights((prev) => ({
      ...prev,
      [exerciseId]: completedSets,
    }));
  };

  // Calculate total weight lifted from all completed sets
  const totalWeightLifted = Object.values(exerciseWeights).reduce((total, sets) => {
    return total + sets.reduce((setTotal, set) => {
      const weight = parseFloat(set.weight) || 0;
      const reps = parseInt(set.reps) || 0;
      return setTotal + (weight * reps);
    }, 0);
  }, 0);

  // Group exercises into supersets (pairs after the first exercise)
  const exerciseGroups = useMemo(() => {
    if (!workout?.exercises) return [];
    
    const groups: { id: string; label: string; exercises: typeof workout.exercises }[] = [];
    const exercises = workout.exercises;
    
    if (exercises.length === 0) return groups;
    
    // First exercise is always standalone (A)
    if (exercises.length > 0) {
      groups.push({
        id: exercises[0].id,
        label: "A",
        exercises: [exercises[0]],
      });
    }
    
    // Remaining exercises are paired into supersets (B1/B2, C1/C2, etc.)
    let groupIndex = 1; // Start with B
    for (let i = 1; i < exercises.length; i += 2) {
      const letter = String.fromCharCode(65 + groupIndex);
      const pair = exercises.slice(i, i + 2);
      
      // Add labels to exercises in the group
      const labeledExercises = pair.map((ex, idx) => ({
        ...ex,
        label: pair.length > 1 ? `${letter}${idx + 1}` : letter,
      }));
      
      groups.push({
        id: `group-${letter}`,
        label: letter,
        exercises: labeledExercises as typeof workout.exercises,
      });
      
      groupIndex++;
    }
    
    return groups;
  }, [workout?.exercises]);

  const progress = workout?.exercises
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
              {/* Timer */}
              {!hasStarted ? (
                <Button
                  onClick={startWorkout}
                  size="sm"
                  className="bg-primary hover:bg-primary/90"
                >
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
            {hasStarted && (
              <div className="flex items-center gap-2">
                <Dumbbell className="w-4 h-4 text-primary" />
                <span className="text-foreground font-semibold">
                  {totalWeightLifted.toLocaleString()} lbs
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
                  name: exercise.name,
                  sets: exercise.sets,
                  reps: exercise.reps,
                  weight: exercise.weight,
                  notes: exercise.notes,
                  videoUrl: exercise.video_url,
                  restSeconds: exercise.rest_seconds,
                  label: (exercise as any).label || group.label,
                  lastWorkout: workout.lastWorkoutByExercise?.[exercise.id] ? {
                    sets: workout.lastWorkoutByExercise[exercise.id].sets,
                    reps: workout.lastWorkoutByExercise[exercise.id].reps,
                    weight: workout.lastWorkoutByExercise[exercise.id].weight,
                  } : null,
                }))}
                isExpanded={expandedGroupId === group.id}
                onToggleExpand={() =>
                  setExpandedGroupId(
                    expandedGroupId === group.id ? null : group.id
                  )
                }
                onComplete={handleExerciseComplete}
              />
            ))}
          </div>
        </div>

        {/* Complete Button */}
        <div className="mt-8 pb-8">
          <Button
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-6 text-lg glow"
            disabled={progress < 100}
            onClick={async () => {
              if (progress === 100 && id) {
                // Stop timer and save duration
                setIsTimerRunning(false);
                
                const { error } = await supabase
                  .from("user_workouts")
                  .update({
                    completed: true,
                    completed_at: new Date().toISOString(),
                    duration_seconds: elapsedSeconds,
                  })
                  .eq("id", id);

                if (error) {
                  toast.error("Failed to save workout");
                } else {
                  toast.success(`Workout completed in ${formatTime(elapsedSeconds)}!`);
                  queryClient.invalidateQueries({ queryKey: ["next-workout"] });
                  navigate("/");
                }
              }
            }}
          >
            {progress < 100 ? `Complete All Exercises (${progress}%)` : "Finish Workout"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Workout;
