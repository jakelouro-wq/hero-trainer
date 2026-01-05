import { useDroppable } from "@dnd-kit/core";
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
  daysPerWeek: number;
  workouts: Workout[];
  onCreateWorkout: () => void;
  onAddExercise: (workoutId: string) => void;
  onEditWorkout: (workoutId: string) => void;
  onDuplicateWorkout: (workoutId: string) => void;
  onRepeatWorkout: (workoutId: string) => void;
  onDeleteWorkout: (workoutId: string) => void;
  onChangeWorkoutDay: (workoutId: string, newDay: number) => void;
  onEditExercise: (exercise: Exercise) => void;
  onDeleteExercise: (exerciseId: string) => void;
  onMoveExercise: (exerciseId: string, workoutId: string, direction: 'up' | 'down') => void;
  onLinkWithAbove: (exerciseId: string, workoutId: string) => void;
  onUnlinkExercise: (exerciseId: string, workoutId: string) => void;
  getExerciseLabel: (exercises: Exercise[], index: number) => string;
}

export const DroppableDayColumn = ({
  day,
  daysPerWeek,
  workouts,
  onCreateWorkout,
  onAddExercise,
  onEditWorkout,
  onDuplicateWorkout,
  onRepeatWorkout,
  onDeleteWorkout,
  onChangeWorkoutDay,
  onEditExercise,
  onDeleteExercise,
  onMoveExercise,
  onLinkWithAbove,
  onUnlinkExercise,
  getExerciseLabel,
}: DroppableDayColumnProps) => {
  const dayNames = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  const { setNodeRef, isOver } = useDroppable({
    id: `day-${day}`,
    data: { day },
  });

  const dayLabel = dayNames[day - 1] ?? `Day ${day}`;

  return (
    <div
      ref={setNodeRef}
      className={`border-r border-border last:border-r-0 min-h-[400px] p-2 transition-colors ${
        isOver ? "bg-primary/10 border-primary" : ""
      }`}
    >
      <div className="pb-2">
        <div className="rounded-md border border-border bg-card px-2 py-2 text-center">
          <div className="text-xs font-semibold text-foreground">{dayLabel}</div>
        </div>
      </div>

      <div className="space-y-2">
        {workouts.length === 0 ? (
          <button
            onClick={onCreateWorkout}
            className="w-full py-6 text-xs text-primary hover:text-primary/80 border border-dashed border-border rounded-lg hover:border-primary/50 transition-colors"
          >
            <Plus className="w-4 h-4 mx-auto mb-1" />
            CREATE SESSION
          </button>
        ) : (
          <>
            {workouts.map((workout) => (
              <DraggableWorkoutCard
                key={workout.id}
                workout={workout}
                currentDay={day}
                daysPerWeek={daysPerWeek}
                onAddExercise={() => onAddExercise(workout.id)}
                onEditWorkout={() => onEditWorkout(workout.id)}
                onDuplicate={() => onDuplicateWorkout(workout.id)}
                onRepeat={() => onRepeatWorkout(workout.id)}
                onDelete={() => onDeleteWorkout(workout.id)}
                onChangeDay={(newDay) => onChangeWorkoutDay(workout.id, newDay)}
                onEditExercise={onEditExercise}
                onDeleteExercise={onDeleteExercise}
                onMoveExercise={(exerciseId, direction) =>
                  onMoveExercise(exerciseId, workout.id, direction)
                }
                onLinkWithAbove={(exerciseId) => onLinkWithAbove(exerciseId, workout.id)}
                onUnlinkExercise={(exerciseId) => onUnlinkExercise(exerciseId, workout.id)}
                getExerciseLabel={getExerciseLabel}
              />
            ))}
            <button
              onClick={onCreateWorkout}
              className="w-full py-3 text-xs text-muted-foreground hover:text-primary border border-dashed border-border rounded-lg hover:border-primary/50 transition-colors"
            >
              <Plus className="w-3 h-3 mx-auto" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};
