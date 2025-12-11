import { useState } from "react";
import { Circle, CheckCircle2, Minus, Plus, Play, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";

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

interface ExerciseDetailCardProps {
  id: string;
  name: string;
  sets: number;
  reps: string;
  weight: string | null;
  notes: string | null;
  videoUrl: string | null;
  label: string;
  isExpanded: boolean;
  lastWorkout: LastWorkoutData | null;
  onToggleExpand: () => void;
  onComplete: (allSetsCompleted: boolean) => void;
}

const ExerciseDetailCard = ({
  id,
  name,
  sets,
  reps,
  weight,
  notes,
  videoUrl,
  label,
  isExpanded,
  lastWorkout,
  onToggleExpand,
  onComplete,
}: ExerciseDetailCardProps) => {
  const [setsData, setSetsData] = useState<SetData[]>(() =>
    Array.from({ length: sets }, () => ({
      reps: reps,
      weight: weight || "",
      completed: false,
    }))
  );
  const [exerciseNote, setExerciseNote] = useState("");

  const allSetsCompleted = setsData.every((set) => set.completed);

  const toggleSetComplete = (index: number) => {
    setSetsData((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], completed: !updated[index].completed };
      const allCompleted = updated.every((set) => set.completed);
      onComplete(allCompleted);
      return updated;
    });
  };

  const updateSetReps = (index: number, value: string) => {
    setSetsData((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], reps: value };
      return updated;
    });
  };

  const updateSetWeight = (index: number, value: string) => {
    setSetsData((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], weight: value };
      return updated;
    });
  };

  const addSet = () => {
    setSetsData((prev) => [...prev, { reps: reps, weight: weight || "", completed: false }]);
  };

  const removeSet = () => {
    if (setsData.length > 1) {
      setSetsData((prev) => prev.slice(0, -1));
    }
  };

  const markAllComplete = () => {
    const allComplete = setsData.every((s) => s.completed);
    setSetsData((prev) => prev.map((s) => ({ ...s, completed: !allComplete })));
    onComplete(!allComplete);
  };

  // Extract YouTube video ID from URL
  const getYouTubeId = (url: string) => {
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    return match ? match[1] : null;
  };

  const videoId = videoUrl ? getYouTubeId(videoUrl) : null;
  const thumbnailUrl = videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : null;

  return (
    <div className="border-b border-border/50 last:border-b-0">
      {/* Collapsed View */}
      <div
        className="py-4 cursor-pointer transition-colors"
        onClick={onToggleExpand}
      >
        <div className="flex items-start gap-4">
          {/* Letter Label Circle */}
          <div
            className={`w-10 h-10 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
              allSetsCompleted
                ? "border-primary bg-primary/20"
                : "border-muted-foreground/50"
            }`}
          >
            <span
              className={`text-sm font-semibold ${
                allSetsCompleted ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {label}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <h3
              className={`font-bold text-base ${
                allSetsCompleted ? "text-muted-foreground line-through" : "text-foreground"
              }`}
            >
              {name}
            </h3>

            <p className="text-primary font-medium text-sm mt-1">
              {setsData.length} x {reps}
              {weight && ` @ ${weight}`}
            </p>
          </div>

          {/* Completion indicator */}
          <div className="flex-shrink-0">
            {allSetsCompleted ? (
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

          {/* Video Thumbnail + Last Workout Section */}
          <div className="flex gap-3 mb-4">
            {/* Video Thumbnail */}
            {thumbnailUrl ? (
              <a
                href={videoUrl || "#"}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="relative w-24 h-16 rounded-lg overflow-hidden bg-secondary flex-shrink-0 group"
              >
                <img
                  src={thumbnailUrl}
                  alt={`${name} video`}
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

            {/* Last Workout Info */}
            <div
              className="flex-1 bg-secondary/50 rounded-lg p-3 flex items-center justify-between cursor-pointer hover:bg-secondary/70 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Last</p>
                {lastWorkout ? (
                  <p className="text-primary font-medium text-sm">
                    {lastWorkout.sets} x {lastWorkout.reps}
                    {lastWorkout.weight && ` @ ${lastWorkout.weight}`}
                  </p>
                ) : (
                  <p className="text-muted-foreground text-sm">No previous data</p>
                )}
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </div>

          {/* Coach Notes */}
          {notes && (
            <div className="mb-4">
              <p className="text-sm text-foreground">{notes}</p>
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
                markAllComplete();
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
            {setsData.map((set, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground w-8 text-center">
                  {index + 1}
                </span>
                <Input
                  type="text"
                  value={set.reps}
                  onChange={(e) => updateSetReps(index, e.target.value)}
                  className="flex-1 bg-secondary border-border text-center h-12 text-foreground"
                  onClick={(e) => e.stopPropagation()}
                  placeholder="Reps"
                />
                <Input
                  type="text"
                  value={set.weight}
                  onChange={(e) => updateSetWeight(index, e.target.value)}
                  className="flex-1 bg-secondary border-border text-center h-12 text-foreground"
                  onClick={(e) => e.stopPropagation()}
                  placeholder="Lb"
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSetComplete(index);
                  }}
                  className="w-10 h-10 flex items-center justify-center"
                >
                  <div
                    className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-colors ${
                      set.completed
                        ? "border-primary bg-primary"
                        : "border-primary"
                    }`}
                  >
                    {set.completed && (
                      <CheckCircle2 className="w-5 h-5 text-primary-foreground" />
                    )}
                  </div>
                </button>
              </div>
            ))}
          </div>

          {/* Add/Remove Set */}
          <div className="flex items-center justify-center gap-4 mt-4">
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeSet();
              }}
              disabled={setsData.length <= 1}
              className="w-10 h-10 rounded-full border border-muted-foreground/50 flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Minus className="w-5 h-5" />
            </button>
            <span className="text-sm text-muted-foreground font-medium">Set</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                addSet();
              }}
              className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {/* Add Exercise Note */}
          <div className="mt-4">
            <Input
              type="text"
              placeholder="Add exercise note"
              value={exerciseNote}
              onChange={(e) => setExerciseNote(e.target.value)}
              className="bg-secondary border-border text-muted-foreground placeholder:text-muted-foreground/50"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ExerciseDetailCard;
