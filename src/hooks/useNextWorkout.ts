import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  weight: string | null;
  notes: string | null;
  order_index: number;
}

export interface WorkoutWithExercises {
  id: string;
  scheduled_date: string;
  completed: boolean;
  workout_template: {
    id: string;
    title: string;
    subtitle: string | null;
    duration: string | null;
    calories: string | null;
    focus: string | null;
  };
  exercises: Exercise[];
}

export const useNextWorkout = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["nextWorkout", user?.id],
    queryFn: async (): Promise<WorkoutWithExercises | null> => {
      if (!user) return null;

      // Get the oldest uncompleted workout (next workout to do)
      const { data: userWorkout, error: workoutError } = await supabase
        .from("user_workouts")
        .select(`
          id,
          scheduled_date,
          completed,
          workout_template_id
        `)
        .eq("user_id", user.id)
        .eq("completed", false)
        .order("scheduled_date", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (workoutError) throw workoutError;
      if (!userWorkout) return null;

      // Get the workout template
      const { data: template, error: templateError } = await supabase
        .from("workout_templates")
        .select("*")
        .eq("id", userWorkout.workout_template_id)
        .single();

      if (templateError) throw templateError;

      // Get exercises for this workout
      const { data: exercises, error: exercisesError } = await supabase
        .from("exercises")
        .select("*")
        .eq("workout_template_id", userWorkout.workout_template_id)
        .order("order_index", { ascending: true });

      if (exercisesError) throw exercisesError;

      return {
        id: userWorkout.id,
        scheduled_date: userWorkout.scheduled_date,
        completed: userWorkout.completed,
        workout_template: template,
        exercises: exercises || [],
      };
    },
    enabled: !!user,
  });
};

export const useUpcomingWorkouts = (limit = 3) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["upcomingWorkouts", user?.id, limit],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("user_workouts")
        .select(`
          id,
          scheduled_date,
          completed,
          workout_templates (
            id,
            title,
            focus
          )
        `)
        .eq("user_id", user.id)
        .eq("completed", false)
        .order("scheduled_date", { ascending: true })
        .limit(limit + 1); // +1 to skip the first (current) workout

      if (error) throw error;
      
      // Skip the first one as it's the current workout
      return data?.slice(1) || [];
    },
    enabled: !!user,
  });
};

export const useCompleteWorkout = () => {
  const { user } = useAuth();

  const completeWorkout = async (workoutId: string) => {
    if (!user) throw new Error("Not authenticated");

    const { error } = await supabase
      .from("user_workouts")
      .update({ completed: true, completed_at: new Date().toISOString() })
      .eq("id", workoutId)
      .eq("user_id", user.id);

    if (error) throw error;
  };

  return { completeWorkout };
};
