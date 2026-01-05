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
            primary: "#FF6B35",
            secondary: "#F72585",
            tertiary: "#FFB347",
            dark: "#7B2D26",
            glow: "rgba(247, 37, 133, 0.5)",
          };
        case "weight":
          return {
            primary: "#7B68EE",
            secondary: "#4158D0",
            tertiary: "#C850C0",
            dark: "#2D1B69",
            glow: "rgba(123, 104, 238, 0.5)",
          };
        case "workouts":
          return {
            primary: "#00D9A5",
            secondary: "#00B4D8",
            tertiary: "#48CAE4",
            dark: "#065A52",
            glow: "rgba(0, 217, 165, 0.5)",
          };
        default:
          return {
            primary: "#00B4D8",
            secondary: "#0077B6",
            tertiary: "#48CAE4",
            dark: "#023E73",
            glow: "rgba(0, 180, 216, 0.5)",
          };
      }
    };

    const getInspiringQuote = () => {
      const name = badge.name.toLowerCase();
      
      if (name.includes("first") || name.includes("beginner") || badge.threshold === 1) {
        return "The journey of a thousand miles begins with a single step.";
      }
      
      if (badge.category === "streak") {
        if (badge.threshold >= 52) return "Champions are made through consistency, not perfection.";
        if (badge.threshold >= 26) return "Half a year of dedication. Unstoppable.";
        if (badge.threshold >= 12) return "Three months strong. This is who you are now.";
        if (badge.threshold >= 4) return "Discipline is the bridge between goals and accomplishment.";
        return "Consistency beats intensity. Every. Single. Time.";
      }
      
      if (badge.category === "weight") {
        if (badge.threshold >= 10000000) return "Ten million pounds. Legend status achieved.";
        if (badge.threshold >= 5000000) return "Five million pounds moved. You're built different.";
        if (badge.threshold >= 1000000) return "A million pounds. Proof that effort compounds.";
        if (badge.threshold >= 500000) return "Half a million pounds of pure dedication.";
        if (badge.threshold >= 100000) return "Heavy is the iron that builds champions.";
        return "Every pound lifted is a step toward greatness.";
      }
      
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

    return (
      <div
        ref={ref}
        className="w-[400px] h-[520px] relative overflow-hidden"
        style={{ 
          fontFamily: "'Montserrat', 'Inter', system-ui, sans-serif",
          background: "linear-gradient(160deg, #08080C 0%, #0F0F18 40%, #08080C 100%)",
          borderRadius: "24px",
        }}
      >
        {/* Subtle grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: "30px 30px",
          }}
        />

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between px-6 pt-5">
          <img src={louroLogo} alt="Louro" className="h-8 object-contain" />
          <span className="text-white/40 text-xs font-semibold tracking-wider">@LOUROTRAINING</span>
        </div>

        {/* Main badge */}
        <div className="relative z-10 flex flex-col items-center justify-center mt-4">
          
          {/* Badge container with 3D effect */}
          <div className="relative" style={{ perspective: "800px" }}>
            
            {/* Deep shadow */}
            <div 
              className="absolute top-8 left-1/2 -translate-x-1/2"
              style={{
                width: "180px",
                height: "180px",
                borderRadius: "50%",
                background: "rgba(0,0,0,0.8)",
                filter: "blur(40px)",
              }}
            />
            
            {/* Glow effect */}
            <div 
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full"
              style={{
                background: `radial-gradient(circle, ${theme.glow} 0%, transparent 50%)`,
              }}
            />

            {/* Main badge SVG */}
            <svg 
              width="280" 
              height="280" 
              viewBox="0 0 280 280"
              className="relative z-10"
              style={{
                filter: `drop-shadow(0 20px 40px ${theme.glow}) drop-shadow(0 8px 16px rgba(0,0,0,0.6))`,
              }}
            >
              <defs>
                {/* Main metallic gradient */}
                <linearGradient id={`metal-${badge.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={theme.tertiary} />
                  <stop offset="25%" stopColor={theme.primary} />
                  <stop offset="50%" stopColor={theme.secondary} />
                  <stop offset="75%" stopColor={theme.primary} />
                  <stop offset="100%" stopColor={theme.tertiary} />
                </linearGradient>
                
                {/* Shine overlay */}
                <linearGradient id={`shine-${badge.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
                  <stop offset="30%" stopColor="rgba(255,255,255,0)" />
                  <stop offset="70%" stopColor="rgba(255,255,255,0)" />
                  <stop offset="100%" stopColor="rgba(255,255,255,0.2)" />
                </linearGradient>
                
                {/* Inner circle gradient */}
                <radialGradient id={`inner-${badge.id}`} cx="40%" cy="40%">
                  <stop offset="0%" stopColor={theme.dark} />
                  <stop offset="100%" stopColor="#0a0a10" />
                </radialGradient>
                
                {/* Star gradient */}
                <linearGradient id={`star-${badge.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={theme.tertiary} />
                  <stop offset="100%" stopColor={theme.primary} />
                </linearGradient>
              </defs>
              
              {/* Outer scalloped ring - Peloton style with deeper waves */}
              <path 
                d={generateScallopedPath(140, 140, 125, 105, 12)} 
                fill={`url(#metal-${badge.id})`}
              />
              
              {/* Shine overlay on scalloped ring */}
              <path 
                d={generateScallopedPath(140, 140, 125, 105, 12)} 
                fill={`url(#shine-${badge.id})`}
              />
              
              {/* Inner ring border */}
              <circle 
                cx="140" 
                cy="140" 
                r="88" 
                fill="none"
                stroke={theme.primary}
                strokeWidth="3"
                opacity="0.6"
              />
              
              {/* Inner dark circle */}
              <circle 
                cx="140" 
                cy="140" 
                r="85" 
                fill={`url(#inner-${badge.id})`}
              />
              
              {/* Decorative inner ring */}
              <circle 
                cx="140" 
                cy="140" 
                r="75" 
                fill="none"
                stroke={theme.primary}
                strokeWidth="1"
                opacity="0.3"
                strokeDasharray="4 4"
              />
              
              {/* Decorative stars around the badge */}
              {[0, 72, 144, 216, 288].map((angle, i) => {
                const rad = (angle * Math.PI) / 180;
                const x = 140 + 98 * Math.cos(rad - Math.PI / 2);
                const y = 140 + 98 * Math.sin(rad - Math.PI / 2);
                return (
                  <g key={i} transform={`translate(${x}, ${y})`}>
                    <polygon
                      points="0,-6 1.5,-2 6,-2 2.5,1 4,5 0,2.5 -4,5 -2.5,1 -6,-2 -1.5,-2"
                      fill={`url(#star-${badge.id})`}
                    />
                  </g>
                );
              })}
            </svg>

            {/* Badge emoji overlay */}
            <div 
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center z-20"
              style={{ width: "150px", height: "150px" }}
            >
              <span 
                className="text-8xl"
                style={{ 
                  filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.5))",
                }}
              >
                {badge.icon_url}
              </span>
            </div>
          </div>

          {/* Badge name */}
          <h2 
            className="text-3xl font-black text-center mt-4 mb-2 tracking-tight text-white uppercase"
            style={{ textShadow: `0 2px 20px ${theme.glow}` }}
          >
            {badge.name}
          </h2>

          {/* Earned date */}
          <p className="text-white/40 text-sm font-medium mb-4">
            Earned {format(earnedAt, "MMMM d, yyyy")}
          </p>

          {/* Inspiring quote */}
          <div className="px-10">
            <p 
              className="text-center text-sm italic leading-relaxed"
              style={{ color: theme.primary, opacity: 0.85 }}
            >
              "{getInspiringQuote()}"
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 z-10 px-6 py-4">
          <div className="flex items-center justify-center">
            <span 
              className="text-xs font-bold tracking-[0.15em]"
              style={{ color: theme.primary, opacity: 0.5 }}
            >
              WWW.LOUROTRAINING.COM
            </span>
          </div>
        </div>

        {/* Subtle corner glow */}
        <div 
          className="absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-10 blur-3xl"
          style={{ background: theme.primary }}
        />
      </div>
    );
  }
);

// Generate deep scalloped path like Peloton badges
function generateScallopedPath(
  cx: number, 
  cy: number, 
  outerR: number, 
  innerR: number, 
  points: number
): string {
  let path = "";
  
  for (let i = 0; i < points; i++) {
    const angle1 = (i * 2 * Math.PI) / points - Math.PI / 2;
    const angle2 = ((i + 0.5) * 2 * Math.PI) / points - Math.PI / 2;
    const angle3 = ((i + 1) * 2 * Math.PI) / points - Math.PI / 2;
    
    const x1 = cx + outerR * Math.cos(angle1);
    const y1 = cy + outerR * Math.sin(angle1);
    const x2 = cx + innerR * Math.cos(angle2);
    const y2 = cy + innerR * Math.sin(angle2);
    const x3 = cx + outerR * Math.cos(angle3);
    const y3 = cy + outerR * Math.sin(angle3);
    
    if (i === 0) {
      path += `M ${x1} ${y1}`;
    }
    
    // Create smooth curves for the scallop
    const cp1x = cx + (outerR * 0.85) * Math.cos(angle1 + (angle2 - angle1) * 0.5);
    const cp1y = cy + (outerR * 0.85) * Math.sin(angle1 + (angle2 - angle1) * 0.5);
    const cp2x = cx + (outerR * 0.85) * Math.cos(angle2 + (angle3 - angle2) * 0.5);
    const cp2y = cy + (outerR * 0.85) * Math.sin(angle2 + (angle3 - angle2) * 0.5);
    
    path += ` C ${cp1x} ${cp1y} ${x2} ${y2} ${x2} ${y2}`;
    path += ` C ${x2} ${y2} ${cp2x} ${cp2y} ${x3} ${y3}`;
  }
  
  path += " Z";
  return path;
}

ShareableBadgeCard.displayName = "ShareableBadgeCard";

export default ShareableBadgeCard;
