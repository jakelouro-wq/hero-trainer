import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Flame } from "lucide-react";

interface WorkoutCompletionDialogProps {
  isOpen: boolean;
  onComplete: (intensityRating: number) => void;
  onCancel: () => void;
  workoutName: string;
  duration: string;
  totalWeight: number;
}

const intensityLabels = [
  "", // 0 - not used
  "Very Light",
  "Light", 
  "Moderate",
  "Somewhat Hard",
  "Hard",
  "Very Hard",
  "Very Very Hard",
  "Extremely Hard",
  "Maximum Effort",
  "Absolute Max",
];

const WorkoutCompletionDialog = ({
  isOpen,
  onComplete,
  onCancel,
  workoutName,
  duration,
  totalWeight,
}: WorkoutCompletionDialogProps) => {
  const [intensity, setIntensity] = useState(5);

  const getIntensityColor = (value: number) => {
    if (value <= 3) return "text-green-500";
    if (value <= 5) return "text-yellow-500";
    if (value <= 7) return "text-orange-500";
    return "text-red-500";
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground text-xl flex items-center gap-2">
            <Flame className="w-5 h-5 text-primary" />
            Great Work!
          </DialogTitle>
          <DialogDescription>
            You completed <span className="font-semibold text-foreground">{workoutName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Workout Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-secondary/50 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Duration</p>
              <p className="text-lg font-bold text-foreground">{duration}</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Weight Lifted</p>
              <p className="text-lg font-bold text-foreground">{totalWeight.toLocaleString()} lbs</p>
            </div>
          </div>

          {/* Intensity Rating */}
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">How hard was this workout?</p>
              <p className={`text-3xl font-bold ${getIntensityColor(intensity)}`}>
                {intensity}
              </p>
              <p className={`text-sm font-medium ${getIntensityColor(intensity)}`}>
                {intensityLabels[intensity]}
              </p>
            </div>

            <div className="px-2">
              <Slider
                value={[intensity]}
                onValueChange={(value) => setIntensity(value[0])}
                min={1}
                max={10}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>Easy</span>
                <span>Max Effort</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            className="flex-1 bg-primary hover:bg-primary/90"
            onClick={() => onComplete(intensity)}
          >
            Complete & Share
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WorkoutCompletionDialog;
