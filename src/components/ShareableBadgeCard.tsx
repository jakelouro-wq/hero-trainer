import { forwardRef } from "react";
import { format } from "date-fns";
import { Trophy, Flame, Dumbbell, Target } from "lucide-react";
import louroLogo from "@/assets/louro-logo.png";
import type { Badge } from "@/hooks/useBadges";

interface ShareableBadgeCardProps {
  badge: Badge;
  earnedAt: Date;
  stats?: {
    totalWorkouts?: number;
    totalWeightLifted?: number;
    currentStreak?: number;
  };
}

const ShareableBadgeCard = forwardRef<HTMLDivElement, ShareableBadgeCardProps>(
  ({ badge, earnedAt, stats }, ref) => {
    const getCategoryColor = (category: string) => {
      switch (category) {
        case "streak":
          return "from-orange-500 to-red-500";
        case "weight":
          return "from-blue-500 to-cyan-500";
        case "workouts":
          return "from-green-500 to-emerald-500";
        default:
          return "from-purple-500 to-pink-500";
      }
    };

    const getCategoryIcon = (category: string) => {
      switch (category) {
        case "streak":
          return <Flame className="w-6 h-6" />;
        case "weight":
          return <Dumbbell className="w-6 h-6" />;
        case "workouts":
          return <Target className="w-6 h-6" />;
        default:
          return <Trophy className="w-6 h-6" />;
      }
    };

    const getRelevantStat = () => {
      switch (badge.category) {
        case "streak":
          return stats?.currentStreak 
            ? `${stats.currentStreak} Week Streak` 
            : null;
        case "weight":
          return stats?.totalWeightLifted 
            ? `${stats.totalWeightLifted.toLocaleString()} lbs Lifted Total` 
            : null;
        case "workouts":
          return stats?.totalWorkouts 
            ? `${stats.totalWorkouts} Workouts Completed` 
            : null;
        default:
          return null;
      }
    };

    const relevantStat = getRelevantStat();

    return (
      <div
        ref={ref}
        className="w-[400px] h-[500px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 flex flex-col relative overflow-hidden"
        style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
      >
        {/* Background decoration */}
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />

        {/* Header with Logo */}
        <div className="flex items-center justify-between mb-8 relative z-10">
          <img src={louroLogo} alt="Louro" className="h-10 object-contain" />
          <span className="text-slate-400 text-sm">@LouroTraining</span>
        </div>

        {/* Badge Icon */}
        <div className="flex-1 flex flex-col items-center justify-center relative z-10">
          <div className="mb-4">
            <div
              className={`w-28 h-28 rounded-full flex items-center justify-center text-6xl bg-gradient-to-br ${getCategoryColor(badge.category)} shadow-lg shadow-primary/20`}
            >
              <span className="drop-shadow-lg">{badge.icon_url}</span>
            </div>
          </div>

          {/* Achievement Unlocked */}
          <div className="text-center mb-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Trophy className="w-4 h-4 text-yellow-500" />
              <span className="text-yellow-500 text-sm font-medium uppercase tracking-wider">
                Achievement Unlocked
              </span>
              <Trophy className="w-4 h-4 text-yellow-500" />
            </div>
            <h2 className="text-white text-2xl font-bold mb-2">{badge.name}</h2>
            <p className="text-slate-400 text-sm max-w-[280px]">{badge.description}</p>
          </div>

          {/* Earned Date */}
          <p className="text-primary text-sm font-medium">
            Earned {format(earnedAt, "MMMM d, yyyy")}
          </p>

          {/* Relevant Stat */}
          {relevantStat && (
            <div className="mt-4 bg-white/5 backdrop-blur rounded-xl px-4 py-2 border border-white/10 flex items-center gap-2">
              {getCategoryIcon(badge.category)}
              <span className="text-white text-sm font-medium">{relevantStat}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="relative z-10 text-center">
          <p className="text-slate-500 text-xs">Train with purpose • @LouroTraining</p>
        </div>
      </div>
    );
  }
);

ShareableBadgeCard.displayName = "ShareableBadgeCard";

export default ShareableBadgeCard;
