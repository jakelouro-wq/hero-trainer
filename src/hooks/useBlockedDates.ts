import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface BlockedDate {
  id: string;
  coach_id: string;
  blocked_date: string | null;
  blocked_day_of_week: number | null;
  client_id: string | null;
  reason: string | null;
  created_at: string;
}

export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export const useBlockedDates = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["blocked-dates", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blocked_dates")
        .select("*")
        .order("blocked_day_of_week", { ascending: true, nullsFirst: false })
        .order("blocked_date", { ascending: true });

      if (error) throw error;
      return data as BlockedDate[];
    },
    enabled: !!user,
  });
};

export const useAddBlockedDate = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (blocked: {
      blocked_date?: string;
      blocked_day_of_week?: number;
      client_id?: string;
      reason?: string;
    }) => {
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("blocked_dates")
        .insert({
          coach_id: user.id,
          blocked_date: blocked.blocked_date || null,
          blocked_day_of_week: blocked.blocked_day_of_week ?? null,
          client_id: blocked.client_id || null,
          reason: blocked.reason || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blocked-dates"] });
    },
  });
};

export const useDeleteBlockedDate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("blocked_dates")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blocked-dates"] });
    },
  });
};

// Helper to check if a date is blocked
export const isDateBlocked = (
  date: Date,
  blockedDates: BlockedDate[],
  clientId?: string
): boolean => {
  const dateStr = date.toISOString().split("T")[0];
  const dayOfWeek = date.getDay();

  return blockedDates.some((blocked) => {
    // Check if applies to this client (null means all clients)
    if (blocked.client_id && blocked.client_id !== clientId) {
      return false;
    }

    // Check specific date
    if (blocked.blocked_date === dateStr) {
      return true;
    }

    // Check recurring day of week
    if (blocked.blocked_day_of_week === dayOfWeek) {
      return true;
    }

    return false;
  });
};
