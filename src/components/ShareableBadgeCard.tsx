import { forwardRef } from "react";
import { format } from "date-fns";
import { Trophy, Flame, Dumbbell, Target, Zap, Crown } from "lucide-react";
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
    const getCategoryGradient = (category: string) => {
      switch (category) {
        case "streak":
          return {
            bg: "linear-gradient(135deg, #FF6B35 0%, #F7C948 50%, #FF6B35 100%)",
            glow: "#FF6B35",
            accent: "#F7C948",
          };
        case "weight":
          return {
            bg: "linear-gradient(135deg, #667EEA 0%, #764BA2 50%, #667EEA 100%)",
            glow: "#667EEA",
            accent: "#A78BFA",
          };
        case "workouts":
          return {
            bg: "linear-gradient(135deg, #11998E 0%, #38EF7D 50%, #11998E 100%)",
            glow: "#38EF7D",
            accent: "#6EE7B7",
          };
        default:
          return {
            bg: "linear-gradient(135deg, #3B82F6 0%, #06B6D4 50%, #3B82F6 100%)",
            glow: "#3B82F6",
            accent: "#67E8F9",
          };
      }
    };

    const getCategoryIcon = (category: string) => {
      switch (category) {
        case "streak":
          return <Flame className="w-8 h-8" />;
        case "weight":
          return <Dumbbell className="w-8 h-8" />;
        case "workouts":
          return <Target className="w-8 h-8" />;
        default:
          return <Trophy className="w-8 h-8" />;
      }
    };

    const getRelevantStat = () => {
      switch (badge.category) {
        case "streak":
          return stats?.currentStreak 
            ? { value: stats.currentStreak.toString(), label: "Week Streak" }
            : null;
        case "weight":
          return stats?.totalWeightLifted 
            ? { value: stats.totalWeightLifted.toLocaleString(), label: "lbs Lifted" }
            : null;
        case "workouts":
          return stats?.totalWorkouts 
            ? { value: stats.totalWorkouts.toString(), label: "Workouts" }
            : null;
        default:
          return null;
      }
    };

    const colors = getCategoryGradient(badge.category);
    const relevantStat = getRelevantStat();

    return (
      <div
        ref={ref}
        className="w-[400px] h-[520px] relative overflow-hidden"
        style={{ 
          fontFamily: "'Montserrat', 'Inter', system-ui, sans-serif",
          background: "linear-gradient(180deg, #0A0A0F 0%, #12121A 50%, #0A0A0F 100%)",
          borderRadius: "24px",
        }}
      >
        {/* Animated background mesh */}
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `
              radial-gradient(circle at 20% 20%, ${colors.glow}40 0%, transparent 50%),
              radial-gradient(circle at 80% 80%, ${colors.accent}30 0%, transparent 50%),
              radial-gradient(circle at 50% 50%, ${colors.glow}20 0%, transparent 60%)
            `,
          }}
        />

        {/* Grid pattern overlay */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `
              linear-gradient(${colors.glow}20 1px, transparent 1px),
              linear-gradient(90deg, ${colors.glow}20 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
          }}
        />

        {/* Glowing orb behind badge */}
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full blur-[80px]"
          style={{ background: colors.glow, opacity: 0.3 }}
        />

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between px-6 pt-5">
          <img src={louroLogo} alt="Louro" className="h-8 object-contain" />
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 backdrop-blur-sm border border-white/10">
            <Zap className="w-3.5 h-3.5" style={{ color: colors.accent }} />
            <span className="text-white/80 text-xs font-medium">@LouroTraining</span>
          </div>
        </div>

        {/* Main content */}
        <div className="relative z-10 flex flex-col items-center justify-center h-[calc(100%-120px)] px-6">
          
          {/* Badge icon with glow ring */}
          <div className="relative mb-6">
            {/* Outer glow ring */}
            <div 
              className="absolute inset-0 rounded-full blur-xl opacity-60"
              style={{ 
                background: colors.bg,
                transform: "scale(1.3)",
              }}
            />
            
            {/* Main badge circle */}
            <div 
              className="relative w-32 h-32 rounded-full flex items-center justify-center shadow-2xl"
              style={{ 
                background: colors.bg,
                boxShadow: `0 0 60px ${colors.glow}60, inset 0 2px 4px rgba(255,255,255,0.2)`,
              }}
            >
              {/* Inner highlight */}
              <div className="absolute inset-2 rounded-full bg-gradient-to-br from-white/20 to-transparent" />
              
              {/* Icon or emoji */}
              <span className="text-6xl relative z-10 drop-shadow-lg">
                {badge.icon_url}
              </span>
            </div>

            {/* Decorative particles */}
            <div className="absolute -top-2 -right-2 w-4 h-4 rounded-full" style={{ background: colors.accent, boxShadow: `0 0 12px ${colors.accent}` }} />
            <div className="absolute -bottom-1 -left-3 w-3 h-3 rounded-full opacity-80" style={{ background: colors.glow, boxShadow: `0 0 10px ${colors.glow}` }} />
            <div className="absolute top-1/2 -right-4 w-2 h-2 rounded-full opacity-60" style={{ background: colors.accent }} />
          </div>

          {/* Achievement label */}
          <div 
            className="flex items-center gap-2 px-4 py-1.5 rounded-full mb-4"
            style={{ 
              background: `linear-gradient(90deg, ${colors.glow}20, ${colors.accent}20)`,
              border: `1px solid ${colors.glow}40`,
            }}
          >
            <Crown className="w-4 h-4" style={{ color: colors.accent }} />
            <span 
              className="text-xs font-bold uppercase tracking-[0.2em]"
              style={{ color: colors.accent }}
            >
              Achievement Unlocked
            </span>
            <Crown className="w-4 h-4" style={{ color: colors.accent }} />
          </div>

          {/* Badge name */}
          <h2 
            className="text-3xl font-black text-center mb-2 tracking-tight"
            style={{ 
              color: "#fff",
              textShadow: `0 0 40px ${colors.glow}60`,
            }}
          >
            {badge.name}
          </h2>

          {/* Description */}
          <p className="text-white/50 text-sm text-center max-w-[280px] leading-relaxed mb-5">
            {badge.description}
          </p>

          {/* Stat card */}
          {relevantStat && (
            <div 
              className="flex items-center gap-4 px-6 py-3 rounded-2xl"
              style={{ 
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                backdropFilter: "blur(10px)",
              }}
            >
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: `${colors.glow}20` }}
              >
                <span style={{ color: colors.accent }}>{getCategoryIcon(badge.category)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-black text-white">{relevantStat.value}</span>
                <span className="text-xs text-white/40 uppercase tracking-wider">{relevantStat.label}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 z-10">
          <div 
            className="flex items-center justify-between px-6 py-4"
            style={{ 
              background: "linear-gradient(180deg, transparent, rgba(0,0,0,0.6))",
            }}
          >
            <span className="text-white/30 text-xs font-medium">
              {format(earnedAt, "MMM d, yyyy")}
            </span>
            <div className="flex items-center gap-1">
              <span className="text-white/40 text-xs">Train with purpose</span>
              <span className="text-white/20">•</span>
              <span 
                className="text-xs font-semibold"
                style={{ color: colors.accent }}
              >
                louro.app
              </span>
            </div>
          </div>
        </div>

        {/* Corner accents */}
        <div 
          className="absolute top-0 right-0 w-32 h-32 opacity-20"
          style={{ 
            background: `radial-gradient(circle at top right, ${colors.accent}, transparent 70%)`,
          }}
        />
        <div 
          className="absolute bottom-0 left-0 w-24 h-24 opacity-15"
          style={{ 
            background: `radial-gradient(circle at bottom left, ${colors.glow}, transparent 70%)`,
          }}
        />
      </div>
    );
  }
);

ShareableBadgeCard.displayName = "ShareableBadgeCard";

export default ShareableBadgeCard;
