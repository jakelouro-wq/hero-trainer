import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCoachAccess } from "@/hooks/useCoachAccess";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Plus, Trash2, Dumbbell, Shield, Video, Pencil, Copy, Link2, Unlink } from "lucide-react";
import { toast } from "sonner";
import ExerciseAutocomplete from "@/components/ExerciseAutocomplete";

const ProgramDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isCoach, isLoading: isCheckingAccess } = useCoachAccess();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [isWorkoutDialogOpen, setIsWorkoutDialogOpen] = useState(false);
  const [isExerciseDialogOpen, setIsExerciseDialogOpen] = useState(false);
  const [isEditExerciseDialogOpen, setIsEditExerciseDialogOpen] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<string | null>(null);
  const [editingExercise, setEditingExercise] = useState<{
    id: string;
    name: string;
    sets: number;
    reps: string;
    weight: string;
    notes: string;
    video_url: string;
    rest_seconds: number;
    rir: string;
    superset_group: string;
  } | null>(null);
  const [newWorkout, setNewWorkout] = useState({
    title: "",
    subtitle: "",
    week_number: 1,
    day_number: 1,
  });
  const [newExercise, setNewExercise] = useState({
    name: "",
    sets: 3,
    reps: "",
    weight: "",
    notes: "",
    video_url: "",
    rest_seconds: 60,
    rir: "",
    superset_group: "",
  });

  const { data: program, isLoading } = useQuery({
    queryKey: ["program", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("programs")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id && isCoach,
  });

  const { data: workouts } = useQuery({
    queryKey: ["program-workouts", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_templates")
        .select("*, exercises(*)")
        .eq("program_id", id)
        .order("week_number")
        .order("day_number");

      if (error) throw error;
      return data;
    },
    enabled: !!id && isCoach,
  });

  const createWorkout = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from("workout_templates").insert({
        title: newWorkout.title,
        subtitle: newWorkout.subtitle,
        program_id: id,
        week_number: newWorkout.week_number,
        day_number: newWorkout.day_number,
      }).select().single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["program-workouts", id] });
      setIsWorkoutDialogOpen(false);
      setNewWorkout({
        title: "",
        subtitle: "",
        week_number: 1,
        day_number: 1,
      });
      toast.success("Workout created");
    },
    onError: (error) => {
      toast.error("Failed to create workout: " + error.message);
    },
  });

  const deleteWorkout = useMutation({
    mutationFn: async (workoutId: string) => {
      const { error } = await supabase.from("workout_templates").delete().eq("id", workoutId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["program-workouts", id] });
      toast.success("Workout deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete workout: " + error.message);
    },
  });

  const createExercise = useMutation({
    mutationFn: async () => {
      if (!selectedWorkout) return;

      const existingExercises = workouts?.find((w) => w.id === selectedWorkout)?.exercises || [];
      
      // First, save to exercise library if not already exists
      const { data: existingLibraryExercise } = await supabase
        .from("exercise_library")
        .select("id")
        .ilike("name", newExercise.name)
        .maybeSingle();

      if (!existingLibraryExercise) {
        await supabase.from("exercise_library").insert({
          name: newExercise.name,
          video_url: newExercise.video_url || null,
          instructions: newExercise.notes || null,
          created_by: user?.id,
        });
      }

      // Then create the exercise in the workout
      const { data, error } = await supabase.from("exercises").insert({
        name: newExercise.name,
        sets: newExercise.sets,
        reps: newExercise.reps || "10",
        weight: newExercise.weight || null,
        notes: newExercise.notes || null,
        video_url: newExercise.video_url || null,
        rest_seconds: newExercise.rest_seconds,
        rir: newExercise.rir || null,
        superset_group: null,
        workout_template_id: selectedWorkout,
        order_index: existingExercises.length,
      }).select().single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["program-workouts", id] });
      setIsExerciseDialogOpen(false);
      setNewExercise({
        name: "",
        sets: 3,
        reps: "",
        weight: "",
        notes: "",
        video_url: "",
        rest_seconds: 60,
        rir: "",
        superset_group: "",
      });
      toast.success("Exercise added");
    },
    onError: (error) => {
      toast.error("Failed to add exercise: " + error.message);
    },
  });

  const deleteExercise = useMutation({
    mutationFn: async (exerciseId: string) => {
      const { error } = await supabase.from("exercises").delete().eq("id", exerciseId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["program-workouts", id] });
      toast.success("Exercise removed");
    },
    onError: (error) => {
      toast.error("Failed to remove exercise: " + error.message);
    },
  });

  const duplicateWorkout = useMutation({
    mutationFn: async (workoutId: string) => {
      // Find the workout to duplicate
      const workoutToDuplicate = workouts?.find((w) => w.id === workoutId);
      if (!workoutToDuplicate) throw new Error("Workout not found");

      // Create a copy of the workout template
      const { data: newWorkout, error: workoutError } = await supabase
        .from("workout_templates")
        .insert({
          title: `${workoutToDuplicate.title} (Copy)`,
          subtitle: workoutToDuplicate.subtitle,
          duration: workoutToDuplicate.duration,
          focus: workoutToDuplicate.focus,
          program_id: id,
          week_number: workoutToDuplicate.week_number,
          day_number: workoutToDuplicate.day_number,
        })
        .select()
        .single();

      if (workoutError) throw workoutError;

      // Copy all exercises from the original workout
      const exercises = workoutToDuplicate.exercises as any[];
      if (exercises && exercises.length > 0) {
        const exerciseCopies = exercises.map((ex) => ({
          name: ex.name,
          sets: ex.sets,
          reps: ex.reps,
          weight: ex.weight,
          notes: ex.notes,
          video_url: ex.video_url,
          rest_seconds: ex.rest_seconds,
          rir: ex.rir,
          superset_group: ex.superset_group,
          order_index: ex.order_index,
          workout_template_id: newWorkout.id,
        }));

        const { error: exercisesError } = await supabase
          .from("exercises")
          .insert(exerciseCopies);

        if (exercisesError) throw exercisesError;
      }

      return newWorkout;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["program-workouts", id] });
      toast.success("Workout duplicated! You can now edit the copy.");
    },
    onError: (error) => {
      toast.error("Failed to duplicate workout: " + error.message);
    },
  });

  const updateExercise = useMutation({
    mutationFn: async () => {
      if (!editingExercise) return;

      const { error } = await supabase
        .from("exercises")
        .update({
          name: editingExercise.name,
          sets: editingExercise.sets,
          reps: editingExercise.reps || "10",
          weight: editingExercise.weight || null,
          notes: editingExercise.notes || null,
          video_url: editingExercise.video_url || null,
          rest_seconds: editingExercise.rest_seconds,
          rir: editingExercise.rir || null,
          superset_group: editingExercise.superset_group || null,
        })
        .eq("id", editingExercise.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["program-workouts", id] });
      setIsEditExerciseDialogOpen(false);
      setEditingExercise(null);
      toast.success("Exercise updated");
    },
    onError: (error) => {
      toast.error("Failed to update exercise: " + error.message);
    },
  });

  const openEditExercise = (exercise: any) => {
    setEditingExercise({
      id: exercise.id,
      name: exercise.name,
      sets: exercise.sets,
      reps: exercise.reps || "",
      weight: exercise.weight || "",
      notes: exercise.notes || "",
      video_url: exercise.video_url || "",
      rest_seconds: exercise.rest_seconds ?? 60,
      rir: exercise.rir || "",
      superset_group: exercise.superset_group || "",
    });
    setIsEditExerciseDialogOpen(true);
  };

  // Link exercises together as superset
  const linkWithAbove = useMutation({
    mutationFn: async ({ exerciseId, workoutId }: { exerciseId: string; workoutId: string }) => {
      const workout = workouts?.find((w) => w.id === workoutId);
      if (!workout) throw new Error("Workout not found");

      const exercises = (workout.exercises as any[])?.sort((a, b) => a.order_index - b.order_index) || [];
      const currentIndex = exercises.findIndex((e) => e.id === exerciseId);
      if (currentIndex <= 0) throw new Error("No exercise above to link with");

      const currentExercise = exercises[currentIndex];
      const aboveExercise = exercises[currentIndex - 1];

      // Get the superset group of the exercise above, or assign a new one
      let supersetGroup = aboveExercise.superset_group;
      
      if (!supersetGroup) {
        // Find the next available letter
        const usedGroups = new Set(exercises.map((e) => e.superset_group).filter(Boolean));
        const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
        supersetGroup = letters.find((l) => !usedGroups.has(l)) || 'A';
        
        // Update the above exercise with the new group
        await supabase
          .from("exercises")
          .update({ superset_group: supersetGroup })
          .eq("id", aboveExercise.id);
      }

      // Update current exercise with the same group
      const { error } = await supabase
        .from("exercises")
        .update({ superset_group: supersetGroup })
        .eq("id", exerciseId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["program-workouts", id] });
      toast.success("Exercises linked as superset");
    },
    onError: (error) => {
      toast.error("Failed to link: " + error.message);
    },
  });

  // Unlink exercise from superset
  const unlinkExercise = useMutation({
    mutationFn: async ({ exerciseId, workoutId }: { exerciseId: string; workoutId: string }) => {
      const workout = workouts?.find((w) => w.id === workoutId);
      if (!workout) throw new Error("Workout not found");

      const exercises = (workout.exercises as any[]) || [];
      const currentExercise = exercises.find((e) => e.id === exerciseId);
      if (!currentExercise?.superset_group) throw new Error("Exercise not in a superset");

      const sameGroupExercises = exercises.filter(
        (e) => e.superset_group === currentExercise.superset_group && e.id !== exerciseId
      );

      // Remove current exercise from superset
      await supabase
        .from("exercises")
        .update({ superset_group: null })
        .eq("id", exerciseId);

      // If only one exercise left in group, remove that too
      if (sameGroupExercises.length === 1) {
        await supabase
          .from("exercises")
          .update({ superset_group: null })
          .eq("id", sameGroupExercises[0].id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["program-workouts", id] });
      toast.success("Exercise unlinked from superset");
    },
    onError: (error) => {
      toast.error("Failed to unlink: " + error.message);
    },
  });

  // Helper to get exercise letter label
  const getExerciseLabel = (exercises: any[], index: number) => {
    const sortedExercises = [...exercises].sort((a, b) => a.order_index - b.order_index);
    const exercise = sortedExercises[index];
    
    let letterIndex = 0;
    let subIndex = 1;
    
    for (let i = 0; i <= index; i++) {
      const current = sortedExercises[i];
      const prev = i > 0 ? sortedExercises[i - 1] : null;
      
      if (i === 0) {
        letterIndex = 0;
        subIndex = 1;
      } else if (current.superset_group && prev?.superset_group === current.superset_group) {
        subIndex++;
      } else {
        letterIndex++;
        subIndex = 1;
      }
    }
    
    const letter = String.fromCharCode(65 + letterIndex); // A, B, C...
    
    // Check if this exercise is part of a superset
    const sameGroupCount = exercises.filter(
      (e) => e.superset_group && e.superset_group === exercise.superset_group
    ).length;
    
    if (sameGroupCount > 1) {
      return `${letter}${subIndex}`;
    }
    return letter;
  };

  if (isCheckingAccess || isLoading) {
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
        <Button onClick={() => navigate("/")} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Button>
      </div>
    );
  }

  // Group workouts by week
  const workoutsByWeek: Record<number, typeof workouts> = {};
  workouts?.forEach((workout) => {
    const week = workout.week_number || 1;
    if (!workoutsByWeek[week]) workoutsByWeek[week] = [];
    workoutsByWeek[week].push(workout);
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/coach/programs")}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-foreground">{program?.name}</h1>
                <p className="text-sm text-muted-foreground">
                  {program?.duration_weeks} weeks • {program?.days_per_week} days/week
                </p>
              </div>
            </div>

            <Button
              onClick={() => setIsWorkoutDialogOpen(true)}
              className="bg-primary hover:bg-primary/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Workout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {Object.keys(workoutsByWeek).length === 0 ? (
          <div className="text-center py-12">
            <Dumbbell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-foreground mb-2">No workouts yet</h2>
            <p className="text-muted-foreground mb-4">Add workouts to this program</p>
            <Button onClick={() => setIsWorkoutDialogOpen(true)} className="bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              Add Workout
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {Array.from({ length: program?.duration_weeks || 1 }, (_, i) => i + 1).map((week) => (
              <div key={week}>
                <h2 className="text-lg font-semibold text-foreground mb-4">Week {week}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(workoutsByWeek[week] || []).map((workout) => (
                    <Card key={workout.id} className="bg-card border-border">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-xs text-primary font-medium uppercase">
                              Day {workout.day_number}
                            </p>
                            <CardTitle className="text-foreground text-base">
                              {workout.title}
                            </CardTitle>
                            {workout.subtitle && (
                              <p className="text-xs text-muted-foreground">{workout.subtitle}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => duplicateWorkout.mutate(workout.id)}
                              className="text-muted-foreground hover:text-primary h-8 w-8"
                              title="Duplicate workout"
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteWorkout.mutate(workout.id)}
                              className="text-muted-foreground hover:text-destructive h-8 w-8"
                              title="Delete workout"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-1 mb-3">
                          {(workout.exercises as any[])
                            ?.sort((a, b) => a.order_index - b.order_index)
                            .map((exercise, index, arr) => {
                              const label = getExerciseLabel(arr, index);
                              const isInSuperset = exercise.superset_group && arr.filter(e => e.superset_group === exercise.superset_group).length > 1;
                              const prevInSameGroup = index > 0 && arr[index - 1].superset_group === exercise.superset_group;
                              
                              return (
                                <div key={exercise.id}>
                                  {/* Link button between exercises */}
                                  {index > 0 && (
                                    <div className="flex justify-center py-0.5">
                                      {!prevInSameGroup ? (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => linkWithAbove.mutate({ exerciseId: exercise.id, workoutId: workout.id })}
                                          className="h-5 px-2 text-xs text-muted-foreground hover:text-primary"
                                          disabled={linkWithAbove.isPending}
                                        >
                                          <Link2 className="w-3 h-3 mr-1" />
                                          Link as superset
                                        </Button>
                                      ) : (
                                        <div className="h-3 border-l-2 border-primary/50" />
                                      )}
                                    </div>
                                  )}
                                  <div
                                    className={`flex items-center justify-between py-2 px-2 rounded ${
                                      isInSuperset ? 'bg-primary/10 border-l-2 border-primary' : ''
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className={`text-xs font-bold min-w-[24px] ${isInSuperset ? 'text-primary' : 'text-muted-foreground'}`}>
                                        {label}
                                      </span>
                                      <div>
                                        <p className="text-sm font-medium text-foreground">
                                          {exercise.name}
                                        </p>
                                        <p className="text-xs text-primary">
                                          {exercise.sets} x {exercise.reps}
                                          {exercise.weight && ` @ ${exercise.weight}`}
                                          {exercise.rir && ` • RIR ${exercise.rir}`}
                                        </p>
                                      </div>
                                      {exercise.video_url && (
                                        <Video className="w-3 h-3 text-primary" />
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1">
                                      {isInSuperset && (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => unlinkExercise.mutate({ exerciseId: exercise.id, workoutId: workout.id })}
                                          className="text-muted-foreground hover:text-destructive h-6 w-6"
                                          title="Remove from superset"
                                        >
                                          <Unlink className="w-3 h-3" />
                                        </Button>
                                      )}
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => openEditExercise(exercise)}
                                        className="text-muted-foreground hover:text-primary h-6 w-6"
                                      >
                                        <Pencil className="w-3 h-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => deleteExercise.mutate(exercise.id)}
                                        className="text-muted-foreground hover:text-destructive h-6 w-6"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedWorkout(workout.id);
                            setIsExerciseDialogOpen(true);
                          }}
                          className="w-full"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Exercise
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add Workout Dialog */}
      <Dialog open={isWorkoutDialogOpen} onOpenChange={setIsWorkoutDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Add Workout</DialogTitle>
            <DialogDescription>Create a new workout for this program</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="workoutTitle">Workout Title</Label>
              <Input
                id="workoutTitle"
                value={newWorkout.title}
                onChange={(e) => setNewWorkout({ ...newWorkout, title: e.target.value })}
                placeholder="e.g., Push Day"
                className="bg-secondary border-border"
              />
            </div>
            <div>
              <Label htmlFor="workoutSubtitle">Subtitle</Label>
              <Input
                id="workoutSubtitle"
                value={newWorkout.subtitle}
                onChange={(e) => setNewWorkout({ ...newWorkout, subtitle: e.target.value })}
                placeholder="e.g., Week 1 Day 1"
                className="bg-secondary border-border"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="weekNumber">Week</Label>
                <Select
                  value={String(newWorkout.week_number)}
                  onValueChange={(v) => setNewWorkout({ ...newWorkout, week_number: parseInt(v) })}
                >
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {Array.from({ length: program?.duration_weeks || 4 }, (_, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>
                        Week {i + 1}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="dayNumber">Day</Label>
                <Select
                  value={String(newWorkout.day_number)}
                  onValueChange={(v) => setNewWorkout({ ...newWorkout, day_number: parseInt(v) })}
                >
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {Array.from({ length: program?.days_per_week || 4 }, (_, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>
                        Day {i + 1}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              onClick={() => createWorkout.mutate()}
              disabled={!newWorkout.title || createWorkout.isPending}
              className="w-full bg-primary hover:bg-primary/90"
            >
              {createWorkout.isPending ? "Creating..." : "Create Workout"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Exercise Dialog */}
      <Dialog open={isExerciseDialogOpen} onOpenChange={setIsExerciseDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Add Exercise</DialogTitle>
            <DialogDescription>Add an exercise to this workout</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="exerciseName">Exercise Name</Label>
              <ExerciseAutocomplete
                value={newExercise.name}
                onChange={(value) => setNewExercise({ ...newExercise, name: value })}
                onSelect={(exercise) => {
                  setNewExercise({
                    ...newExercise,
                    name: exercise.name,
                    video_url: exercise.video_url || newExercise.video_url,
                    notes: exercise.instructions || newExercise.notes,
                  });
                }}
                placeholder="e.g., Bench Press"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="sets">Sets</Label>
                <Input
                  id="sets"
                  type="number"
                  min={1}
                  value={newExercise.sets}
                  onChange={(e) =>
                    setNewExercise({ ...newExercise, sets: parseInt(e.target.value) || 1 })
                  }
                  className="bg-secondary border-border"
                />
              </div>
              <div>
                <Label htmlFor="reps">Reps</Label>
                <Input
                  id="reps"
                  value={newExercise.reps}
                  onChange={(e) => setNewExercise({ ...newExercise, reps: e.target.value })}
                  placeholder="10"
                  className="bg-secondary border-border"
                />
              </div>
              <div>
                <Label htmlFor="weight">Weight</Label>
                <Input
                  id="weight"
                  value={newExercise.weight}
                  onChange={(e) => setNewExercise({ ...newExercise, weight: e.target.value })}
                  placeholder="135 lb"
                  className="bg-secondary border-border"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="rir">RIR (Reps in Reserve)</Label>
              <Input
                id="rir"
                value={newExercise.rir}
                onChange={(e) => setNewExercise({ ...newExercise, rir: e.target.value })}
                placeholder="e.g., 2-3"
                className="bg-secondary border-border"
              />
            </div>
            <div>
              <Label htmlFor="videoUrl">YouTube Video URL</Label>
              <Input
                id="videoUrl"
                value={newExercise.video_url}
                onChange={(e) => setNewExercise({ ...newExercise, video_url: e.target.value })}
                placeholder="https://youtube.com/watch?v=..."
                className="bg-secondary border-border"
              />
            </div>
            <div>
              <Label htmlFor="restSeconds">Rest Between Sets (seconds)</Label>
              <Input
                id="restSeconds"
                type="number"
                min={0}
                value={newExercise.rest_seconds}
                onChange={(e) =>
                  setNewExercise({ ...newExercise, rest_seconds: parseInt(e.target.value) ?? 0 })
                }
                placeholder="60"
                className="bg-secondary border-border"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use 0 for supersets/circuits. Link exercises together after adding.
              </p>
            </div>
            <div>
              <Label htmlFor="notes">Coach Notes</Label>
              <Textarea
                id="notes"
                value={newExercise.notes}
                onChange={(e) => setNewExercise({ ...newExercise, notes: e.target.value })}
                placeholder="Instructions for the athlete..."
                className="bg-secondary border-border"
              />
            </div>
            <Button
              onClick={() => createExercise.mutate()}
              disabled={!newExercise.name || createExercise.isPending}
              className="w-full bg-primary hover:bg-primary/90"
            >
              {createExercise.isPending ? "Adding..." : "Add Exercise"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Exercise Dialog */}
      <Dialog open={isEditExerciseDialogOpen} onOpenChange={setIsEditExerciseDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Edit Exercise</DialogTitle>
            <DialogDescription>Update this exercise's details</DialogDescription>
          </DialogHeader>
          {editingExercise && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="editExerciseName">Exercise Name</Label>
                <Input
                  id="editExerciseName"
                  value={editingExercise.name}
                  onChange={(e) => setEditingExercise({ ...editingExercise, name: e.target.value })}
                  placeholder="e.g., Bench Press"
                  className="bg-secondary border-border"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="editSets">Sets</Label>
                  <Input
                    id="editSets"
                    type="number"
                    min={1}
                    value={editingExercise.sets}
                    onChange={(e) =>
                      setEditingExercise({ ...editingExercise, sets: parseInt(e.target.value) || 1 })
                    }
                    className="bg-secondary border-border"
                  />
                </div>
                <div>
                  <Label htmlFor="editReps">Reps</Label>
                  <Input
                    id="editReps"
                    value={editingExercise.reps}
                    onChange={(e) => setEditingExercise({ ...editingExercise, reps: e.target.value })}
                    placeholder="10"
                    className="bg-secondary border-border"
                  />
                </div>
                <div>
                  <Label htmlFor="editWeight">Weight</Label>
                  <Input
                    id="editWeight"
                    value={editingExercise.weight}
                    onChange={(e) => setEditingExercise({ ...editingExercise, weight: e.target.value })}
                    placeholder="135 lb"
                    className="bg-secondary border-border"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="editRir">RIR (Reps in Reserve)</Label>
                <Input
                  id="editRir"
                  value={editingExercise.rir}
                  onChange={(e) => setEditingExercise({ ...editingExercise, rir: e.target.value })}
                  placeholder="e.g., 2-3"
                  className="bg-secondary border-border"
                />
              </div>
              <div>
                <Label htmlFor="editVideoUrl">YouTube Video URL</Label>
                <Input
                  id="editVideoUrl"
                  value={editingExercise.video_url}
                  onChange={(e) => setEditingExercise({ ...editingExercise, video_url: e.target.value })}
                  placeholder="https://youtube.com/watch?v=..."
                  className="bg-secondary border-border"
                />
              </div>
              <div>
                <Label htmlFor="editRestSeconds">Rest Between Sets (seconds)</Label>
                <Input
                  id="editRestSeconds"
                  type="number"
                  min={0}
                  value={editingExercise.rest_seconds}
                  onChange={(e) =>
                    setEditingExercise({ ...editingExercise, rest_seconds: parseInt(e.target.value) ?? 0 })
                  }
                  placeholder="60"
                  className="bg-secondary border-border"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Use 0 for supersets/circuits
                </p>
              </div>
              <div>
                <Label htmlFor="editNotes">Coach Notes</Label>
                <Textarea
                  id="editNotes"
                  value={editingExercise.notes}
                  onChange={(e) => setEditingExercise({ ...editingExercise, notes: e.target.value })}
                  placeholder="Instructions for the athlete..."
                  className="bg-secondary border-border"
                />
              </div>
              <Button
                onClick={() => updateExercise.mutate()}
                disabled={!editingExercise.name || updateExercise.isPending}
                className="w-full bg-primary hover:bg-primary/90"
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

export default ProgramDetailPage;
