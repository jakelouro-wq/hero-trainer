import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface BadgeCelebrationProps {
  badge: {
    name: string;
    description: string;
    icon_url: string;
    category: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
}

const Confetti = () => {
  const colors = ["#FFD700", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8"];
  const particles = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    color: colors[Math.floor(Math.random() * colors.length)],
    left: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 2 + Math.random() * 2,
    size: 6 + Math.random() * 8,
    rotation: Math.random() * 360,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute animate-confetti"
          style={{
            left: `${p.left}%`,
            top: "-20px",
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            borderRadius: Math.random() > 0.5 ? "50%" : "2px",
            transform: `rotate(${p.rotation}deg)`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
};

const Ribbons = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Left ribbon */}
      <div className="absolute -left-8 top-1/2 -translate-y-1/2 w-32 h-4 bg-gradient-to-r from-primary/80 to-primary animate-ribbon-left origin-right" />
      <div className="absolute -left-8 top-1/2 -translate-y-1/2 mt-3 w-28 h-3 bg-gradient-to-r from-yellow-500/80 to-yellow-400 animate-ribbon-left-delay origin-right" />
      
      {/* Right ribbon */}
      <div className="absolute -right-8 top-1/2 -translate-y-1/2 w-32 h-4 bg-gradient-to-l from-primary/80 to-primary animate-ribbon-right origin-left" />
      <div className="absolute -right-8 top-1/2 -translate-y-1/2 mt-3 w-28 h-3 bg-gradient-to-l from-yellow-500/80 to-yellow-400 animate-ribbon-right-delay origin-left" />
    </div>
  );
};

const Sparkles = () => {
  const sparkles = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    angle: (i * 30) * (Math.PI / 180),
    delay: i * 0.1,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none">
      {sparkles.map((s) => (
        <div
          key={s.id}
          className="absolute left-1/2 top-1/2 w-2 h-2 bg-yellow-400 rounded-full animate-sparkle"
          style={{
            animationDelay: `${s.delay}s`,
            transform: `translate(-50%, -50%) rotate(${s.angle}rad) translateY(-80px)`,
          }}
        />
      ))}
    </div>
  );
};

const getCategoryGradient = (category: string) => {
  switch (category) {
    case "streak":
      return "from-orange-500 via-red-500 to-orange-600";
    case "weight":
      return "from-blue-500 via-cyan-400 to-blue-600";
    case "workouts":
      return "from-green-500 via-emerald-400 to-green-600";
    default:
      return "from-purple-500 via-pink-400 to-purple-600";
  }
};

const BadgeCelebration = ({ badge, isOpen, onClose }: BadgeCelebrationProps) => {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!badge) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-gradient-to-b from-background via-background to-secondary/30 border-primary/30 overflow-visible">
        {showConfetti && <Confetti />}
        <Ribbons />
        <Sparkles />
        
        <div className="flex flex-col items-center py-8 relative z-10">
          {/* Glowing ring behind badge */}
          <div className="absolute top-12 w-40 h-40 rounded-full bg-primary/20 blur-xl animate-pulse" />
          
          {/* Badge container with spin animation */}
          <div className="relative mb-6 animate-badge-entrance">
            {/* Outer glow ring */}
            <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${getCategoryGradient(badge.category)} blur-md opacity-60 scale-110 animate-pulse`} />
            
            {/* Badge circle */}
            <div className={`relative w-32 h-32 rounded-full bg-gradient-to-br ${getCategoryGradient(badge.category)} flex items-center justify-center shadow-2xl animate-badge-spin`}>
              {/* Inner circle */}
              <div className="w-28 h-28 rounded-full bg-background/90 flex items-center justify-center">
                <span className="text-5xl animate-badge-icon">{badge.icon_url}</span>
              </div>
            </div>
            
            {/* Shine effect */}
            <div className="absolute inset-0 rounded-full overflow-hidden">
              <div className="absolute -inset-full bg-gradient-to-r from-transparent via-white/30 to-transparent rotate-45 animate-shine" />
            </div>
          </div>

          {/* Achievement text */}
          <div className="text-center space-y-2 animate-fade-in" style={{ animationDelay: "0.5s" }}>
            <p className="text-sm font-medium text-primary uppercase tracking-widest">
              Achievement Unlocked!
            </p>
            <h2 className="text-2xl font-display font-bold text-foreground">
              {badge.name}
            </h2>
            <p className="text-muted-foreground max-w-xs">
              {badge.description}
            </p>
          </div>

          {/* Continue button */}
          <Button 
            onClick={onClose} 
            className="mt-8 px-8 animate-fade-in"
            style={{ animationDelay: "0.8s" }}
          >
            Awesome!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BadgeCelebration;
