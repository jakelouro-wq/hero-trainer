import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCoachAccess } from "@/hooks/useCoachAccess";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ArrowLeft, Plus, Trash2, Edit, Play, Shield } from "lucide-react";
import { toast } from "sonner";

const ExercisesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isCoach, isLoading: checkingAccess } = useCoachAccess();
  const queryClient = useQueryClient();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<{
    id: string;
    name: string;
    video_url: string;
    instructions: string;
  } | null>(null);
  const [newExercise, setNewExercise] = useState({
    name: "",
    video_url: "",
    instructions: "",
  });

  const { data: exercises, isLoading } = useQuery({
    queryKey: ["exercise-library"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exercise_library")
        .select("*")
        .order("name");

      if (error) throw error;
      return data;
    },
    enabled: isCoach,
  });

  const createExercise = useMutation({
    mutationFn: async (exercise: typeof newExercise) => {
      const { error } = await supabase.from("exercise_library").insert({
        name: exercise.name,
        video_url: exercise.video_url || null,
        instructions: exercise.instructions || null,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exercise-library"] });
      setNewExercise({ name: "", video_url: "", instructions: "" });
      setIsAddOpen(false);
      toast.success("Exercise added successfully");
    },
    onError: (error) => {
      toast.error("Failed to add exercise");
      console.error(error);
    },
  });

  const updateExercise = useMutation({
    mutationFn: async (exercise: {
      id: string;
      name: string;
      video_url: string;
      instructions: string;
    }) => {
      const { error } = await supabase
        .from("exercise_library")
        .update({
          name: exercise.name,
          video_url: exercise.video_url || null,
          instructions: exercise.instructions || null,
        })
        .eq("id", exercise.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exercise-library"] });
      setEditingExercise(null);
      setIsEditOpen(false);
      toast.success("Exercise updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update exercise");
      console.error(error);
    },
  });

  const deleteExercise = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("exercise_library")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exercise-library"] });
      toast.success("Exercise deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete exercise");
      console.error(error);
    },
  });

  const getYouTubeEmbedUrl = (url: string) => {
    if (!url) return null;
    const match = url.match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    );
    return match ? `https://www.youtube.com/embed/${match[1]}` : null;
  };

  if (checkingAccess || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary">Loading...</div>
      </div>
    );
  }

  if (!isCoach) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-4">
        <Shield className="w-16 h-16 text-muted-foreground" />
        <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
        <p className="text-muted-foreground text-center">
          You need coach or admin permissions to access this area.
        </p>
        <Button onClick={() => navigate("/")} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/coach")}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  Exercise Library
                </h1>
                <p className="text-sm text-muted-foreground">
                  Manage your exercise database
                </p>
              </div>
            </div>
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Exercise
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border max-w-lg">
                <DialogHeader>
                  <DialogTitle>Add New Exercise</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Exercise Name</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Barbell Back Squat"
                      value={newExercise.name}
                      onChange={(e) =>
                        setNewExercise((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="video_url">YouTube Video URL</Label>
                    <Input
                      id="video_url"
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={newExercise.video_url}
                      onChange={(e) =>
                        setNewExercise((prev) => ({
                          ...prev,
                          video_url: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="instructions">Execution Instructions</Label>
                    <Textarea
                      id="instructions"
                      placeholder="Describe how to properly execute this exercise..."
                      rows={5}
                      value={newExercise.instructions}
                      onChange={(e) =>
                        setNewExercise((prev) => ({
                          ...prev,
                          instructions: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <Button
                    className="w-full bg-primary hover:bg-primary/90"
                    onClick={() => createExercise.mutate(newExercise)}
                    disabled={
                      !newExercise.name.trim() || createExercise.isPending
                    }
                  >
                    {createExercise.isPending ? "Adding..." : "Add Exercise"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {exercises?.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No exercises yet.</p>
            <p className="text-muted-foreground text-sm">
              Click "Add Exercise" to create your first exercise.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {exercises?.map((exercise) => (
              <Card
                key={exercise.id}
                className="bg-card border-border hover:border-primary/50 transition-colors"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg text-foreground">
                      {exercise.name}
                    </CardTitle>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setEditingExercise({
                            id: exercise.id,
                            name: exercise.name,
                            video_url: exercise.video_url || "",
                            instructions: exercise.instructions || "",
                          });
                          setIsEditOpen(true);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => deleteExercise.mutate(exercise.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {exercise.video_url && (
                    <div className="flex items-center gap-2 text-sm text-primary">
                      <Play className="w-4 h-4" />
                      <a
                        href={exercise.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline truncate"
                      >
                        Watch Video
                      </a>
                    </div>
                  )}
                  {exercise.instructions && (
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {exercise.instructions}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Exercise</DialogTitle>
          </DialogHeader>
          {editingExercise && (
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Exercise Name</Label>
                <Input
                  id="edit-name"
                  value={editingExercise.name}
                  onChange={(e) =>
                    setEditingExercise((prev) =>
                      prev ? { ...prev, name: e.target.value } : null
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-video_url">YouTube Video URL</Label>
                <Input
                  id="edit-video_url"
                  value={editingExercise.video_url}
                  onChange={(e) =>
                    setEditingExercise((prev) =>
                      prev ? { ...prev, video_url: e.target.value } : null
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-instructions">Execution Instructions</Label>
                <Textarea
                  id="edit-instructions"
                  rows={5}
                  value={editingExercise.instructions}
                  onChange={(e) =>
                    setEditingExercise((prev) =>
                      prev ? { ...prev, instructions: e.target.value } : null
                    )
                  }
                />
              </div>
              <Button
                className="w-full bg-primary hover:bg-primary/90"
                onClick={() =>
                  editingExercise && updateExercise.mutate(editingExercise)
                }
                disabled={
                  !editingExercise?.name.trim() || updateExercise.isPending
                }
              >
                {updateExercise.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExercisesPage;
