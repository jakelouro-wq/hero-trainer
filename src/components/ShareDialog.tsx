import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Share2, Download, Copy, Check } from "lucide-react";
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
  const [copied, setCopied] = useState(false);
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);

  // Generate image when dialog opens
  useEffect(() => {
    if (isOpen && data && cardRef.current) {
      const generateImage = async () => {
        // Small delay to ensure render
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

  const handleShare = async () => {
    if (!imageBlob) {
      toast.error("Image not ready yet, please try again");
      return;
    }

    setIsGenerating(true);

    try {
      const file = new File([imageBlob], "louro-share.png", { type: "image/png" });
      
      const shareText = data?.type === "workout"
        ? `Just crushed ${data.workoutName}! 💪 #LouroTraining @LouroTraining`
        : `Just unlocked "${data?.badge.name}"! 🏆 #LouroTraining @LouroTraining`;

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Louro Training",
          text: shareText,
        });
        toast.success("Shared successfully!");
      } else {
        // Fallback: Download the image
        await handleDownload();
        toast.info("Image downloaded! You can now share it manually.");
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        console.error("Share failed:", error);
        toast.error("Failed to share. Try downloading instead.");
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
    toast.success("Image downloaded!");
  };

  const handleCopyCaption = () => {
    const caption = data?.type === "workout"
      ? `Just crushed ${data.workoutName}! 💪\n\n⏱️ Duration: ${data.duration}\n🏋️ Weight Lifted: ${data.totalWeight.toLocaleString()} lbs\n🔥 Intensity: ${data.intensityRating}/10\n\n#LouroTraining @LouroTraining`
      : `Just unlocked "${data?.badge.name}"! 🏆\n\n${data?.badge.description}\n\n#LouroTraining @LouroTraining`;

    navigator.clipboard.writeText(caption);
    setCopied(true);
    toast.success("Caption copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (!data) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-card border-border max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary" />
            Share Your {data.type === "workout" ? "Workout" : "Achievement"}
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
            className="w-full bg-primary hover:bg-primary/90"
            onClick={handleShare}
            disabled={isGenerating || !imageBlob}
          >
            <Share2 className="w-4 h-4 mr-2" />
            {isGenerating ? "Preparing..." : "Share to Stories"}
          </Button>

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={handleDownload}
              disabled={!imageBlob}
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button variant="outline" onClick={handleCopyCaption}>
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Caption
                </>
              )}
            </Button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Tag us @LouroTraining when you share!
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default ShareDialog;
