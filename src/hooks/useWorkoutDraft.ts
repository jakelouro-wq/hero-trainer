import { useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CompletedSetData } from "@/components/ExerciseGroupCard";
import { useQueryClient } from "@tanstack/react-query";

interface DraftData {
  exerciseWeights: Record<string, CompletedSetData[]>;
  swappedExercises: Record<string, string>;
  completedExercises: string[];
  startedAt: number | null;
  totalPausedMs: number;
}

// Debounce interval for saving to database (save every 3 seconds max)
const SAVE_DEBOUNCE_MS = 3000;

export const useWorkoutDraft = (workoutId: string | undefined) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingDataRef = useRef<DraftData | null>(null);
  const lastSavedRef = useRef<string>("");

  // Save draft to database (debounced)
  const saveDraftToDb = useCallback(async (data: DraftData) => {
    if (!user || !workoutId) return;

    // Don't save if data hasn't changed
    const dataStr = JSON.stringify(data);
    if (dataStr === lastSavedRef.current) return;

    try {
      // First try to update, if no rows affected then insert
      const { error: updateError, count } = await supabase
        .from("workout_drafts")
        .update({
          exercise_data: {
            exerciseWeights: data.exerciseWeights,
            swappedExercises: data.swappedExercises,
            completedExercises: data.completedExercises,
          } as any,
          started_at: data.startedAt ? new Date(data.startedAt).toISOString() : null,
          total_paused_ms: data.totalPausedMs,
        })
        .eq("user_id", user.id)
        .eq("user_workout_id", workoutId);

      // If update didn't affect any rows, insert new record
      if (!updateError && count === 0) {
        const { error: insertError } = await supabase
          .from("workout_drafts")
          .insert({
            user_id: user.id,
            user_workout_id: workoutId,
            exercise_data: {
              exerciseWeights: data.exerciseWeights,
              swappedExercises: data.swappedExercises,
              completedExercises: data.completedExercises,
            } as any,
            started_at: data.startedAt ? new Date(data.startedAt).toISOString() : null,
            total_paused_ms: data.totalPausedMs,
          });
        
        if (!insertError) {
          lastSavedRef.current = dataStr;
          console.log("[WorkoutDraft] Inserted to database");
        } else {
          console.error("[WorkoutDraft] Failed to insert:", insertError);
        }
      } else if (!updateError) {
        lastSavedRef.current = dataStr;
        console.log("[WorkoutDraft] Updated in database");
      } else {
        console.error("[WorkoutDraft] Failed to update:", updateError);
      }
    } catch (err) {
      console.error("[WorkoutDraft] Error saving:", err);
    }
  }, [user, workoutId]);

  // Queue a save (debounced)
  const queueSave = useCallback((data: DraftData) => {
    pendingDataRef.current = data;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Schedule new save
    saveTimeoutRef.current = setTimeout(() => {
      if (pendingDataRef.current) {
        saveDraftToDb(pendingDataRef.current);
      }
    }, SAVE_DEBOUNCE_MS);
  }, [saveDraftToDb]);

  // Flush pending saves immediately (for beforeunload, visibility change)
  const flushSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    if (pendingDataRef.current) {
      saveDraftToDb(pendingDataRef.current);
    }
  }, [saveDraftToDb]);

  // Load draft from database
  const loadDraft = useCallback(async (): Promise<DraftData | null> => {
    if (!user || !workoutId) return null;

    try {
      const { data, error } = await supabase
        .from("workout_drafts")
        .select("*")
        .eq("user_id", user.id)
        .eq("user_workout_id", workoutId)
        .maybeSingle();

      if (error || !data) return null;

      const exerciseData = data.exercise_data as any;
      return {
        exerciseWeights: exerciseData?.exerciseWeights || {},
        swappedExercises: exerciseData?.swappedExercises || {},
        completedExercises: exerciseData?.completedExercises || [],
        startedAt: data.started_at ? new Date(data.started_at).getTime() : null,
        totalPausedMs: data.total_paused_ms || 0,
      };
    } catch (err) {
      console.error("[WorkoutDraft] Error loading:", err);
      return null;
    }
  }, [user, workoutId]);

  // Delete draft after workout completion
  const deleteDraft = useCallback(async () => {
    if (!user || !workoutId) return;

    try {
      await supabase
        .from("workout_drafts")
        .delete()
        .eq("user_id", user.id)
        .eq("user_workout_id", workoutId);
      
      // Invalidate any in-progress workout queries
      queryClient.invalidateQueries({ queryKey: ["workout-drafts"] });
      console.log("[WorkoutDraft] Deleted draft");
    } catch (err) {
      console.error("[WorkoutDraft] Error deleting:", err);
    }
  }, [user, workoutId, queryClient]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      // Flush any pending save
      if (pendingDataRef.current) {
        saveDraftToDb(pendingDataRef.current);
      }
    };
  }, [saveDraftToDb]);

  return {
    queueSave,
    flushSave,
    loadDraft,
    deleteDraft,
  };
};
