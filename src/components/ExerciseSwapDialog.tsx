import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus } from "lucide-react";

interface ExerciseLibraryItem {
  id: string;
  name: string;
  video_url: string | null;
  instructions: string | null;
}

interface ExerciseSwapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSwap: (newExercise: { name: string; videoUrl: string | null; isQuickAdd: boolean }) => void;
  currentExerciseName: string;
}

const ExerciseSwapDialog = ({
  open,
  onOpenChange,
  onSwap,
  currentExerciseName,
}: ExerciseSwapDialogProps) => {
  const [searchValue, setSearchValue] = useState("");
  const [quickAddName, setQuickAddName] = useState("");
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  const { data: exercises = [], isLoading } = useQuery({
    queryKey: ["exercise-library-search", searchValue],
    queryFn: async () => {
      if (!searchValue || searchValue.length < 2) return [];

      const { data, error } = await supabase
        .from("exercise_library")
        .select("id, name, video_url, instructions")
        .ilike("name", `%${searchValue}%`)
        .limit(20);

      if (error) {
        console.error("Error fetching exercises:", error);
        return [];
      }
      return data as ExerciseLibraryItem[];
    },
    enabled: searchValue.length >= 2,
  });

  const handleSelectExercise = (exercise: ExerciseLibraryItem) => {
    onSwap({
      name: exercise.name,
      videoUrl: exercise.video_url,
      isQuickAdd: false,
    });
    resetAndClose();
  };

  const handleQuickAdd = () => {
    if (!quickAddName.trim()) return;
    onSwap({
      name: quickAddName.trim(),
      videoUrl: null,
      isQuickAdd: true,
    });
    resetAndClose();
  };

  const resetAndClose = () => {
    setSearchValue("");
    setQuickAddName("");
    setShowQuickAdd(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            Swap Exercise
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Replace "{currentExerciseName}" with another exercise
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {!showQuickAdd ? (
            <>
              {/* Search from library */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder="Search exercise library..."
                  className="pl-10 bg-secondary border-border"
                  autoFocus
                />
              </div>

              {/* Search results */}
              {searchValue.length >= 2 && (
                <div className="max-h-60 overflow-auto rounded-md border border-border">
                  {isLoading ? (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                      Searching...
                    </div>
                  ) : exercises.length > 0 ? (
                    <ul className="divide-y divide-border">
                      {exercises.map((exercise) => (
                        <li
                          key={exercise.id}
                          onClick={() => handleSelectExercise(exercise)}
                          className="px-4 py-3 cursor-pointer hover:bg-secondary transition-colors"
                        >
                          <span className="font-medium text-foreground">
                            {exercise.name}
                          </span>
                          {exercise.video_url && (
                            <span className="ml-2 text-xs text-primary">📹</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                      No exercises found
                    </div>
                  )}
                </div>
              )}

              {/* Quick add button */}
              <Button
                variant="outline"
                onClick={() => setShowQuickAdd(true)}
                className="w-full border-dashed border-muted-foreground/50 text-muted-foreground hover:text-foreground"
              >
                <Plus className="w-4 h-4 mr-2" />
                Quick add custom exercise
              </Button>
            </>
          ) : (
            <>
              {/* Quick add form */}
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Enter a name for your custom exercise
                </p>
                <Input
                  value={quickAddName}
                  onChange={(e) => setQuickAddName(e.target.value)}
                  placeholder="e.g., Cable Flyes"
                  className="bg-secondary border-border"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowQuickAdd(false)}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleQuickAdd}
                    disabled={!quickAddName.trim()}
                    className="flex-1 bg-primary text-primary-foreground"
                  >
                    Use This Exercise
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExerciseSwapDialog;
