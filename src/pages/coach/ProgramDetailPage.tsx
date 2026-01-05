import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCoachAccess } from "@/hooks/useCoachAccess";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
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
import { ArrowLeft, Plus, Shield, ChevronLeft, ChevronRight, Image } from "lucide-react";
import { toast } from "sonner";
import ExerciseAutocomplete from "@/components/ExerciseAutocomplete";
import ProgramImageUpload from "@/components/ProgramImageUpload";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from "@dnd-kit/core";
import { DroppableDayColumn } from "@/components/coach/DroppableDayColumn";

const ProgramDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isCoach, isLoading: isCheckingAccess } = useCoachAccess();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [currentWeek, setCurrentWeek] = useState(1);
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [isWorkoutDialogOpen, setIsWorkoutDialogOpen] = useState(false);
  const [isExerciseDialogOpen, setIsExerciseDialogOpen] = useState(false);
  const [isEditExerciseDialogOpen, setIsEditExerciseDialogOpen] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<string | null>(null);
  const [selectedDayForNewWorkout, setSelectedDayForNewWorkout] = useState<number>(1);
  const [activeWorkoutId, setActiveWorkoutId] = useState<string | null>(null);
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

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );
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

  // Fetch coach profile for default image
  const { data: coachProfile } = useQuery({
    queryKey: ["coach-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && isCoach,
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
        week_number: currentWeek,
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
        order_index: (existingExercises as any[]).length,
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
      const workoutToDuplicate = workouts?.find((w) => w.id === workoutId);
      if (!workoutToDuplicate) throw new Error("Workout not found");

      const { data: newWorkoutData, error: workoutError } = await supabase
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
          workout_template_id: newWorkoutData.id,
        }));

        const { error: exercisesError } = await supabase
          .from("exercises")
          .insert(exerciseCopies);

        if (exercisesError) throw exercisesError;
      }

      return newWorkoutData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["program-workouts", id] });
      toast.success("Workout duplicated!");
    },
    onError: (error) => {
      toast.error("Failed to duplicate workout: " + error.message);
    },
  });

  const repeatWorkout = useMutation({
    mutationFn: async (workoutId: string) => {
      const workoutToRepeat = workouts?.find((w) => w.id === workoutId);
      if (!workoutToRepeat || !program) throw new Error("Workout not found");

      const sourceWeek = workoutToRepeat.week_number || 1;
      const dayNumber = workoutToRepeat.day_number || 1;
      const totalWeeks = program.duration_weeks;
      
      // Get weeks that need the workout (all weeks after current that don't have a workout on this day)
      const weeksToCreate: number[] = [];
      for (let week = sourceWeek + 1; week <= totalWeeks; week++) {
        const existingWorkout = workouts?.find(
          (w) => w.week_number === week && w.day_number === dayNumber
        );
        if (!existingWorkout) {
          weeksToCreate.push(week);
        }
      }

      if (weeksToCreate.length === 0) {
        throw new Error("All remaining weeks already have workouts on this day");
      }

      const exercises = workoutToRepeat.exercises as any[];
      
      // Create workouts for each remaining week
      for (const week of weeksToCreate) {
        const { data: newWorkoutData, error: workoutError } = await supabase
          .from("workout_templates")
          .insert({
            title: workoutToRepeat.title,
            subtitle: workoutToRepeat.subtitle,
            duration: workoutToRepeat.duration,
            focus: workoutToRepeat.focus,
            program_id: id,
            week_number: week,
            day_number: dayNumber,
          })
          .select()
          .single();

        if (workoutError) throw workoutError;

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
            workout_template_id: newWorkoutData.id,
          }));

          const { error: exercisesError } = await supabase
            .from("exercises")
            .insert(exerciseCopies);

          if (exercisesError) throw exercisesError;
        }
      }

      return weeksToCreate.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["program-workouts", id] });
      toast.success(`Workout repeated for ${count} remaining week${count > 1 ? 's' : ''}`);
    },
    onError: (error) => {
      toast.error("Failed to repeat workout: " + error.message);
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

  const linkWithAbove = useMutation({
    mutationFn: async ({ exerciseId, workoutId }: { exerciseId: string; workoutId: string }) => {
      const workout = workouts?.find((w) => w.id === workoutId);
      if (!workout) throw new Error("Workout not found");

      const exercises = (workout.exercises as any[])?.sort((a, b) => a.order_index - b.order_index) || [];
      const currentIndex = exercises.findIndex((e) => e.id === exerciseId);
      if (currentIndex <= 0) throw new Error("No exercise above to link with");

      const aboveExercise = exercises[currentIndex - 1];
      let supersetGroup = aboveExercise.superset_group;
      
      if (!supersetGroup) {
        const usedGroups = new Set(exercises.map((e) => e.superset_group).filter(Boolean));
        const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
        supersetGroup = letters.find((l) => !usedGroups.has(l)) || 'A';
        
        await supabase
          .from("exercises")
          .update({ superset_group: supersetGroup })
          .eq("id", aboveExercise.id);
      }

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

      await supabase
        .from("exercises")
        .update({ superset_group: null })
        .eq("id", exerciseId);

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

  const moveExercise = useMutation({
    mutationFn: async ({ exerciseId, workoutId, direction }: { exerciseId: string; workoutId: string; direction: 'up' | 'down' }) => {
      const workout = workouts?.find((w) => w.id === workoutId);
      if (!workout) throw new Error("Workout not found");

      const exercises = [...(workout.exercises as any[])].sort((a, b) => a.order_index - b.order_index);
      const currentIndex = exercises.findIndex((e) => e.id === exerciseId);
      
      if (direction === 'up' && currentIndex <= 0) throw new Error("Already at top");
      if (direction === 'down' && currentIndex >= exercises.length - 1) throw new Error("Already at bottom");

      const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      const currentExercise = exercises[currentIndex];
      const swapExercise = exercises[swapIndex];

      // Swap order_index values
      await supabase
        .from("exercises")
        .update({ order_index: swapExercise.order_index })
        .eq("id", currentExercise.id);

      await supabase
        .from("exercises")
        .update({ order_index: currentExercise.order_index })
        .eq("id", swapExercise.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["program-workouts", id] });
    },
    onError: (error) => {
      toast.error("Failed to move exercise: " + error.message);
    },
  });

  // Mutation for moving workout to a different day
  const moveWorkoutToDay = useMutation({
    mutationFn: async ({ workoutId, newDay }: { workoutId: string; newDay: number }) => {
      const { error } = await supabase
        .from("workout_templates")
        .update({ day_number: newDay })
        .eq("id", workoutId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["program-workouts", id] });
      toast.success("Workout moved successfully");
    },
    onError: (error) => {
      toast.error("Failed to move workout: " + error.message);
    },
  });

  // Drag and drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveWorkoutId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveWorkoutId(null);

    if (!over) return;

    const workoutId = active.id as string;
    const overId = over.id as string;

    // Check if dropped on a day column
    if (overId.startsWith('day-')) {
      const newDay = parseInt(overId.replace('day-', ''));
      const workout = workouts?.find(w => w.id === workoutId);
      
      if (workout && workout.day_number !== newDay) {
        moveWorkoutToDay.mutate({ workoutId, newDay });
      }
    }
  };

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

  const openCreateWorkoutForDay = (day: number) => {
    setSelectedDayForNewWorkout(day);
    setNewWorkout({
      ...newWorkout,
      week_number: currentWeek,
      day_number: day,
    });
    setIsWorkoutDialogOpen(true);
  };

  // Get exercise label like A, B1, B2, C1, etc.
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
    
    const letter = String.fromCharCode(65 + letterIndex);
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

  const daysPerWeek = program?.days_per_week || 7;
  const totalWeeks = program?.duration_weeks || 4;
  const dayLabels = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].slice(0, daysPerWeek);

  // Get workouts for current week
  const currentWeekWorkouts = workouts?.filter(w => w.week_number === currentWeek) || [];

  // Group workouts by day
  const getWorkoutsForDay = (day: number) => {
    return currentWeekWorkouts.filter(w => w.day_number === day);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="px-4 py-3">
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
                <h1 className="text-lg font-bold text-foreground">{program?.name}</h1>
                <p className="text-xs text-muted-foreground">
                  {program?.duration_weeks} weeks • {program?.days_per_week} days/week
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsImageDialogOpen(true)}
            >
              <Image className="w-4 h-4 mr-2" />
              Cover Image
            </Button>
          </div>
        </div>
      </header>

      {/* Program Image Dialog */}
      <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Program Cover Image</DialogTitle>
            <DialogDescription>
              Upload a custom image for this program, or it will use your profile image as the default.
            </DialogDescription>
          </DialogHeader>
          <ProgramImageUpload
            programId={id || ""}
            currentImageUrl={(program as any)?.image_url}
            coachAvatarUrl={coachProfile?.avatar_url}
            onUploadComplete={() => setIsImageDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Week Navigation */}
      <div className="border-b border-border bg-card/50 px-4 py-3">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentWeek(Math.max(1, currentWeek - 1))}
            disabled={currentWeek <= 1}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Prev
          </Button>
          <span className="text-sm font-semibold text-foreground">
            Week {currentWeek} of {totalWeeks}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentWeek(Math.min(totalWeeks, currentWeek + 1))}
            disabled={currentWeek >= totalWeeks}
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Day Headers */}
          <div className="grid border-b border-border" style={{ gridTemplateColumns: `repeat(${daysPerWeek}, 1fr)` }}>
            {dayLabels.map((label, idx) => (
              <div
                key={label}
                className="px-2 py-3 text-center text-xs font-semibold text-muted-foreground border-r border-border last:border-r-0"
              >
                {label}
                <div className="text-foreground mt-0.5">{idx + 1}</div>
              </div>
            ))}
          </div>

          {/* Day Columns with Drag and Drop */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="grid" style={{ gridTemplateColumns: `repeat(${daysPerWeek}, 1fr)` }}>
              {Array.from({ length: daysPerWeek }, (_, dayIdx) => {
                const day = dayIdx + 1;
                const dayWorkouts = getWorkoutsForDay(day);

                return (
                  <DroppableDayColumn
                    key={day}
                    day={day}
                    workouts={dayWorkouts.map(w => ({
                      id: w.id,
                      title: w.title,
                      exercises: (w.exercises as any[]) || [],
                    }))}
                    onCreateWorkout={() => openCreateWorkoutForDay(day)}
                    onAddExercise={(workoutId) => {
                      setSelectedWorkout(workoutId);
                      setIsExerciseDialogOpen(true);
                    }}
                    onDuplicateWorkout={(workoutId) => duplicateWorkout.mutate(workoutId)}
                    onRepeatWorkout={(workoutId) => repeatWorkout.mutate(workoutId)}
                    onDeleteWorkout={(workoutId) => deleteWorkout.mutate(workoutId)}
                    onEditExercise={(exercise) => openEditExercise(exercise)}
                    onDeleteExercise={(exerciseId) => deleteExercise.mutate(exerciseId)}
                    onMoveExercise={(exerciseId, workoutId, direction) => 
                      moveExercise.mutate({ exerciseId, workoutId, direction })
                    }
                    onLinkWithAbove={(exerciseId, workoutId) => 
                      linkWithAbove.mutate({ exerciseId, workoutId })
                    }
                    onUnlinkExercise={(exerciseId, workoutId) => 
                      unlinkExercise.mutate({ exerciseId, workoutId })
                    }
                    getExerciseLabel={getExerciseLabel}
                  />
                );
              })}
            </div>
            <DragOverlay>
              {activeWorkoutId ? (
                <div className="bg-card border border-primary rounded-lg p-3 shadow-lg opacity-90">
                  <span className="text-sm font-semibold text-foreground">
                    {workouts?.find(w => w.id === activeWorkoutId)?.title || 'Workout'}
                  </span>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      </div>

      {/* Add Workout Dialog */}
      <Dialog open={isWorkoutDialogOpen} onOpenChange={setIsWorkoutDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Create Session</DialogTitle>
            <DialogDescription>Create a new workout for Week {newWorkout.week_number}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="workoutDay">Day of Week</Label>
              <Select
                value={newWorkout.day_number.toString()}
                onValueChange={(value) => setNewWorkout({ ...newWorkout, day_number: parseInt(value) })}
              >
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue placeholder="Select day" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border z-50">
                  <SelectItem value="1">Monday</SelectItem>
                  <SelectItem value="2">Tuesday</SelectItem>
                  <SelectItem value="3">Wednesday</SelectItem>
                  <SelectItem value="4">Thursday</SelectItem>
                  <SelectItem value="5">Friday</SelectItem>
                  <SelectItem value="6">Saturday</SelectItem>
                  <SelectItem value="7">Sunday</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="workoutTitle">Session Title</Label>
              <Input
                id="workoutTitle"
                value={newWorkout.title}
                onChange={(e) => setNewWorkout({ ...newWorkout, title: e.target.value })}
                placeholder="e.g., Week 2 Day 5"
                className="bg-secondary border-border"
              />
            </div>
            <div>
              <Label htmlFor="workoutSubtitle">Subtitle (optional)</Label>
              <Input
                id="workoutSubtitle"
                value={newWorkout.subtitle}
                onChange={(e) => setNewWorkout({ ...newWorkout, subtitle: e.target.value })}
                placeholder="e.g., Full Body Strength"
                className="bg-secondary border-border"
              />
            </div>
            <Button
              onClick={() => createWorkout.mutate()}
              disabled={!newWorkout.title || createWorkout.isPending}
              className="w-full bg-primary hover:bg-primary/90"
            >
              {createWorkout.isPending ? "Creating..." : "Create Session"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Exercise Dialog */}
      <Dialog open={isExerciseDialogOpen} onOpenChange={setIsExerciseDialogOpen}>
        <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto">
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
                Use 0 for supersets/circuits
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
        <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">Edit Exercise</DialogTitle>
            <DialogDescription>Update this exercise's details</DialogDescription>
          </DialogHeader>
          {editingExercise && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="editExerciseName">Exercise Name</Label>
                <ExerciseAutocomplete
                  value={editingExercise.name}
                  onChange={(value) => setEditingExercise({ ...editingExercise, name: value })}
                  onSelect={(exercise) => {
                    setEditingExercise({
                      ...editingExercise,
                      name: exercise.name,
                      video_url: exercise.video_url || editingExercise.video_url,
                      notes: exercise.instructions || editingExercise.notes,
                    });
                  }}
                  placeholder="e.g., Bench Press"
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
