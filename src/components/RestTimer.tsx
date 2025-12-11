import { useState, useEffect, useCallback } from "react";
import { Timer, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RestTimerProps {
  restSeconds: number;
  onClose: () => void;
}

const RestTimer = ({ restSeconds, onClose }: RestTimerProps) => {
  const [timeLeft, setTimeLeft] = useState(restSeconds);
  const [isRunning, setIsRunning] = useState(true);

  useEffect(() => {
    if (!isRunning || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          // Play a simple beep sound when timer ends
          try {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            oscillator.frequency.value = 800;
            oscillator.type = "sine";
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
          } catch (e) {
            // Audio not supported, silently fail
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

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
