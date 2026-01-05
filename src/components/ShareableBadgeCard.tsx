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
            gradient: "linear-gradient(135deg, #FF416C 0%, #FF4B2B 100%)",
            glow: "#FF416C",
            accent: "#FF6B6B",
          };
        case "weight":
          return {
            gradient: "linear-gradient(135deg, #667EEA 0%, #764BA2 100%)",
            glow: "#667EEA",
            accent: "#A78BFA",
          };
        case "workouts":
          return {
            gradient: "linear-gradient(135deg, #11998E 0%, #38EF7D 100%)",
            glow: "#38EF7D",
            accent: "#6EE7B7",
          };
        default:
          return {
            gradient: "linear-gradient(135deg, #4FACFE 0%, #00F2FE 100%)",
            glow: "#4FACFE",
            accent: "#67E8F9",
          };
      }
    };

    const getInspiringQuote = () => {
      const name = badge.name.toLowerCase();
      
      if (name.includes("first") || name.includes("beginner") || badge.threshold === 1) {
        return "The journey of a thousand miles begins with a single step.";
      }
      
      if (badge.category === "streak") {
        if (badge.threshold >= 52) return "Champions are made through consistency.";
        if (badge.threshold >= 12) return "This is who you are now.";
        return "Consistency beats intensity.";
      }
      
      if (badge.category === "weight") {
        if (badge.threshold >= 1000000) return "Proof that effort compounds.";
        return "Every pound lifted builds greatness.";
      }
      
      if (badge.category === "workouts") {
        if (badge.threshold >= 100) return "The grind is paying off.";
        return "Show up. Work hard. Repeat.";
      }
      
      return "Every achievement starts with the decision to try.";
    };

    const theme = getCategoryTheme(badge.category);

    return (
      <div
        ref={ref}
        className="w-[400px] h-[500px] relative overflow-hidden flex flex-col"
        style={{ 
          fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif",
          background: "#000000",
          borderRadius: "20px",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <img src={louroLogo} alt="Louro" className="h-7 object-contain opacity-90" />
          <span className="text-white/50 text-xs font-medium tracking-wide">@lourotraining</span>
        </div>

        {/* Badge section */}
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          
          {/* Badge circle */}
          <div className="relative mb-8">
            {/* Outer glow */}
            <div 
              className="absolute inset-0 rounded-full blur-2xl opacity-40"
              style={{ 
                background: theme.glow,
                transform: "scale(1.2)",
              }}
            />
            
            {/* Main badge ring */}
            <div 
              className="relative w-44 h-44 rounded-full p-1"
              style={{ 
                background: theme.gradient,
                boxShadow: `0 0 60px ${theme.glow}40, 0 20px 40px rgba(0,0,0,0.4)`,
              }}
            >
              {/* Inner dark circle */}
              <div 
                className="w-full h-full rounded-full flex items-center justify-center"
                style={{ 
                  background: "linear-gradient(145deg, #1a1a1a 0%, #0a0a0a 100%)",
                }}
              >
                {/* Emoji centered */}
                <span className="text-7xl leading-none">{badge.icon_url}</span>
              </div>
            </div>
          </div>

          {/* Badge name */}
          <h2 className="text-2xl font-bold text-white text-center tracking-tight mb-2">
            {badge.name}
          </h2>

          {/* Earned date */}
          <p className="text-white/40 text-sm mb-6">
            {format(earnedAt, "MMMM d, yyyy")}
          </p>

          {/* Divider */}
          <div 
            className="w-12 h-0.5 rounded-full mb-6"
            style={{ background: theme.gradient }}
          />

          {/* Quote */}
          <p 
            className="text-center text-sm leading-relaxed max-w-[280px]"
            style={{ color: theme.accent }}
          >
            {getInspiringQuote()}
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 py-5 flex items-center justify-center border-t border-white/5">
          <span className="text-white/30 text-xs font-medium tracking-wide">
            lourotraining.com
          </span>
        </div>
      </div>
    );
  }
);

ShareableBadgeCard.displayName = "ShareableBadgeCard";

export default ShareableBadgeCard;
