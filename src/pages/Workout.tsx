import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, Flame, Target } from "lucide-react";
import { useState } from "react";
import ExerciseDetailCard from "@/components/ExerciseDetailCard";

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
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set());
  const [expandedExerciseId, setExpandedExerciseId] = useState<string | null>(null);

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

  const handleExerciseComplete = (exerciseId: string, isComplete: boolean) => {
    setCompletedExercises((prev) => {
      const next = new Set(prev);
      if (isComplete) {
        next.add(exerciseId);
      } else {
        next.delete(exerciseId);
      }
      return next;
    });
  };

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

      {/* Workout Info */}
      <div className="container mx-auto px-4 py-6">
        <div className="card-gradient rounded-xl border border-border p-4 mb-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span className="text-sm">{workout.workout_template?.duration || "45 min"}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Flame className="w-4 h-4 text-primary" />
                <span className="text-sm">{workout.workout_template?.calories || "350 cal"}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Target className="w-4 h-4 text-primary" />
                <span className="text-sm">{workout.workout_template?.focus}</span>
              </div>
            </div>
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
            {workout.exercises?.map((exercise, index) => {
              // Generate letter labels like A, B1, B2, C1, C2, etc.
              const letterIndex = Math.floor(index / 2);
              const letter = String.fromCharCode(65 + letterIndex);
              const subIndex = index % 2 === 0 ? 1 : 2;
              const label = index < 2 ? letter : `${letter}${subIndex}`;
              
              const lastWorkout = workout.lastWorkoutByExercise?.[exercise.id] || null;
              
              return (
                <ExerciseDetailCard
                  key={exercise.id}
                  id={exercise.id}
                  name={exercise.name}
                  sets={exercise.sets}
                  reps={exercise.reps}
                  weight={exercise.weight}
                  notes={exercise.notes}
                  videoUrl={exercise.video_url}
                  restSeconds={exercise.rest_seconds}
                  label={label}
                  isExpanded={expandedExerciseId === exercise.id}
                  lastWorkout={lastWorkout ? {
                    sets: lastWorkout.sets,
                    reps: lastWorkout.reps,
                    weight: lastWorkout.weight
                  } : null}
                  onToggleExpand={() => 
                    setExpandedExerciseId(
                      expandedExerciseId === exercise.id ? null : exercise.id
                    )
                  }
                  onComplete={(isComplete) => handleExerciseComplete(exercise.id, isComplete)}
                />
              );
            })}
          </div>
        </div>

        {/* Complete Button */}
        <div className="mt-8 pb-8">
          <Button
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-6 text-lg glow"
            disabled={progress < 100}
          >
            {progress < 100 ? `Complete All Exercises (${progress}%)` : "Finish Workout"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Workout;
