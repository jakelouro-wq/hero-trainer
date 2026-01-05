import { useDraggable } from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MoreVertical, Plus, Copy, Repeat, Trash2, Activity, Clock, Link2, Unlink, ChevronUp, ChevronDown, GripVertical, Calendar } from "lucide-react";

interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  weight: string | null;
  order_index: number;
  superset_group: string | null;
}

interface Workout {
  id: string;
  title: string;
  exercises: Exercise[];
}

interface DraggableWorkoutCardProps {
  workout: Workout;
  currentDay: number;
  daysPerWeek: number;
  onAddExercise: () => void;
  onEditWorkout: () => void;
  onDuplicate: () => void;
  onRepeat: () => void;
  onDelete: () => void;
  onChangeDay: (newDay: number) => void;
  onEditExercise: (exercise: Exercise) => void;
  onDeleteExercise: (exerciseId: string) => void;
  onMoveExercise: (exerciseId: string, direction: 'up' | 'down') => void;
  onLinkWithAbove: (exerciseId: string) => void;
  onUnlinkExercise: (exerciseId: string) => void;
  getExerciseLabel: (exercises: Exercise[], index: number) => string;
}

export const DraggableWorkoutCard = ({
  workout,
  currentDay,
  daysPerWeek,
  onAddExercise,
  onEditWorkout,
  onDuplicate,
  onRepeat,
  onDelete,
  onChangeDay,
  onEditExercise,
  onDeleteExercise,
  onMoveExercise,
  onLinkWithAbove,
  onUnlinkExercise,
  getExerciseLabel,
}: DraggableWorkoutCardProps) => {
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].slice(0, daysPerWeek);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({ id: workout.id });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : undefined,
  };

  const exercises = [...workout.exercises].sort((a, b) => a.order_index - b.order_index);
  const totalSets = exercises.reduce((sum, ex) => sum + ex.sets, 0);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-card border border-border rounded-lg overflow-hidden"
    >
      {/* Workout Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-muted/30">
        <div className="flex items-center gap-2">
          {/* Drag Handle */}
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground p-0.5"
          >
            <GripVertical className="w-4 h-4" />
          </button>
          <span className="w-5 h-5 rounded bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center">
            CL
          </span>
          <span className="text-xs font-semibold text-foreground truncate max-w-[100px]">
            {workout.title}
          </span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <MoreVertical className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-card border-border">
            <DropdownMenuItem onClick={onEditWorkout}>
              <GripVertical className="w-4 h-4 mr-2" />
              Edit Name
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onAddExercise}>
              <Plus className="w-4 h-4 mr-2" />
              Add Exercise
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDuplicate}>
              <Copy className="w-4 h-4 mr-2" />
              Copy
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onRepeat}>
              <Repeat className="w-4 h-4 mr-2" />
              Repeat for remaining weeks
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Day Selector & Stats Row */}
      <div className="flex items-center justify-between px-2 py-2 border-b border-border">
        <div className="flex items-center gap-1">
          <Calendar className="w-3 h-3 text-muted-foreground" />
          <Select
            value={currentDay.toString()}
            onValueChange={(value) => onChangeDay(parseInt(value))}
          >
            <SelectTrigger className="h-6 w-[70px] text-[10px] bg-secondary/50 border-border px-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border-border z-50">
              {dayLabels.map((label, idx) => (
                <SelectItem key={idx + 1} value={(idx + 1).toString()} className="text-xs">
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-center">
            <div className="w-5 h-5 rounded-full border-2 border-muted-foreground flex items-center justify-center">
              <Activity className="w-2.5 h-2.5 text-muted-foreground" />
            </div>
            <span className="text-[9px] text-muted-foreground mt-0.5">
              0/{totalSets}
            </span>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-5 h-5 rounded-full border-2 border-muted-foreground flex items-center justify-center">
              <Clock className="w-2.5 h-2.5 text-muted-foreground" />
            </div>
            <span className="text-[9px] text-muted-foreground mt-0.5">-</span>
          </div>
        </div>
      </div>

      {/* Exercises */}
      <div className="px-2 py-2 space-y-1 max-h-[300px] overflow-y-auto">
        {exercises.map((exercise, idx, arr) => {
          const label = getExerciseLabel(arr, idx);
          const isInSuperset = exercise.superset_group && arr.filter(e => e.superset_group === exercise.superset_group).length > 1;
          const prevInSameGroup = idx > 0 && exercise.superset_group && arr[idx - 1].superset_group === exercise.superset_group;

          return (
            <div key={exercise.id}>
              {/* Link button between exercises */}
              {idx > 0 && !prevInSameGroup && (
                <div className="flex justify-center py-0.5">
                  <button
                    onClick={() => onLinkWithAbove(exercise.id)}
                    className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-0.5"
                  >
                    <Link2 className="w-2.5 h-2.5" />
                    Link
                  </button>
                </div>
              )}
              {prevInSameGroup && (
                <div className="flex justify-center py-0.5">
                  <div className="h-2 border-l-2 border-primary/50" />
                </div>
              )}
              <div
                className={`flex items-start gap-2 p-1.5 rounded cursor-pointer hover:bg-muted/50 group ${
                  isInSuperset ? 'bg-primary/5' : ''
                }`}
                onClick={() => onEditExercise(exercise)}
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 bg-primary text-primary-foreground"
                >
                  {label}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground leading-tight truncate">
                    {exercise.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {exercise.sets} {exercise.sets === 1 ? 'Set' : 'Sets'}
                  </p>
                  {exercise.weight && (
                    <p className="text-[10px] text-muted-foreground">
                      {exercise.reps} @ {exercise.weight}
                    </p>
                  )}
                </div>
                <div className="opacity-0 group-hover:opacity-100 flex flex-col gap-0.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMoveExercise(exercise.id, 'up');
                    }}
                    disabled={idx === 0}
                    className="p-0.5 text-muted-foreground hover:text-primary disabled:opacity-30 disabled:hover:text-muted-foreground"
                  >
                    <ChevronUp className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMoveExercise(exercise.id, 'down');
                    }}
                    disabled={idx === arr.length - 1}
                    className="p-0.5 text-muted-foreground hover:text-primary disabled:opacity-30 disabled:hover:text-muted-foreground"
                  >
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </div>
                <div className="opacity-0 group-hover:opacity-100 flex flex-col gap-0.5">
                  {isInSuperset && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onUnlinkExercise(exercise.id);
                      }}
                      className="p-1 text-muted-foreground hover:text-destructive"
                    >
                      <Unlink className="w-3 h-3" />
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteExercise(exercise.id);
                    }}
                    className="p-1 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* Add Exercise Button */}
        <button
          onClick={onAddExercise}
          className="w-full py-2 text-xs text-primary hover:text-primary/80 border border-dashed border-border rounded hover:border-primary/50 transition-colors flex items-center justify-center gap-1"
        >
          <Plus className="w-3 h-3" />
          Add Exercise
        </button>
      </div>
    </div>
  );
};
