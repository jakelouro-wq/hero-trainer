import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";

export const useUserStats = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-stats", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString();
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 }).toISOString();
      const monthStart = startOfMonth(now).toISOString();
      const monthEnd = endOfMonth(now).toISOString();

      // Get exercise logs this week for weight lifted
      const { data: weeklyLogs } = await supabase
        .from("exercise_logs")
        .select("weight, reps, exercise_id, completed_at")
        .eq("user_id", user.id)
        .gte("completed_at", weekStart)
        .lte("completed_at", weekEnd);

      let totalWeightLiftedWeek = 0;
      if (weeklyLogs) {
        weeklyLogs.forEach((log) => {
          if (log.weight) {
            const weight = parseFloat(log.weight) || 0;
            const reps = parseInt(log.reps) || 0;
            totalWeightLiftedWeek += weight * reps;
          }
        });
      }

      // Get workouts completed this week
      const { count: workoutsThisWeek } = await supabase
        .from("user_workouts")
        .select("id", { count: "exact" })
        .eq("user_id", user.id)
        .eq("completed", true)
        .gte("completed_at", weekStart)
        .lte("completed_at", weekEnd);

      // Calculate new records this week
      // Get ALL exercise logs to determine PRs
      const { data: allLogs } = await supabase
        .from("exercise_logs")
        .select("exercise_id, weight, completed_at")
        .eq("user_id", user.id)
        .order("completed_at", { ascending: true });

      let newRecordsThisWeek = 0;
      if (allLogs) {
        // Track max weight per exercise as we iterate chronologically
        const maxWeightByExercise = new Map<string, number>();
        
        allLogs.forEach((log) => {
          const weight = parseFloat(log.weight || "0") || 0;
          const currentMax = maxWeightByExercise.get(log.exercise_id) || 0;
          
          if (weight > currentMax) {
            maxWeightByExercise.set(log.exercise_id, weight);
            // Check if this PR was set this week
            const logDate = new Date(log.completed_at);
            const weekStartDate = new Date(weekStart);
            const weekEndDate = new Date(weekEnd);
            if (logDate >= weekStartDate && logDate <= weekEndDate && weight > 0) {
              newRecordsThisWeek++;
            }
          }
        });
      }

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

        const { count: totalScheduled } = await supabase
          .from("user_workouts")
          .select("id", { count: "exact" })
          .eq("user_id", user.id)
          .gte("scheduled_date", clientProgram.start_date);

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
        totalWeightLiftedWeek: Math.round(totalWeightLiftedWeek),
        workoutsThisWeek: workoutsThisWeek || 0,
        newRecordsThisWeek,
        programProgress,
        programName,
      };
    },
    enabled: !!user?.id,
  });
};
