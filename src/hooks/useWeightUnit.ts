import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type WeightUnit = "lb" | "kg";

export const useWeightUnit = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: weightUnit = "lb", isLoading } = useQuery({
    queryKey: ["weight-unit", user?.id],
    queryFn: async () => {
      if (!user?.id) return "lb";
      
      const { data, error } = await supabase
        .from("profiles")
        .select("weight_unit")
        .eq("id", user.id)
        .single();
      
      if (error) {
        console.error("Error fetching weight unit:", error);
        return "lb";
      }
      
      return (data?.weight_unit as WeightUnit) || "lb";
    },
    enabled: !!user?.id,
  });

  const updateWeightUnit = useMutation({
    mutationFn: async (newUnit: WeightUnit) => {
      if (!user?.id) throw new Error("No user");
      
      const { error } = await supabase
        .from("profiles")
        .update({ weight_unit: newUnit })
        .eq("id", user.id);
      
      if (error) throw error;
      return newUnit;
    },
    onSuccess: (newUnit) => {
      queryClient.setQueryData(["weight-unit", user?.id], newUnit);
    },
  });

  return {
    weightUnit: weightUnit as WeightUnit,
    isLoading,
    setWeightUnit: updateWeightUnit.mutate,
    isUpdating: updateWeightUnit.isPending,
  };
};
