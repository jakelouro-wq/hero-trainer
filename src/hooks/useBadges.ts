import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon_url: string;
  category: string;
  threshold: number;
}

export interface UserBadge {
  id: string;
  badge_id: string;
  earned_at: string;
  badges: Badge;
}

export const useBadges = () => {
  return useQuery({
    queryKey: ["badges"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("badges")
        .select("*")
        .order("category")
        .order("threshold");

      if (error) throw error;
      return data as Badge[];
    },
  });
};

export const useUserBadges = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-badges", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("user_badges")
        .select(`
          id,
          badge_id,
          earned_at,
          badges (*)
        `)
        .eq("user_id", user.id)
        .order("earned_at", { ascending: false });

      if (error) throw error;
      return data as UserBadge[];
    },
    enabled: !!user?.id,
  });
};

export const useCheckAndAwardBadges = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (stats: {
      totalWeightLifted: number;
      totalWorkouts: number;
      currentStreak: number;
    }) => {
      if (!user?.id) return [];

      // Get all badges
      const { data: allBadges } = await supabase
        .from("badges")
        .select("*");

      // Get user's existing badges
      const { data: existingBadges } = await supabase
        .from("user_badges")
        .select("badge_id")
        .eq("user_id", user.id);

      const existingBadgeIds = new Set(existingBadges?.map(b => b.badge_id) || []);
      const newBadges: string[] = [];

      for (const badge of allBadges || []) {
        if (existingBadgeIds.has(badge.id)) continue;

        let earned = false;
        switch (badge.category) {
          case "weight":
            earned = stats.totalWeightLifted >= badge.threshold;
            break;
          case "workouts":
            earned = stats.totalWorkouts >= badge.threshold;
            break;
          case "streak":
            earned = stats.currentStreak >= badge.threshold;
            break;
        }

        if (earned) {
          const { error } = await supabase
            .from("user_badges")
            .insert({ user_id: user.id, badge_id: badge.id });

          if (!error) {
            newBadges.push(badge.id);
          }
        }
      }

      return newBadges;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-badges"] });
    },
  });
};

export const useUserStats = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-full-stats", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Total weight lifted all time
      const { data: exerciseLogs } = await supabase
        .from("exercise_logs")
        .select("weight, reps")
        .eq("user_id", user.id);

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

      // Total workouts completed
      const { count: totalWorkouts } = await supabase
        .from("user_workouts")
        .select("id", { count: "exact" })
        .eq("user_id", user.id)
        .eq("completed", true);

      // Calculate streak (consecutive weeks with 3+ workouts)
      const { data: completedWorkouts } = await supabase
        .from("user_workouts")
        .select("completed_at")
        .eq("user_id", user.id)
        .eq("completed", true)
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false });

      let currentStreak = 0;
      if (completedWorkouts && completedWorkouts.length > 0) {
        // Group workouts by week (ISO week number)
        const getWeekKey = (date: Date) => {
          const d = new Date(date);
          d.setHours(0, 0, 0, 0);
          d.setDate(d.getDate() + 4 - (d.getDay() || 7));
          const yearStart = new Date(d.getFullYear(), 0, 1);
          const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
          return `${d.getFullYear()}-W${weekNum}`;
        };

        const workoutsByWeek = new Map<string, number>();
        completedWorkouts.forEach((w) => {
          const weekKey = getWeekKey(new Date(w.completed_at!));
          workoutsByWeek.set(weekKey, (workoutsByWeek.get(weekKey) || 0) + 1);
        });

        // Check consecutive weeks with 3+ workouts starting from current week
        const today = new Date();
        let checkDate = new Date(today);
        
        while (true) {
          const weekKey = getWeekKey(checkDate);
          const workoutsInWeek = workoutsByWeek.get(weekKey) || 0;
          
          if (workoutsInWeek >= 3) {
            currentStreak++;
            checkDate.setDate(checkDate.getDate() - 7);
          } else {
            break;
          }
        }
      }

      return {
        totalWeightLifted: Math.round(totalWeightLifted),
        totalWorkouts: totalWorkouts || 0,
        currentStreak,
      };
    },
    enabled: !!user?.id,
  });
};
