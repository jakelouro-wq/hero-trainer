import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { startOfMonth, endOfMonth } from "date-fns";

export const useUserStats = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-stats", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const now = new Date();
      const monthStart = startOfMonth(now).toISOString();
      const monthEnd = endOfMonth(now).toISOString();

      // Get total weight lifted this month
      const { data: exerciseLogs } = await supabase
        .from("exercise_logs")
        .select("weight, reps")
        .eq("user_id", user.id)
        .gte("completed_at", monthStart)
        .lte("completed_at", monthEnd);

      let totalWeightLifted = 0;
      if (exerciseLogs) {
        exerciseLogs.forEach((log) => {
          if (log.weight) {
            const weight = parseFloat(log.weight) || 0;
            const reps = parseInt(log.reps) || 0;
            totalWeightLifted += weight * reps;
          }
        });
      }

      // Get workouts completed this month
      const { data: completedWorkouts, count: workoutsThisMonth } = await supabase
        .from("user_workouts")
        .select("id", { count: "exact" })
        .eq("user_id", user.id)
        .eq("completed", true)
        .gte("completed_at", monthStart)
        .lte("completed_at", monthEnd);

      // Get current program progress
      const { data: clientProgram } = await supabase
        .from("client_programs")
        .select(`
          id,
          program_id,
          start_date,
          programs (
            id,
            name,
            duration_weeks,
            days_per_week
          )
        `)
        .eq("user_id", user.id)
        .order("start_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      let programProgress = 0;
      let programName = null;

      if (clientProgram?.programs) {
        const program = clientProgram.programs;
        programName = program.name;

        // Get total workouts scheduled for this program
        const { count: totalScheduled } = await supabase
          .from("user_workouts")
          .select("id", { count: "exact" })
          .eq("user_id", user.id)
          .gte("scheduled_date", clientProgram.start_date);

        // Get completed workouts for this program
        const { count: completedInProgram } = await supabase
          .from("user_workouts")
          .select("id", { count: "exact" })
          .eq("user_id", user.id)
          .eq("completed", true)
          .gte("scheduled_date", clientProgram.start_date);

        if (totalScheduled && totalScheduled > 0) {
          programProgress = Math.round(((completedInProgram || 0) / totalScheduled) * 100);
        }
      }

      return {
        totalWeightLifted: Math.round(totalWeightLifted),
        workoutsThisMonth: workoutsThisMonth || 0,
        programProgress,
        programName,
      };
    },
    enabled: !!user?.id,
  });
};
