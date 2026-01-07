import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const WORKOUT_SESSION_PREFIX = "workout_session_";

interface SessionState {
  startedAt: number | null;
  isPaused: boolean;
  pausedAt: number | null;
  totalPausedMs: number;
  completedExercises: string[];
  exerciseWeights: Record<string, any[]>;
  swappedExercises: Record<string, string>;
}

interface InProgressWorkout {
  workoutId: string;
  session: SessionState;
  source: "localStorage" | "database";
}

export const useInProgressWorkout = () => {
  const { user } = useAuth();
  const [inProgressWorkout, setInProgressWorkout] = useState<InProgressWorkout | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Scan localStorage for any in-progress workout sessions
    const findInProgressWorkout = async () => {
      setIsLoading(true);
      
      // First check localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(WORKOUT_SESSION_PREFIX)) {
          try {
            const stored = localStorage.getItem(key);
            if (stored) {
              const session: SessionState = JSON.parse(stored);
              // A workout is "in progress" if it has been started (has startedAt)
              // and has any data (exerciseWeights with at least one entry OR completedExercises)
              const hasData = 
                session.startedAt !== null || 
                Object.keys(session.exerciseWeights || {}).length > 0 ||
                (session.completedExercises || []).length > 0;
              
              if (hasData) {
                const workoutId = key.replace(WORKOUT_SESSION_PREFIX, "");
                setInProgressWorkout({ workoutId, session, source: "localStorage" });
                setIsLoading(false);
                return;
              }
            }
          } catch (e) {
            // Invalid session data, skip
          }
        }
      }
      
      // If no localStorage session found, check database for any drafts
      if (user) {
        try {
          const { data: drafts } = await supabase
            .from("workout_drafts")
            .select("*, user_workouts!inner(id, completed)")
            .eq("user_id", user.id)
            .eq("user_workouts.completed", false)
            .order("updated_at", { ascending: false })
            .limit(1);
          
          if (drafts && drafts.length > 0) {
            const draft = drafts[0];
            const exerciseData = draft.exercise_data as any;
            const hasData = 
              draft.started_at !== null ||
              Object.keys(exerciseData?.exerciseWeights || {}).length > 0 ||
              (exerciseData?.completedExercises || []).length > 0;
            
            if (hasData) {
              const session: SessionState = {
                startedAt: draft.started_at ? new Date(draft.started_at).getTime() : null,
                isPaused: false,
                pausedAt: null,
                totalPausedMs: draft.total_paused_ms || 0,
                completedExercises: exerciseData?.completedExercises || [],
                exerciseWeights: exerciseData?.exerciseWeights || {},
                swappedExercises: exerciseData?.swappedExercises || {},
              };
              setInProgressWorkout({ 
                workoutId: draft.user_workout_id, 
                session,
                source: "database"
              });
              setIsLoading(false);
              return;
            }
          }
        } catch (e) {
          console.error("Error checking database for drafts:", e);
        }
      }
      
      setInProgressWorkout(null);
      setIsLoading(false);
    };

    findInProgressWorkout();

    // Listen for storage changes from other tabs
    const handleStorage = (e: StorageEvent) => {
      if (e.key?.startsWith(WORKOUT_SESSION_PREFIX)) {
        findInProgressWorkout();
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [user]);

  const clearSession = async (workoutId: string) => {
    // Clear from localStorage
    localStorage.removeItem(`${WORKOUT_SESSION_PREFIX}${workoutId}`);
    
    // Clear from database
    if (user) {
      try {
        await supabase
          .from("workout_drafts")
          .delete()
          .eq("user_id", user.id)
          .eq("user_workout_id", workoutId);
      } catch (e) {
        console.error("Error deleting draft from database:", e);
      }
    }
    
    setInProgressWorkout(null);
  };

  return { inProgressWorkout, clearSession, isLoading };
};
