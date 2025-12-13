import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const useAdminAccess = () => {
  const { user } = useAuth();

  const { data: isAdmin, isLoading } = useQuery({
    queryKey: ["admin-access", user?.id],
    queryFn: async () => {
      if (!user) return false;

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin");

      if (error) {
        console.error("Error checking admin access:", error);
        return false;
      }

      return data && data.length > 0;
    },
    enabled: !!user,
  });

  return { isAdmin: isAdmin ?? false, isLoading };
};
