import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface ManualActivity {
  id: string;
  user_id: string;
  activity_type: string;
  activity_date: string;
  duration_minutes: number | null;
  notes: string | null;
  created_at: string;
}

export const ACTIVITY_TYPES = [
  { value: "tennis", label: "Tennis", icon: "🎾" },
  { value: "cardio", label: "Cardio", icon: "❤️" },
  { value: "intervals", label: "Intervals", icon: "⚡" },
  { value: "golf", label: "Golf", icon: "⛳" },
  { value: "walk", label: "Walk", icon: "🚶" },
  { value: "hike", label: "Hike", icon: "🥾" },
  { value: "run", label: "Run", icon: "🏃" },
  { value: "bike", label: "Bike", icon: "🚴" },
  { value: "swim", label: "Swim", icon: "🏊" },
  { value: "yoga", label: "Yoga", icon: "🧘" },
  { value: "basketball", label: "Basketball", icon: "🏀" },
  { value: "soccer", label: "Soccer", icon: "⚽" },
  { value: "other", label: "Other", icon: "💪" },
];

export const useManualActivities = (date?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["manual-activities", user?.id, date],
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from("manual_activities")
        .select("*")
        .eq("user_id", user.id)
        .order("activity_date", { ascending: false });

      if (date) {
        query = query.eq("activity_date", date);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as ManualActivity[];
    },
    enabled: !!user,
  });
};

export const useAddManualActivity = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (activity: {
      activity_type: string;
      activity_date: string;
      duration_minutes?: number;
      notes?: string;
    }) => {
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("manual_activities")
        .insert({
          user_id: user.id,
          activity_type: activity.activity_type,
          activity_date: activity.activity_date,
          duration_minutes: activity.duration_minutes || null,
          notes: activity.notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manual-activities"] });
    },
  });
};

export const useDeleteManualActivity = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (activityId: string) => {
      const { error } = await supabase
        .from("manual_activities")
        .delete()
        .eq("id", activityId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manual-activities"] });
    },
  });
};
