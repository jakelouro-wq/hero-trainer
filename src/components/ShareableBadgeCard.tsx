import { forwardRef } from "react";
import { format } from "date-fns";
import { Flame, Dumbbell, Target, Trophy } from "lucide-react";
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
    const getCategoryTheme = (category: string) => {
      switch (category) {
        case "streak":
          return {
            gradient: "linear-gradient(145deg, #FF512F 0%, #DD2476 50%, #FF512F 100%)",
            bgGradient: "linear-gradient(135deg, #1a0a0f 0%, #2d1015 30%, #1a0505 100%)",
            accent: "#FF512F",
            secondary: "#DD2476",
            glow: "rgba(255, 81, 47, 0.4)",
          };
        case "weight":
          return {
            gradient: "linear-gradient(145deg, #667EEA 0%, #764BA2 50%, #F093FB 100%)",
            bgGradient: "linear-gradient(135deg, #0f0a1a 0%, #1a1030 30%, #0d0515 100%)",
            accent: "#667EEA",
            secondary: "#764BA2",
            glow: "rgba(102, 126, 234, 0.4)",
          };
        case "workouts":
          return {
            gradient: "linear-gradient(145deg, #11998E 0%, #38EF7D 50%, #11998E 100%)",
            bgGradient: "linear-gradient(135deg, #051510 0%, #0a2520 30%, #051208 100%)",
            accent: "#38EF7D",
            secondary: "#11998E",
            glow: "rgba(56, 239, 125, 0.4)",
          };
        default:
          return {
            gradient: "linear-gradient(145deg, #00D4FF 0%, #0066FF 50%, #00D4FF 100%)",
            bgGradient: "linear-gradient(135deg, #050a15 0%, #0a1530 30%, #050815 100%)",
            accent: "#00D4FF",
            secondary: "#0066FF",
            glow: "rgba(0, 212, 255, 0.4)",
          };
      }
    };

    const getCategoryIcon = (category: string) => {
      const iconClass = "w-12 h-12 drop-shadow-lg";
      switch (category) {
        case "streak":
          return <Flame className={iconClass} />;
        case "weight":
          return <Dumbbell className={iconClass} />;
        case "workouts":
          return <Target className={iconClass} />;
        default:
          return <Trophy className={iconClass} />;
      }
    };

    const getRelevantStat = () => {
      switch (badge.category) {
        case "streak":
          return stats?.currentStreak 
            ? { value: stats.currentStreak.toString(), label: "WEEK STREAK" }
            : null;
        case "weight":
          return stats?.totalWeightLifted 
            ? { value: stats.totalWeightLifted.toLocaleString(), label: "LBS LIFTED" }
            : null;
        case "workouts":
          return stats?.totalWorkouts 
            ? { value: stats.totalWorkouts.toString(), label: "WORKOUTS" }
            : null;
        default:
          return null;
      }
    };

    const theme = getCategoryTheme(badge.category);
    const relevantStat = getRelevantStat();

    // Generate the scalloped badge path (Peloton style)
    const generateBadgePath = () => {
      const points = 16;
      const outerRadius = 115;
      const innerRadius = 100;
      const centerX = 130;
      const centerY = 130;
      
      let path = "";
      
      for (let i = 0; i < points; i++) {
        const angle = (i * 2 * Math.PI) / points - Math.PI / 2;
        const nextAngle = ((i + 1) * 2 * Math.PI) / points - Math.PI / 2;
        const midAngle = (angle + nextAngle) / 2;
        
        const outerX = centerX + outerRadius * Math.cos(angle);
        const outerY = centerY + outerRadius * Math.sin(angle);
        const innerX = centerX + innerRadius * Math.cos(midAngle);
        const innerY = centerY + innerRadius * Math.sin(midAngle);
        
        if (i === 0) {
          path += `M ${outerX} ${outerY}`;
        }
        
        path += ` Q ${innerX} ${innerY} ${centerX + outerRadius * Math.cos(nextAngle)} ${centerY + outerRadius * Math.sin(nextAngle)}`;
      }
      
      path += " Z";
      return path;
    };

    return (
      <div
        ref={ref}
        className="w-[400px] h-[520px] relative overflow-hidden"
        style={{ 
          fontFamily: "'Montserrat', 'Inter', system-ui, sans-serif",
          background: theme.bgGradient,
          borderRadius: "24px",
        }}
      >
        {/* Animated background pattern */}
        <div className="absolute inset-0">
          {/* Radial burst lines */}
          <svg className="absolute inset-0 w-full h-full opacity-10" viewBox="0 0 400 520">
            {Array.from({ length: 24 }).map((_, i) => {
              const angle = (i * 15 * Math.PI) / 180;
              const x2 = 200 + 400 * Math.cos(angle);
              const y2 = 220 + 400 * Math.sin(angle);
              return (
                <line
                  key={i}
                  x1="200"
                  y1="220"
                  x2={x2}
                  y2={y2}
                  stroke={theme.accent}
                  strokeWidth="1"
                />
              );
            })}
          </svg>
          
          {/* Floating particles */}
          <div className="absolute top-20 left-10 w-3 h-3 rounded-full opacity-40" style={{ background: theme.accent, boxShadow: `0 0 20px ${theme.accent}` }} />
          <div className="absolute top-40 right-16 w-2 h-2 rounded-full opacity-30" style={{ background: theme.secondary }} />
          <div className="absolute bottom-32 left-20 w-4 h-4 rounded-full opacity-25" style={{ background: theme.accent, boxShadow: `0 0 15px ${theme.accent}` }} />
          <div className="absolute top-1/3 right-8 w-2 h-2 rounded-full opacity-50" style={{ background: theme.secondary }} />
        </div>

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between px-6 pt-5">
          <img src={louroLogo} alt="Louro" className="h-8 object-contain" />
          <span className="text-white/60 text-xs font-semibold tracking-wider">@LOUROTRAINING</span>
        </div>

        {/* Main badge */}
        <div className="relative z-10 flex flex-col items-center justify-center mt-4">
          
          {/* 3D Badge container */}
          <div className="relative" style={{ perspective: "600px" }}>
            
            {/* Shadow layer */}
            <div 
              className="absolute top-4 left-1/2 -translate-x-1/2"
              style={{
                width: "240px",
                height: "240px",
                borderRadius: "50%",
                background: "rgba(0,0,0,0.5)",
                filter: "blur(30px)",
                transform: "translateZ(-50px)",
              }}
            />
            
            {/* Outer glow ring */}
            <div 
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full"
              style={{
                background: `radial-gradient(circle, ${theme.glow} 0%, transparent 70%)`,
              }}
            />

            {/* Main badge SVG */}
            <svg 
              width="260" 
              height="260" 
              viewBox="0 0 260 260"
              className="relative z-10 drop-shadow-2xl"
              style={{
                filter: `drop-shadow(0 10px 30px ${theme.glow}) drop-shadow(0 4px 6px rgba(0,0,0,0.4))`,
              }}
            >
              {/* Badge definitions */}
              <defs>
                {/* Main gradient */}
                <linearGradient id={`badge-gradient-${badge.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={theme.accent} />
                  <stop offset="50%" stopColor={theme.secondary} />
                  <stop offset="100%" stopColor={theme.accent} />
                </linearGradient>
                
                {/* Inner shadow gradient */}
                <radialGradient id={`inner-shadow-${badge.id}`} cx="30%" cy="30%">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.3)" />
                  <stop offset="100%" stopColor="rgba(0,0,0,0.2)" />
                </radialGradient>
                
                {/* Rim light */}
                <linearGradient id={`rim-light-${badge.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
                  <stop offset="50%" stopColor="rgba(255,255,255,0.1)" />
                  <stop offset="100%" stopColor="rgba(255,255,255,0.3)" />
                </linearGradient>
              </defs>
              
              {/* Scalloped badge shape */}
              <path 
                d={generateBadgePath()} 
                fill={`url(#badge-gradient-${badge.id})`}
                stroke={`url(#rim-light-${badge.id})`}
                strokeWidth="2"
              />
              
              {/* Inner highlight overlay */}
              <path 
                d={generateBadgePath()} 
                fill={`url(#inner-shadow-${badge.id})`}
              />
              
              {/* Inner dark circle */}
              <circle 
                cx="130" 
                cy="130" 
                r="75" 
                fill="rgba(0,0,0,0.4)"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="1"
              />
              
              {/* Inner gradient circle */}
              <circle 
                cx="130" 
                cy="130" 
                r="70" 
                fill="rgba(0,0,0,0.6)"
              />
            </svg>

            {/* Badge icon and emoji overlay */}
            <div 
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center z-20"
              style={{ width: "140px", height: "140px" }}
            >
              <span className="text-7xl drop-shadow-lg">{badge.icon_url}</span>
            </div>
          </div>

          {/* Badge name */}
          <h2 
            className="text-3xl font-black text-center mt-6 mb-1 tracking-tight text-white"
            style={{ textShadow: `0 2px 20px ${theme.glow}` }}
          >
            {badge.name}
          </h2>

          {/* Description */}
          <p className="text-white/50 text-sm text-center max-w-[280px] mb-4">
            {badge.description}
          </p>

          {/* Stat pill */}
          {relevantStat && (
            <div 
              className="flex items-center gap-3 px-5 py-2.5 rounded-full"
              style={{ 
                background: `linear-gradient(135deg, ${theme.accent}20, ${theme.secondary}20)`,
                border: `1px solid ${theme.accent}40`,
                boxShadow: `0 0 20px ${theme.glow}`,
              }}
            >
              <span style={{ color: theme.accent }}>{getCategoryIcon(badge.category)}</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-white">{relevantStat.value}</span>
                <span className="text-xs font-bold tracking-wider" style={{ color: theme.accent }}>{relevantStat.label}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 z-10 px-6 py-4">
          <div className="flex items-center justify-between">
            <span className="text-white/30 text-xs font-medium">
              Earned {format(earnedAt, "MMM d, yyyy")}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-white/30 text-xs">•</span>
              <span 
                className="text-xs font-bold tracking-wider"
                style={{ color: theme.accent }}
              >
                LOURO.APP
              </span>
            </div>
          </div>
        </div>

        {/* Corner accent glows */}
        <div 
          className="absolute -top-20 -right-20 w-60 h-60 rounded-full opacity-20 blur-3xl"
          style={{ background: theme.accent }}
        />
        <div 
          className="absolute -bottom-20 -left-20 w-48 h-48 rounded-full opacity-15 blur-3xl"
          style={{ background: theme.secondary }}
        />
      </div>
    );
  }
);

ShareableBadgeCard.displayName = "ShareableBadgeCard";

export default ShareableBadgeCard;
