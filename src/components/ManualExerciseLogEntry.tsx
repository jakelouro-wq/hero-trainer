import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Minus, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface Exercise {
  id: string;
  name: string;
}

type ExistingExerciseLog = {
  exercise_id: string;
  set_number: number;
  reps: string;
  weight: string | null;
  completed_at?: string;
  swapped_exercise_name?: string | null;
};

interface ManualExerciseLogEntryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workoutId: string;
  userId: string;
  exercises: Exercise[];
  existingLogs?: ExistingExerciseLog[];
  mode?: "add_missing" | "edit";
  completedAt?: string | null;
  swappedExerciseNames?: Record<string, string>;
}

interface SetEntry {
  reps: string;
  weight: string;
}

interface ExerciseEntry {
  exerciseId: string;
  exerciseName: string;
  sets: SetEntry[];
}

const buildEntries = (exercises: Exercise[], existingLogs?: ExistingExerciseLog[]): ExerciseEntry[] => {
  const grouped: Record<string, ExistingExerciseLog[]> = {};
  (existingLogs || []).forEach((log) => {
    if (!grouped[log.exercise_id]) grouped[log.exercise_id] = [];
    grouped[log.exercise_id].push(log);
  });

  return exercises.map((ex) => {
    const logs = (grouped[ex.id] || []).slice().sort((a, b) => a.set_number - b.set_number);
    const sets: SetEntry[] =
      logs.length > 0
        ? logs.map((l) => ({
            reps: l.reps ?? "",
            weight: l.weight ?? "",
          }))
        : [{ reps: "", weight: "" }];

    return {
      exerciseId: ex.id,
      exerciseName: ex.name,
      sets,
    };
  });
};

const ManualExerciseLogEntry = ({
  open,
  onOpenChange,
  workoutId,
  userId,
  exercises,
  existingLogs,
  mode = "add_missing",
  completedAt,
  swappedExerciseNames,
}: ManualExerciseLogEntryProps) => {
  const queryClient = useQueryClient();

  const exercisesKey = useMemo(
    () => exercises.map((e) => `${e.id}:${e.name}`).join("|"),
    [exercises]
  );

  const logsKey = useMemo(
    () =>
      (existingLogs || [])
        .map((l) => `${l.exercise_id}:${l.set_number}:${l.reps}:${l.weight ?? ""}`)
        .join("|"),
    [existingLogs]
  );

  const [entries, setEntries] = useState<ExerciseEntry[]>(() => buildEntries(exercises, existingLogs));
  const [isSaving, setIsSaving] = useState(false);

  // Ensure the modal always opens with fresh data (especially important for editing completed workouts)
  useEffect(() => {
    if (!open) return;
    setEntries(buildEntries(exercises, existingLogs));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, exercisesKey, logsKey]);

  const addSet = (exerciseIndex: number) => {
    setEntries((prev) => {
      const updated = [...prev];
      updated[exerciseIndex].sets.push({ reps: "", weight: "" });
      return updated;
    });
  };

  const removeSet = (exerciseIndex: number) => {
    setEntries((prev) => {
      const updated = [...prev];
      if (updated[exerciseIndex].sets.length > 1) {
        updated[exerciseIndex].sets.pop();
      }
      return updated;
    });
  };

  const updateSet = (
    exerciseIndex: number,
    setIndex: number,
    field: "reps" | "weight",
    value: string
  ) => {
    setEntries((prev) => {
      const updated = [...prev];
      updated[exerciseIndex].sets[setIndex][field] = value;
      return updated;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);

    const completedAtToUse =
      completedAt ?? existingLogs?.[0]?.completed_at ?? new Date().toISOString();

    const logsToInsert = entries.flatMap((entry) =>
      entry.sets
        .filter((set) => set.reps.trim() !== "" || set.weight.trim() !== "")
        .map((set, index) => ({
          user_id: userId,
          user_workout_id: workoutId,
          exercise_id: entry.exerciseId,
          set_number: index + 1,
          reps: set.reps || "0",
          weight: set.weight || null,
          completed_at: completedAtToUse,
          swapped_exercise_name: swappedExerciseNames?.[entry.exerciseId] || null,
        }))
    );

    if (logsToInsert.length === 0) {
      toast.error("Please enter at least one set with data");
      setIsSaving(false);
      return;
    }

    // For editing: replace existing logs for this workout (best-effort restore on failure)
    if (mode === "edit") {
      const { error: deleteError } = await supabase
        .from("exercise_logs")
        .delete()
        .eq("user_id", userId)
        .eq("user_workout_id", workoutId);

      if (deleteError) {
        console.error("Failed to delete existing exercise logs:", deleteError);
        toast.error("Failed to update exercise data");
        setIsSaving(false);
        return;
      }
    }

    const { error: insertError } = await supabase.from("exercise_logs").insert(logsToInsert);

    if (insertError) {
      console.error("Failed to save exercise logs:", insertError);

      // Best-effort restore if we were editing and deletion already happened
      if (mode === "edit" && existingLogs && existingLogs.length > 0) {
        try {
          const restoreRows = existingLogs.map((l) => ({
            user_id: userId,
            user_workout_id: workoutId,
            exercise_id: l.exercise_id,
            set_number: l.set_number,
            reps: l.reps,
            weight: l.weight,
            completed_at: l.completed_at ?? completedAtToUse,
            swapped_exercise_name: l.swapped_exercise_name ?? null,
          }));
          await supabase.from("exercise_logs").insert(restoreRows);
        } catch (restoreErr) {
          console.error("Failed to restore previous exercise logs:", restoreErr);
        }
      }

      toast.error("Failed to save exercise data");
      setIsSaving(false);
      return;
    }

    toast.success(`Saved ${logsToInsert.length} sets`);
    queryClient.invalidateQueries({ queryKey: ["workout", workoutId] });
    queryClient.invalidateQueries({ queryKey: ["personal-records"] });
    queryClient.invalidateQueries({ queryKey: ["user-stats"] });
    onOpenChange(false);
    setIsSaving(false);
  };

  const title = mode === "edit" ? "Edit Exercise Data" : "Add Exercise Data";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto bg-background border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {entries.map((entry, exerciseIndex) => (
            <div key={entry.exerciseId} className="border border-border rounded-lg p-4">
              <h4 className="font-semibold text-foreground mb-3">{entry.exerciseName}</h4>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <span className="w-8 text-center">Set</span>
                  <span className="flex-1 text-center">Reps</span>
                  <span className="flex-1 text-center">Weight</span>
                </div>

                {entry.sets.map((set, setIndex) => (
                  <div key={setIndex} className="flex items-center gap-2">
                    <span className="w-8 text-center text-sm text-muted-foreground">
                      {setIndex + 1}
                    </span>
                    <Input
                      type="text"
                      placeholder="Reps"
                      value={set.reps}
                      onChange={(e) => updateSet(exerciseIndex, setIndex, "reps", e.target.value)}
                      className="flex-1 h-10 bg-secondary border-border text-center"
                    />
                    <Input
                      type="text"
                      placeholder="Lbs"
                      value={set.weight}
                      onChange={(e) => updateSet(exerciseIndex, setIndex, "weight", e.target.value)}
                      className="flex-1 h-10 bg-secondary border-border text-center"
                    />
                  </div>
                ))}

                <div className="flex items-center justify-center gap-4 mt-3">
                  <button
                    onClick={() => removeSet(exerciseIndex)}
                    disabled={entry.sets.length <= 1}
                    className="w-8 h-8 rounded-full border border-muted-foreground/50 flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-muted-foreground">Set</span>
                  <button
                    onClick={() => addSet(exerciseIndex)}
                    className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? "Saving..." : "Save Exercise Data"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ManualExerciseLogEntry;
