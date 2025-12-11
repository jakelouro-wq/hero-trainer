import { Clock, Flame, Target, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import ExerciseItem from "./ExerciseItem";

interface Exercise {
  name: string;
  sets: number;
  reps: string;
  weight?: string;
  notes?: string;
  completed?: boolean;
}

interface WorkoutCardProps {
  title: string;
  subtitle: string;
  duration: string;
  calories: string;
  focus: string;
  exercises: Exercise[];
  progress: number;
}

const WorkoutCard = ({ title, subtitle, duration, calories, focus, exercises, progress }: WorkoutCardProps) => {
  return (
    <div className="card-gradient rounded-2xl border border-border overflow-hidden opacity-0 animate-scale-in" style={{ animationDelay: "200ms" }}>
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-primary text-sm font-medium uppercase tracking-wider mb-1">{subtitle}</p>
            <h3 className="text-2xl font-bold text-foreground">{title}</h3>
          </div>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold glow">
            Start Workout
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
        
        {/* Stats Row */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span className="text-sm">{duration}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Flame className="w-4 h-4 text-orange-500" />
            <span className="text-sm">{calories}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Target className="w-4 h-4 text-primary" />
            <span className="text-sm">{focus}</span>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">Progress</span>
            <span className="text-primary font-medium">{progress}%</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary to-orange-400 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
      
      {/* Exercises List */}
      <div className="p-6 space-y-3">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Exercises ({exercises.length})
        </h4>
        {exercises.map((exercise, index) => (
          <ExerciseItem
            key={index}
            {...exercise}
            delay={300 + index * 100}
          />
        ))}
      </div>
    </div>
  );
};

export default WorkoutCard;
