import { forwardRef } from "react";
import { format } from "date-fns";
import { Clock, Dumbbell, Flame } from "lucide-react";
import louroLogo from "@/assets/louro-logo.png";

interface ShareableWorkoutCardProps {
  workoutName: string;
  date: Date;
  duration: string;
  totalWeight: number;
  intensityRating: number;
}

const ShareableWorkoutCard = forwardRef<HTMLDivElement, ShareableWorkoutCardProps>(
  ({ workoutName, date, duration, totalWeight, intensityRating }, ref) => {
    const getIntensityColor = (value: number) => {
      if (value <= 3) return "#22c55e"; // green
      if (value <= 5) return "#eab308"; // yellow
      if (value <= 7) return "#f97316"; // orange
      return "#ef4444"; // red
    };

    return (
      <div
        ref={ref}
        className="w-[400px] h-[500px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 flex flex-col relative overflow-hidden"
        style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
      >
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        {/* Header with Logo */}
        <div className="flex items-center justify-between mb-6 relative z-10">
          <img src={louroLogo} alt="Louro" className="h-10 object-contain" />
          <span className="text-slate-400 text-sm">@LouroTraining</span>
        </div>

        {/* Workout Name */}
        <div className="relative z-10 mb-4">
          <p className="text-primary text-sm font-medium uppercase tracking-wider mb-1">Workout Complete</p>
          <h2 className="text-white text-2xl font-bold">{workoutName}</h2>
          <p className="text-slate-400 text-sm mt-1">{format(date, "EEEE, MMMM d, yyyy")}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6 relative z-10 flex-1">
          {/* Duration */}
          <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-primary" />
              <span className="text-slate-400 text-xs uppercase tracking-wider">Duration</span>
            </div>
            <p className="text-white text-2xl font-bold">{duration}</p>
          </div>

          {/* Weight Lifted */}
          <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <Dumbbell className="w-4 h-4 text-primary" />
              <span className="text-slate-400 text-xs uppercase tracking-wider">Weight</span>
            </div>
            <p className="text-white text-2xl font-bold">{totalWeight.toLocaleString()}</p>
            <p className="text-slate-400 text-xs">lbs lifted</p>
          </div>

          {/* Intensity */}
          <div className="col-span-2 bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <Flame className="w-4 h-4" style={{ color: getIntensityColor(intensityRating) }} />
              <span className="text-slate-400 text-xs uppercase tracking-wider">Intensity</span>
            </div>
            <div className="flex items-center gap-4">
              <p 
                className="text-4xl font-bold"
                style={{ color: getIntensityColor(intensityRating) }}
              >
                {intensityRating}/10
              </p>
              <div className="flex gap-1 flex-1">
                {Array.from({ length: 10 }, (_, i) => (
                  <div
                    key={i}
                    className="h-3 flex-1 rounded-full transition-colors"
                    style={{
                      backgroundColor: i < intensityRating 
                        ? getIntensityColor(intensityRating) 
                        : "rgba(255,255,255,0.1)"
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-center">
          <p className="text-slate-500 text-xs">Train with purpose • @LouroTraining</p>
        </div>
      </div>
    );
  }
);

ShareableWorkoutCard.displayName = "ShareableWorkoutCard";

export default ShareableWorkoutCard;
