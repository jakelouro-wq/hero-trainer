import { useState, useEffect, useCallback, useRef } from "react";
import { Timer, X } from "lucide-react";
import { Button } from "@/components/ui/button";

// Base64 encoded beep sound (short WAV file)
const BEEP_SOUND_BASE64 = "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleVkwACqo49C9fWY8ExmZ2N65dlooABqj4tW9iHFMLRGBzuHGpYZpRBwAebDu2rSUg2ozOHG35dvIpYtoPS0xZaTx4s2zoIxkPjk+Y5rn6NjCqJVsRj9EVYzh8NrIsp5zTEdJYoXY9+HRuqZ7V05UV3vP/OjZwq2CYVNaYHS/7/He0bigbV9lYGuu4vTk2sqjdGRtZmKc2vbo4NOwi3Bya2SJzO/u5drXn4J1eXJ4eL7k8+zi3qmOhH5/f3mw2vf06eHhrJqQioSAiKTS+fbs5uexop+VjY2Pkp7G6/r07+33wLOsopqZm5+kt9H2+fb4+snDu7CmpqessLvJ3vT6+/v7z8nBt7CvsLO3wMrX6fb7/Pv10czEu7a1t7m9xM3Y5fT6/P368NHNxr25uLm7vsXO2OTy+vz8+/PR0MnAu7q6u77Ey9fi8Pn7/Pv41dPNxL+9vL2+wsrS3uzy+vz8+/nX1tDIwsC/v8HGzdXg7fX6/Pz7+tjY08vGxMPDxcnP2OPt9vr8/Pv62NjUzsjGxcXGyc/X4ezz+Pv8/Pv62dnVz8rIx8fIy9DX4uz0+Pv8/Pv72trW0czKycnKzNHZ4+31+fv8/Pv729rX0s3Ly8rLzdLa5O72+fv8/Pv73NvY087Nzc3N0NXc5e/3+vv8/Pv83dzZ1dHQ0NDR1Nrf6PH4+/v8/Pv83t3a1tPS0tLT1tre5PD3+vv8/Pz84N/c2NbV1NTU19nh5vL4+/v8/Pz84uHe29nY19fY2t3k6fP5+/v8/Pz85OPg3dvb2trb3ODm7PX5+/v8/Pz85uXi4N7d3d3e4OTp7vb5+/v8/Pz86Ofi4N/e3t7f4eXr8Pf5/Pz8/Pz86urm5OLh4eHi5Ojs8fj6/Pz8/Pz87Ozp5+Xk5OTl5+ru8/n6/Pz8/Pz87+7r6ejn5+fo6u3x9vn7/Pz8/Pz88fDt7Orq6urr7fD09/r7/Pz8/Pz89PPw7u3s7O3u8PP3+vv8/Pz8/Pz29fLw7+/v7/Dy9Pj6+/z8/Pz8/Pz49/Tz8vLy8vP09vn6+/z8/Pz8/Pz6+ff19PT09PX2+Pn7/Pz8/Pz8/Pz8+/r49/f39/j5+vv8/Pz8/Pz8/Pz8/Pv6+vr6+vr7/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8";

interface RestTimerProps {
  restSeconds: number;
  onClose: () => void;
}

const RestTimer = ({ restSeconds, onClose }: RestTimerProps) => {
  const [timeLeft, setTimeLeft] = useState(restSeconds);
  const [isRunning, setIsRunning] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio on mount
  useEffect(() => {
    const audio = new Audio(BEEP_SOUND_BASE64);
    audio.preload = "auto";
    // Enable playback in background/silent mode on mobile
    audio.volume = 1.0;
    audioRef.current = audio;
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const playBeep = useCallback(() => {
    // Play multiple beeps for attention
    const playBeepSequence = async () => {
      for (let i = 0; i < 3; i++) {
        try {
          if (audioRef.current) {
            audioRef.current.currentTime = 0;
            await audioRef.current.play();
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        } catch (e) {
          console.log("Audio play failed:", e);
        }
      }
    };
    playBeepSequence();
  }, []);

  useEffect(() => {
    if (!isRunning || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          playBeep();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, timeLeft, playBeep]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progress = ((restSeconds - timeLeft) / restSeconds) * 100;

  return (
    <div className="fixed inset-0 bg-background/95 z-50 flex flex-col items-center justify-center animate-fade-in">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="w-6 h-6" />
      </button>

      <div className="text-center">
        <p className="text-muted-foreground uppercase tracking-wider text-sm mb-4">
          Rest Timer
        </p>

        <div className="relative w-48 h-48 mx-auto mb-8">
          {/* Background circle */}
          <svg className="w-full h-full -rotate-90">
            <circle
              cx="96"
              cy="96"
              r="88"
              fill="none"
              stroke="hsl(var(--secondary))"
              strokeWidth="8"
            />
            {/* Progress circle */}
            <circle
              cx="96"
              cy="96"
              r="88"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 88}
              strokeDashoffset={2 * Math.PI * 88 * (1 - progress / 100)}
              className="transition-all duration-1000 ease-linear"
            />
          </svg>

          {/* Timer text */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-5xl font-bold text-foreground">
              {formatTime(timeLeft)}
            </span>
          </div>
        </div>

        {timeLeft === 0 ? (
          <div className="space-y-4">
            <p className="text-primary text-xl font-semibold">Time's up!</p>
            <Button onClick={onClose} className="bg-primary hover:bg-primary/90">
              Continue Workout
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            onClick={() => setIsRunning(!isRunning)}
            className="border-primary text-primary hover:bg-primary/10"
          >
            {isRunning ? "Pause" : "Resume"}
          </Button>
        )}
      </div>
    </div>
  );
};

export default RestTimer;
