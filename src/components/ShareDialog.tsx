import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Instagram, Download } from "lucide-react";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import ShareableWorkoutCard from "./ShareableWorkoutCard";
import ShareableBadgeCard from "./ShareableBadgeCard";
import type { Badge } from "@/hooks/useBadges";

interface WorkoutShareData {
  type: "workout";
  workoutName: string;
  date: Date;
  duration: string;
  totalWeight: number;
  intensityRating: number;
}

interface BadgeShareData {
  type: "badge";
  badge: Badge;
  earnedAt: Date;
  stats?: {
    totalWorkouts?: number;
    totalWeightLifted?: number;
    currentStreak?: number;
  };
}

type ShareData = WorkoutShareData | BadgeShareData;

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  data: ShareData | null;
}

const ShareDialog = ({ isOpen, onClose, data }: ShareDialogProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);

  useEffect(() => {
    if (isOpen && data && cardRef.current) {
      const generateImage = async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (!cardRef.current) return;
        
        try {
          const canvas = await html2canvas(cardRef.current, {
            backgroundColor: null,
            scale: 2,
            useCORS: true,
            allowTaint: true,
          });
          
          canvas.toBlob((blob) => {
            if (blob) {
              setImageBlob(blob);
            }
          }, "image/png");
        } catch (error) {
          console.error("Failed to generate image:", error);
        }
      };
      
      generateImage();
    }
  }, [isOpen, data]);

  const handleShareToInstagram = async () => {
    if (!imageBlob) {
      toast.error("Image not ready yet, please try again");
      return;
    }

    setIsGenerating(true);

    try {
      const file = new File([imageBlob], "louro-share.png", { type: "image/png" });

      // Try Web Share API first (works on mobile)
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
        });
        toast.success("Opening share menu...");
      } else {
        // Fallback: Download the image with instructions
        await handleDownload();
        toast.info("Image saved! Open Instagram Stories and add it from your gallery.");
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        console.error("Share failed:", error);
        await handleDownload();
        toast.info("Image saved! Open Instagram Stories and add it from your gallery.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!imageBlob) {
      toast.error("Image not ready yet, please try again");
      return;
    }

    const url = URL.createObjectURL(imageBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = data?.type === "workout" 
      ? `louro-workout-${Date.now()}.png`
      : `louro-badge-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!data) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-card border-border max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Instagram className="w-5 h-5 text-primary" />
            Share to Instagram Stories
          </DialogTitle>
        </DialogHeader>

        {/* Preview Card */}
        <div className="flex justify-center py-4 overflow-hidden">
          <div className="transform scale-[0.7] origin-top">
            {data.type === "workout" ? (
              <ShareableWorkoutCard
                ref={cardRef}
                workoutName={data.workoutName}
                date={data.date}
                duration={data.duration}
                totalWeight={data.totalWeight}
                intensityRating={data.intensityRating}
              />
            ) : (
              <ShareableBadgeCard
                ref={cardRef}
                badge={data.badge}
                earnedAt={data.earnedAt}
                stats={data.stats}
              />
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button
            className="w-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:from-purple-600 hover:via-pink-600 hover:to-orange-600 text-white"
            onClick={handleShareToInstagram}
            disabled={isGenerating || !imageBlob}
          >
            <Instagram className="w-4 h-4 mr-2" />
            {isGenerating ? "Preparing..." : "Share to Instagram Stories"}
          </Button>

          <Button
            variant="outline"
            className="w-full"
            onClick={handleDownload}
            disabled={!imageBlob}
          >
            <Download className="w-4 h-4 mr-2" />
            Save Image
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Tag us @LouroTraining when you share!
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default ShareDialog;
