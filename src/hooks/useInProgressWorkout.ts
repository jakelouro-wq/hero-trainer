import { useState, useEffect } from "react";

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
}

export const useInProgressWorkout = () => {
  const [inProgressWorkout, setInProgressWorkout] = useState<InProgressWorkout | null>(null);

  useEffect(() => {
    // Scan localStorage for any in-progress workout sessions
    const findInProgressWorkout = () => {
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
                setInProgressWorkout({ workoutId, session });
                return;
              }
            }
          } catch (e) {
            // Invalid session data, skip
          }
        }
      }
      setInProgressWorkout(null);
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
  }, []);

  const clearSession = (workoutId: string) => {
    localStorage.removeItem(`${WORKOUT_SESSION_PREFIX}${workoutId}`);
    setInProgressWorkout(null);
  };

  return { inProgressWorkout, clearSession };
};
