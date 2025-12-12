import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCoachAccess } from "@/hooks/useCoachAccess";
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
import { ArrowLeft, Plus, Trash2, Dumbbell, Shield, Video, GripVertical } from "lucide-react";
import { toast } from "sonner";

const ProgramDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isCoach, isLoading: isCheckingAccess } = useCoachAccess();
  const queryClient = useQueryClient();

  const [isWorkoutDialogOpen, setIsWorkoutDialogOpen] = useState(false);
  const [isExerciseDialogOpen, setIsExerciseDialogOpen] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<string | null>(null);
  const [newWorkout, setNewWorkout] = useState({
    title: "",
    subtitle: "",
    duration: "45 min",
    focus: "",
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
        duration: newWorkout.duration,
        focus: newWorkout.focus,
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
        duration: "45 min",
        focus: "",
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
      
      const { data, error } = await supabase.from("exercises").insert({
        name: newExercise.name,
        sets: newExercise.sets,
        reps: newExercise.reps || "10",
        weight: newExercise.weight || null,
        notes: newExercise.notes || null,
        video_url: newExercise.video_url || null,
        rest_seconds: newExercise.rest_seconds || 60,
        rir: newExercise.rir || null,
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
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteWorkout.mutate(workout.id)}
                            className="text-muted-foreground hover:text-destructive h-8 w-8"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 mb-3">
                          {(workout.exercises as any[])?.map((exercise, index) => (
                            <div
                              key={exercise.id}
                              className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground w-4">
                                  {index + 1}.
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
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteExercise.mutate(exercise.id)}
                                className="text-muted-foreground hover:text-destructive h-6 w-6"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
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
            <div>
              <Label htmlFor="duration">Duration</Label>
              <Input
                id="duration"
                value={newWorkout.duration}
                onChange={(e) => setNewWorkout({ ...newWorkout, duration: e.target.value })}
                placeholder="e.g., 45 min"
                className="bg-secondary border-border"
              />
            </div>
            <div>
              <Label htmlFor="focus">Focus</Label>
              <Input
                id="focus"
                value={newWorkout.focus}
                onChange={(e) => setNewWorkout({ ...newWorkout, focus: e.target.value })}
                placeholder="e.g., Chest & Triceps"
                className="bg-secondary border-border"
              />
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
              <Input
                id="exerciseName"
                value={newExercise.name}
                onChange={(e) => setNewExercise({ ...newExercise, name: e.target.value })}
                placeholder="e.g., Bench Press"
                className="bg-secondary border-border"
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
                  setNewExercise({ ...newExercise, rest_seconds: parseInt(e.target.value) || 60 })
                }
                placeholder="60"
                className="bg-secondary border-border"
              />
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
    </div>
  );
};

export default ProgramDetailPage;
