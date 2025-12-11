import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const useCoachAccess = () => {
  const { user } = useAuth();

  const { data: isCoach, isLoading } = useQuery({
    queryKey: ["coach-access", user?.id],
    queryFn: async () => {
      if (!user) return false;

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["coach", "admin"]);

      if (error) {
        console.error("Error checking coach access:", error);
        return false;
      }

      return data && data.length > 0;
    },
    enabled: !!user,
  });

  return { isCoach: isCoach ?? false, isLoading };
};
