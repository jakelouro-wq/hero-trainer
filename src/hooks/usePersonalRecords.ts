import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useMemo } from "react";

export interface PersonalRecord {
  exerciseId: string;
  exerciseName: string;
  maxWeight: number;
  maxReps: number;
  prDate: string;
  totalSets: number;
}

export const usePersonalRecords = () => {
  const { user } = useAuth();

  const { data: exerciseLogs, isLoading } = useQuery({
    queryKey: ["personal-records", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("exercise_logs")
        .select("*, exercises(id, name)")
        .eq("user_id", user.id)
        .order("completed_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const personalRecords = useMemo(() => {
    if (!exerciseLogs) return [];

    const prMap = new Map<string, PersonalRecord>();

    exerciseLogs.forEach((log) => {
      const exerciseId = log.exercises?.id || log.exercise_id;
      const exerciseName = log.exercises?.name || "Unknown Exercise";
      const weight = parseFloat(log.weight || "0") || 0;
      const reps = parseInt(log.reps || "0") || 0;

      const existing = prMap.get(exerciseId);
      if (!existing) {
        prMap.set(exerciseId, {
          exerciseId,
          exerciseName,
          maxWeight: weight,
          maxReps: reps,
          prDate: log.completed_at,
          totalSets: 1,
        });
      } else {
        existing.totalSets += 1;
        // Update PR if this weight is higher
        if (weight > existing.maxWeight) {
          existing.maxWeight = weight;
          existing.prDate = log.completed_at;
        }
        // Track max reps at any weight
        if (reps > existing.maxReps) {
          existing.maxReps = reps;
        }
      }
    });

    return Array.from(prMap.values()).sort((a, b) => 
      a.exerciseName.localeCompare(b.exerciseName)
    );
  }, [exerciseLogs]);

  // Get PR for a specific exercise
  const getPRForExercise = (exerciseId: string): PersonalRecord | null => {
    return personalRecords.find(pr => pr.exerciseId === exerciseId) || null;
  };

  // Check if a given weight/reps is a new PR
  const isNewPR = (exerciseId: string, weight: number, reps: number): { isWeightPR: boolean; isRepsPR: boolean } => {
    const currentPR = getPRForExercise(exerciseId);
    
    if (!currentPR) {
      // No previous record, so any completed set is a PR
      return { isWeightPR: weight > 0, isRepsPR: reps > 0 };
    }

    return {
      isWeightPR: weight > currentPR.maxWeight,
      isRepsPR: reps > currentPR.maxReps,
    };
  };

  return {
    personalRecords,
    isLoading,
    getPRForExercise,
    isNewPR,
  };
};
