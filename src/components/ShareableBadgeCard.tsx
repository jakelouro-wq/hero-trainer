import { forwardRef } from "react";
import { format } from "date-fns";
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
  ({ badge, earnedAt }, ref) => {
    const getCategoryTheme = (category: string) => {
      switch (category) {
        case "streak":
          return {
            gradient: "linear-gradient(145deg, #FF512F 0%, #DD2476 50%, #FF512F 100%)",
            accent: "#FF512F",
            secondary: "#DD2476",
            glow: "rgba(255, 81, 47, 0.4)",
          };
        case "weight":
          return {
            gradient: "linear-gradient(145deg, #667EEA 0%, #764BA2 50%, #F093FB 100%)",
            accent: "#667EEA",
            secondary: "#764BA2",
            glow: "rgba(102, 126, 234, 0.4)",
          };
        case "workouts":
          return {
            gradient: "linear-gradient(145deg, #11998E 0%, #38EF7D 50%, #11998E 100%)",
            accent: "#38EF7D",
            secondary: "#11998E",
            glow: "rgba(56, 239, 125, 0.4)",
          };
        default:
          return {
            gradient: "linear-gradient(145deg, #00D4FF 0%, #0066FF 50%, #00D4FF 100%)",
            accent: "#00D4FF",
            secondary: "#0066FF",
            glow: "rgba(0, 212, 255, 0.4)",
          };
      }
    };

    // Inspiring quotes based on badge name or category
    const getInspiringQuote = () => {
      const name = badge.name.toLowerCase();
      
      // First workout / beginner badges
      if (name.includes("first") || name.includes("beginner") || badge.threshold === 1) {
        return "The journey of a thousand miles begins with a single step.";
      }
      
      // Streak badges
      if (badge.category === "streak") {
        if (badge.threshold >= 52) return "Champions are made through consistency, not perfection.";
        if (badge.threshold >= 26) return "Half a year of dedication. Unstoppable.";
        if (badge.threshold >= 12) return "Three months strong. This is who you are now.";
        if (badge.threshold >= 4) return "Discipline is the bridge between goals and accomplishment.";
        return "Consistency beats intensity. Every. Single. Time.";
      }
      
      // Weight badges
      if (badge.category === "weight") {
        if (badge.threshold >= 10000000) return "Ten million pounds. Legend status achieved.";
        if (badge.threshold >= 5000000) return "Five million pounds moved. You're built different.";
        if (badge.threshold >= 1000000) return "A million pounds. Proof that effort compounds.";
        if (badge.threshold >= 500000) return "Half a million pounds of pure dedication.";
        if (badge.threshold >= 100000) return "Heavy is the iron that builds champions.";
        return "Every pound lifted is a step toward greatness.";
      }
      
      // Workout count badges
      if (badge.category === "workouts") {
        if (badge.threshold >= 500) return "500 workouts. You've mastered the art of showing up.";
        if (badge.threshold >= 250) return "A quarter thousand. Relentless.";
        if (badge.threshold >= 100) return "Triple digits. The grind is paying off.";
        if (badge.threshold >= 50) return "Fifty down, infinite to go.";
        if (badge.threshold >= 25) return "Twenty-five workouts. Building momentum.";
        if (badge.threshold >= 10) return "Double digits. You're just getting started.";
        return "Show up. Work hard. Repeat.";
      }
      
      return "Every achievement starts with the decision to try.";
    };

    const theme = getCategoryTheme(badge.category);

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
          background: "linear-gradient(160deg, #0D0D12 0%, #141420 40%, #0A0A0F 100%)",
          borderRadius: "24px",
        }}
      >
        {/* Subtle background pattern */}
        <div className="absolute inset-0">
          {/* Radial burst lines */}
          <svg className="absolute inset-0 w-full h-full opacity-[0.04]" viewBox="0 0 400 520">
            {Array.from({ length: 24 }).map((_, i) => {
              const angle = (i * 15 * Math.PI) / 180;
              const x2 = 200 + 400 * Math.cos(angle);
              const y2 = 200 + 400 * Math.sin(angle);
              return (
                <line
                  key={i}
                  x1="200"
                  y1="200"
                  x2={x2}
                  y2={y2}
                  stroke="#ffffff"
                  strokeWidth="1"
                />
              );
            })}
          </svg>
          
          {/* Floating particles */}
          <div className="absolute top-24 left-12 w-2 h-2 rounded-full bg-white/10" />
          <div className="absolute top-40 right-20 w-1.5 h-1.5 rounded-full bg-white/8" />
          <div className="absolute bottom-40 left-16 w-2.5 h-2.5 rounded-full bg-white/6" />
          <div className="absolute top-1/3 right-10 w-1.5 h-1.5 rounded-full bg-white/10" />
        </div>

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between px-6 pt-5">
          <img src={louroLogo} alt="Louro" className="h-8 object-contain" />
          <span className="text-white/40 text-xs font-semibold tracking-wider">@LOUROTRAINING</span>
        </div>

        {/* Main badge */}
        <div className="relative z-10 flex flex-col items-center justify-center mt-6">
          
          {/* 3D Badge container */}
          <div className="relative" style={{ perspective: "600px" }}>
            
            {/* Shadow layer */}
            <div 
              className="absolute top-6 left-1/2 -translate-x-1/2"
              style={{
                width: "200px",
                height: "200px",
                borderRadius: "50%",
                background: "rgba(0,0,0,0.6)",
                filter: "blur(40px)",
              }}
            />
            
            {/* Outer glow ring */}
            <div 
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full"
              style={{
                background: `radial-gradient(circle, ${theme.glow} 0%, transparent 60%)`,
              }}
            />

            {/* Main badge SVG */}
            <svg 
              width="260" 
              height="260" 
              viewBox="0 0 260 260"
              className="relative z-10"
              style={{
                filter: `drop-shadow(0 15px 40px ${theme.glow}) drop-shadow(0 5px 10px rgba(0,0,0,0.5))`,
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
                  <stop offset="0%" stopColor="rgba(255,255,255,0.25)" />
                  <stop offset="100%" stopColor="rgba(0,0,0,0.15)" />
                </radialGradient>
                
                {/* Rim light */}
                <linearGradient id={`rim-light-${badge.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.5)" />
                  <stop offset="50%" stopColor="rgba(255,255,255,0.1)" />
                  <stop offset="100%" stopColor="rgba(255,255,255,0.4)" />
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
                fill="rgba(10,10,15,0.85)"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="1"
              />
              
              {/* Inner gradient circle */}
              <circle 
                cx="130" 
                cy="130" 
                r="70" 
                fill="rgba(15,15,22,0.9)"
              />
            </svg>

            {/* Badge emoji overlay */}
            <div 
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center z-20"
              style={{ width: "140px", height: "140px" }}
            >
              <span className="text-7xl drop-shadow-lg">{badge.icon_url}</span>
            </div>
          </div>

          {/* Badge name */}
          <h2 
            className="text-3xl font-black text-center mt-5 mb-2 tracking-tight text-white"
            style={{ textShadow: `0 2px 30px ${theme.glow}` }}
          >
            {badge.name}
          </h2>

          {/* Earned date */}
          <p className="text-white/40 text-sm font-medium mb-5">
            Earned {format(earnedAt, "MMMM d, yyyy")}
          </p>

          {/* Inspiring quote */}
          <div className="px-8">
            <p 
              className="text-center text-sm italic leading-relaxed"
              style={{ color: theme.accent, opacity: 0.9 }}
            >
              "{getInspiringQuote()}"
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 z-10 px-6 py-4">
          <div className="flex items-center justify-center">
            <span 
              className="text-xs font-bold tracking-[0.2em]"
              style={{ color: theme.accent, opacity: 0.6 }}
            >
              LOURO.APP
            </span>
          </div>
        </div>

        {/* Subtle corner accent */}
        <div 
          className="absolute -top-32 -right-32 w-64 h-64 rounded-full opacity-10 blur-3xl"
          style={{ background: theme.accent }}
        />
      </div>
    );
  }
);

ShareableBadgeCard.displayName = "ShareableBadgeCard";

export default ShareableBadgeCard;
