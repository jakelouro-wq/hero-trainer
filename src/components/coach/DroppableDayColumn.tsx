import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { DraggableWorkoutCard } from "./DraggableWorkoutCard";

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

interface DroppableDayColumnProps {
  day: number;
  workouts: Workout[];
  onCreateWorkout: () => void;
  onAddExercise: (workoutId: string) => void;
  onDuplicateWorkout: (workoutId: string) => void;
  onRepeatWorkout: (workoutId: string) => void;
  onDeleteWorkout: (workoutId: string) => void;
  onEditExercise: (exercise: Exercise) => void;
  onDeleteExercise: (exerciseId: string) => void;
  onMoveExercise: (exerciseId: string, workoutId: string, direction: 'up' | 'down') => void;
  onLinkWithAbove: (exerciseId: string, workoutId: string) => void;
  onUnlinkExercise: (exerciseId: string, workoutId: string) => void;
  getExerciseLabel: (exercises: Exercise[], index: number) => string;
}

export const DroppableDayColumn = ({
  day,
  workouts,
  onCreateWorkout,
  onAddExercise,
  onDuplicateWorkout,
  onRepeatWorkout,
  onDeleteWorkout,
  onEditExercise,
  onDeleteExercise,
  onMoveExercise,
  onLinkWithAbove,
  onUnlinkExercise,
  getExerciseLabel,
}: DroppableDayColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${day}`,
    data: { day },
  });

  const workoutIds = workouts.map(w => w.id);

  return (
    <div
      ref={setNodeRef}
      className={`border-r border-border last:border-r-0 min-h-[400px] p-2 space-y-2 transition-colors ${
        isOver ? 'bg-primary/5' : ''
      }`}
    >
      <SortableContext items={workoutIds} strategy={verticalListSortingStrategy}>
        {workouts.length === 0 ? (
          <button
            onClick={onCreateWorkout}
            className="w-full py-6 text-xs text-primary hover:text-primary/80 border border-dashed border-border rounded-lg hover:border-primary/50 transition-colors"
          >
            <Plus className="w-4 h-4 mx-auto mb-1" />
            CREATE SESSION
          </button>
        ) : (
          workouts.map((workout) => (
            <DraggableWorkoutCard
              key={workout.id}
              workout={workout}
              onAddExercise={() => onAddExercise(workout.id)}
              onDuplicate={() => onDuplicateWorkout(workout.id)}
              onRepeat={() => onRepeatWorkout(workout.id)}
              onDelete={() => onDeleteWorkout(workout.id)}
              onEditExercise={onEditExercise}
              onDeleteExercise={onDeleteExercise}
              onMoveExercise={(exerciseId, direction) => onMoveExercise(exerciseId, workout.id, direction)}
              onLinkWithAbove={(exerciseId) => onLinkWithAbove(exerciseId, workout.id)}
              onUnlinkExercise={(exerciseId) => onUnlinkExercise(exerciseId, workout.id)}
              getExerciseLabel={getExerciseLabel}
            />
          ))
        )}
      </SortableContext>
    </div>
  );
};
