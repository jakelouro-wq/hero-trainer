import { useState, useEffect, useMemo } from "react";
import { Circle, CheckCircle2, Minus, Plus, Play, ChevronRight, Timer, ChevronDown, Trophy } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import RestTimer from "./RestTimer";
import { usePersonalRecords } from "@/hooks/usePersonalRecords";

interface SetData {
  reps: string;
  weight: string;
  completed: boolean;
}

interface LastWorkoutData {
  sets: number;
  reps: string;
  weight: string | null;
}

export interface CompletedSetData {
  reps: string;
  weight: string;
}

interface ExerciseData {
  id: string;
  name: string;
  sets: number;
  reps: string;
  weight: string | null;
  notes: string | null;
  videoUrl: string | null;
  restSeconds: number | null;
  rir: string | null;
  label: string;
  lastWorkout: LastWorkoutData | null;
}

interface ExerciseGroupCardProps {
  exercises: ExerciseData[];
  groupLabel: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onComplete: (exerciseId: string, allSetsCompleted: boolean, completedSets: CompletedSetData[]) => void;
}

interface ExerciseState {
  setsData: SetData[];
  exerciseNote: string;
}

const ExerciseGroupCard = ({
  exercises,
  groupLabel,
  isExpanded,
  onToggleExpand,
  onComplete,
}: ExerciseGroupCardProps) => {
  const { getPRForExercise } = usePersonalRecords();
  const [exerciseStates, setExerciseStates] = useState<Record<string, ExerciseState>>(() => {
    const initial: Record<string, ExerciseState> = {};
    exercises.forEach((ex) => {
      initial[ex.id] = {
        setsData: Array.from({ length: ex.sets }, () => ({
          reps: "",
          weight: "",
          completed: false,
        })),
        exerciseNote: "",
      };
    });
    return initial;
  });
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [activeRestSeconds, setActiveRestSeconds] = useState<number>(60);

  const isSuperset = exercises.length > 1;
  
  // Report completed sets to parent via useEffect to avoid setState during render
  useEffect(() => {
    exercises.forEach((ex) => {
      const state = exerciseStates[ex.id];
      if (state) {
        const allCompleted = state.setsData.every((set) => set.completed);
        const completedSets = state.setsData
          .filter((s) => s.completed)
          .map((s) => ({ reps: s.reps, weight: s.weight }));
        onComplete(ex.id, allCompleted, completedSets);
      }
    });
  }, [exerciseStates]);
  
  const allGroupCompleted = exercises.every((ex) =>
    exerciseStates[ex.id]?.setsData.every((set) => set.completed)
  );

  const toggleSetComplete = (exerciseId: string, index: number) => {
    setExerciseStates((prev) => {
      const exerciseState = prev[exerciseId];
      const updated = [...exerciseState.setsData];
      updated[index] = { ...updated[index], completed: !updated[index].completed };
      return {
        ...prev,
        [exerciseId]: { ...exerciseState, setsData: updated },
      };
    });
  };

  const updateSetReps = (exerciseId: string, index: number, value: string) => {
    setExerciseStates((prev) => {
      const exerciseState = prev[exerciseId];
      const updated = [...exerciseState.setsData];
      updated[index] = { ...updated[index], reps: value };
      return {
        ...prev,
        [exerciseId]: { ...exerciseState, setsData: updated },
      };
    });
  };

  const updateSetWeight = (exerciseId: string, index: number, value: string) => {
    setExerciseStates((prev) => {
      const exerciseState = prev[exerciseId];
      const updated = [...exerciseState.setsData];
      updated[index] = { ...updated[index], weight: value };
      return {
        ...prev,
        [exerciseId]: { ...exerciseState, setsData: updated },
      };
    });
  };

  const addSet = (exerciseId: string) => {
    setExerciseStates((prev) => ({
      ...prev,
      [exerciseId]: {
        ...prev[exerciseId],
        setsData: [...prev[exerciseId].setsData, { reps: "", weight: "", completed: false }],
      },
    }));
  };

  const removeSet = (exerciseId: string) => {
    setExerciseStates((prev) => {
      if (prev[exerciseId].setsData.length <= 1) return prev;
      return {
        ...prev,
        [exerciseId]: {
          ...prev[exerciseId],
          setsData: prev[exerciseId].setsData.slice(0, -1),
        },
      };
    });
  };

  const markAllComplete = (exerciseId: string) => {
    setExerciseStates((prev) => {
      const exerciseState = prev[exerciseId];
      const allComplete = exerciseState.setsData.every((s) => s.completed);
      const newCompletedState = !allComplete;
      const updated = exerciseState.setsData.map((s) => ({ ...s, completed: newCompletedState }));
      return {
        ...prev,
        [exerciseId]: { ...exerciseState, setsData: updated },
      };
    });
  };

  const getYouTubeId = (url: string) => {
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    return match ? match[1] : null;
  };

  const renderExerciseDetails = (exercise: ExerciseData, isLastInGroup: boolean) => {
    const state = exerciseStates[exercise.id];
    const videoId = exercise.videoUrl ? getYouTubeId(exercise.videoUrl) : null;
    const thumbnailUrl = videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : null;
    const allSetsCompleted = state.setsData.every((set) => set.completed);
    const currentPR = getPRForExercise(exercise.id);

    // Check if any completed set is a new PR
    const getSetPRStatus = (set: SetData) => {
      if (!set.completed) return { isWeightPR: false, isRepsPR: false };
      const weight = parseFloat(set.weight) || 0;
      const reps = parseInt(set.reps) || 0;
      
      if (!currentPR) {
        return { isWeightPR: weight > 0, isRepsPR: false };
      }
      
      return {
        isWeightPR: weight > currentPR.maxWeight,
        isRepsPR: false, // Focus on weight PRs for now
      };
    };

    return (
      <div key={exercise.id} className="mb-6 last:mb-0">
        {/* Exercise Header in expanded view */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
              allSetsCompleted
                ? "border-primary bg-primary/20"
                : "border-muted-foreground/50"
            }`}
          >
            <span
              className={`text-xs font-semibold ${
                allSetsCompleted ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {exercise.label}
            </span>
          </div>
          <h4 className={`font-bold text-base ${allSetsCompleted ? "text-muted-foreground line-through" : "text-foreground"}`}>
            {exercise.name}
          </h4>
        </div>

        {/* Video Thumbnail + Last Workout Section */}
        <div className="flex gap-3 mb-4">
          {thumbnailUrl ? (
            <a
              href={exercise.videoUrl || "#"}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="relative w-24 h-16 rounded-lg overflow-hidden bg-secondary flex-shrink-0 group"
            >
              <img
                src={thumbnailUrl}
                alt={`${exercise.name} video`}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/60 transition-colors">
                <Play className="w-8 h-8 text-white fill-white" />
              </div>
            </a>
          ) : (
            <div className="w-24 h-16 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
              <Play className="w-6 h-6 text-muted-foreground" />
            </div>
          )}

          <div
            className="flex-1 bg-secondary/50 rounded-lg p-3 flex items-center justify-between cursor-pointer hover:bg-secondary/70 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Last</p>
              {exercise.lastWorkout ? (
                <p className="text-primary font-medium text-sm">
                  {exercise.lastWorkout.sets} x {exercise.lastWorkout.reps}
                  {exercise.lastWorkout.weight && ` @ ${exercise.lastWorkout.weight}`}
                </p>
              ) : (
                <p className="text-muted-foreground text-sm">No previous data</p>
              )}
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>

        {/* Coach Notes */}
        {exercise.notes && (
          <div className="mb-4">
            <p className="text-sm text-foreground">{exercise.notes}</p>
          </div>
        )}

        {/* Sets Header */}
        <div className="flex items-center mb-2 gap-2">
          <span className="text-sm font-semibold text-muted-foreground w-8">Sets</span>
          <span className="text-sm font-semibold text-muted-foreground flex-1 text-center">
            Reps
          </span>
          <span className="text-sm font-semibold text-muted-foreground flex-1 text-center">
            Lb
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              markAllComplete(exercise.id);
            }}
            className="w-10 flex justify-center"
          >
            {allSetsCompleted ? (
              <CheckCircle2 className="w-6 h-6 text-primary" />
            ) : (
              <Circle className="w-6 h-6 text-muted-foreground/50" />
            )}
          </button>
        </div>

        {/* Set Rows */}
        <div className="space-y-3">
          {state.setsData.map((set, index) => {
            const prStatus = getSetPRStatus(set);
            const isNewPR = prStatus.isWeightPR;
            
            return (
              <div key={index} className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground w-8 text-center">
                  {index + 1}
                </span>
                <Input
                  type="text"
                  value={set.reps}
                  onChange={(e) => updateSetReps(exercise.id, index, e.target.value)}
                  className="flex-1 bg-secondary border-border text-center h-12 text-foreground"
                  onClick={(e) => e.stopPropagation()}
                  placeholder="Reps"
                />
                <div className="relative flex-1">
                  <Input
                    type="text"
                    value={set.weight}
                    onChange={(e) => updateSetWeight(exercise.id, index, e.target.value)}
                    className={`w-full bg-secondary border-border text-center h-12 text-foreground ${
                      isNewPR ? "border-yellow-500 ring-1 ring-yellow-500/50" : ""
                    }`}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="Lb"
                  />
                  {isNewPR && (
                    <div className="absolute -top-2 -right-2 bg-yellow-500 rounded-full p-1 animate-bounce">
                      <Trophy className="w-3 h-3 text-black" />
                    </div>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSetComplete(exercise.id, index);
                  }}
                  className="w-10 h-10 flex items-center justify-center"
                >
                  <div
                    className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-colors ${
                      set.completed
                        ? isNewPR 
                          ? "border-yellow-500 bg-yellow-500"
                          : "border-primary bg-primary"
                        : "border-primary"
                    }`}
                  >
                    {set.completed && (
                      isNewPR ? (
                        <Trophy className="w-4 h-4 text-black" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5 text-primary-foreground" />
                      )
                    )}
                  </div>
                </button>
              </div>
            );
          })}
        </div>

        {/* Add/Remove Set */}
        <div className="flex items-center justify-center gap-4 mt-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              removeSet(exercise.id);
            }}
            disabled={state.setsData.length <= 1}
            className="w-10 h-10 rounded-full border border-muted-foreground/50 flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Minus className="w-5 h-5" />
          </button>
          <span className="text-sm text-muted-foreground font-medium">Set</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              addSet(exercise.id);
            }}
            className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Rest Timer Button - Only show after last exercise in group */}
        {isLastInGroup && exercise.restSeconds && exercise.restSeconds > 0 && (
          <div className="mt-4">
            <Button
              onClick={(e) => {
                e.stopPropagation();
                setActiveRestSeconds(exercise.restSeconds!);
                setShowRestTimer(true);
              }}
              variant="outline"
              className="w-full border-primary text-primary hover:bg-primary/10"
            >
              <Timer className="w-4 h-4 mr-2" />
              Start Rest Timer ({Math.floor(exercise.restSeconds / 60)}:{(exercise.restSeconds % 60).toString().padStart(2, "0")})
            </Button>
          </div>
        )}

        {/* Add Exercise Note */}
        <div className="mt-4">
          <Input
            type="text"
            placeholder="Add exercise note"
            value={state.exerciseNote}
            onChange={(e) => {
              const value = e.target.value;
              setExerciseStates((prev) => ({
                ...prev,
                [exercise.id]: { ...prev[exercise.id], exerciseNote: value },
              }));
            }}
            className="bg-secondary border-border text-muted-foreground placeholder:text-muted-foreground/50"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="border-b border-border/50 last:border-b-0">
      {/* Collapsed View */}
      <div
        className="py-4 cursor-pointer transition-colors"
        onClick={onToggleExpand}
      >
        <div className="flex items-start gap-4">
          {/* Group Label Circle */}
          <div
            className={`w-10 h-10 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
              allGroupCompleted
                ? "border-primary bg-primary/20"
                : "border-muted-foreground/50"
            }`}
          >
            <span
              className={`text-sm font-semibold ${
                allGroupCompleted ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {groupLabel}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            {exercises.map((exercise, idx) => {
              const state = exerciseStates[exercise.id];
              const allSetsCompleted = state?.setsData.every((set) => set.completed);
              return (
                <div key={exercise.id} className={idx > 0 ? "mt-2" : ""}>
                  <div className="flex items-center gap-2">
                    {isSuperset && (
                      <span className="text-xs font-semibold text-primary">{exercise.label}</span>
                    )}
                    <h3
                      className={`font-bold text-base ${
                        allSetsCompleted ? "text-muted-foreground line-through" : "text-foreground"
                      }`}
                    >
                      {exercise.name}
                    </h3>
                  </div>
                  <p className="text-primary font-medium text-sm">
                    {state?.setsData.length || exercise.sets} sets {exercise.reps && `x ${exercise.reps}`}
                    {exercise.rir && <span className="ml-2 text-muted-foreground">RIR {exercise.rir}</span>}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Completion indicator */}
          <div className="flex-shrink-0 flex items-center gap-2">
            {isSuperset && (
              <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
            )}
            {allGroupCompleted ? (
              <CheckCircle2 className="w-6 h-6 text-primary" />
            ) : (
              <Circle className="w-6 h-6 text-muted-foreground/50" />
            )}
          </div>
        </div>
      </div>

      {/* Expanded View */}
      {isExpanded && (
        <div className="pb-6 px-2 animate-fade-in">
          {/* Progress bar */}
          <div className="h-1 bg-primary rounded-full mb-4" />

          {isSuperset && (
            <div className="mb-4 px-3 py-2 bg-secondary/30 rounded-lg">
              <p className="text-xs font-semibold text-primary uppercase tracking-wider">
                Superset • {exercises.length} exercises
              </p>
            </div>
          )}

          {exercises.map((exercise, index) => renderExerciseDetails(exercise, index === exercises.length - 1))}
        </div>
      )}

      {/* Rest Timer Modal */}
      {showRestTimer && (
        <RestTimer restSeconds={activeRestSeconds} onClose={() => setShowRestTimer(false)} />
      )}
    </div>
  );
};

export default ExerciseGroupCard;
