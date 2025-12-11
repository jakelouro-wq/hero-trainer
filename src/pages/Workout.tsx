import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, Flame, Target, CheckCircle2, Circle } from "lucide-react";
import { useState } from "react";

interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  weight: string | null;
  notes: string | null;
  order_index: number;
}

const Workout = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set());

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

      return {
        ...userWorkout,
        workout_template: userWorkout.workout_templates,
        exercises: exercises as Exercise[],
      };
    },
    enabled: !!user && !!id,
  });

  const toggleExercise = (exerciseId: string) => {
    setCompletedExercises((prev) => {
      const next = new Set(prev);
      if (next.has(exerciseId)) {
        next.delete(exerciseId);
      } else {
        next.add(exerciseId);
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
          
          <div className="space-y-1">
            {workout.exercises?.map((exercise, index) => {
              const isCompleted = completedExercises.has(exercise.id);
              // Generate letter labels like A, B1, B2, C1, C2, etc.
              const letterIndex = Math.floor(index / 2);
              const letter = String.fromCharCode(65 + letterIndex);
              const subIndex = index % 2 === 0 ? 1 : 2;
              const label = index < 2 ? letter : `${letter}${subIndex}`;
              
              return (
                <div
                  key={exercise.id}
                  className="py-4 border-b border-border/50 last:border-b-0 cursor-pointer transition-opacity duration-200"
                  onClick={() => toggleExercise(exercise.id)}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-start gap-4">
                    {/* Letter Label Circle */}
                    <div 
                      className={`w-10 h-10 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        isCompleted 
                          ? "border-primary bg-primary/20" 
                          : "border-muted-foreground/50"
                      }`}
                    >
                      <span className={`text-sm font-semibold ${isCompleted ? "text-primary" : "text-muted-foreground"}`}>
                        {label}
                      </span>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3
                        className={`font-bold text-base ${
                          isCompleted ? "text-muted-foreground line-through" : "text-foreground"
                        }`}
                      >
                        {exercise.name}
                      </h3>
                      
                      {/* Sets x Reps in primary color */}
                      <p className="text-primary font-medium text-sm mt-1">
                        {exercise.sets} x {exercise.reps}
                        {exercise.weight && ` @ ${exercise.weight}`}
                      </p>
                      
                      {exercise.notes && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {exercise.notes}
                        </p>
                      )}
                    </div>
                    
                    {/* Completion indicator */}
                    <div className="flex-shrink-0">
                      {isCompleted ? (
                        <CheckCircle2 className="w-6 h-6 text-primary" />
                      ) : (
                        <Circle className="w-6 h-6 text-muted-foreground/50" />
                      )}
                    </div>
                  </div>
                </div>
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
