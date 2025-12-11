import { CheckCircle2, Circle, PlayCircle } from "lucide-react";
import { useState } from "react";

interface ExerciseItemProps {
  name: string;
  sets: number;
  reps: string;
  weight?: string;
  notes?: string;
  completed?: boolean;
  delay?: number;
}

const ExerciseItem = ({ name, sets, reps, weight, notes, completed = false, delay = 0 }: ExerciseItemProps) => {
  const [isCompleted, setIsCompleted] = useState(completed);

  return (
    <div 
      className={`p-4 rounded-lg border transition-all duration-300 opacity-0 animate-slide-in-right cursor-pointer group ${
        isCompleted 
          ? "bg-primary/5 border-primary/30" 
          : "bg-secondary/50 border-border hover:border-primary/30"
      }`}
      style={{ animationDelay: `${delay}ms` }}
      onClick={() => setIsCompleted(!isCompleted)}
    >
      <div className="flex items-start gap-4">
        <button className="mt-1 transition-transform group-hover:scale-110">
          {isCompleted ? (
            <CheckCircle2 className="w-6 h-6 text-primary" />
          ) : (
            <Circle className="w-6 h-6 text-muted-foreground" />
          )}
        </button>
        
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h4 className={`font-semibold ${isCompleted ? "text-muted-foreground line-through" : "text-foreground"}`}>
              {name}
            </h4>
            <PlayCircle className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
          </div>
          
          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted-foreground">
              <span className="text-foreground font-medium">{sets}</span> sets
            </span>
            <span className="text-muted-foreground">
              <span className="text-foreground font-medium">{reps}</span> reps
            </span>
            {weight && (
              <span className="text-primary font-medium">{weight}</span>
            )}
          </div>
          
          {notes && (
            <p className="text-xs text-muted-foreground mt-2 italic">{notes}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExerciseItem;
