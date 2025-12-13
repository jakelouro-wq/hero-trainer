import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, X, Image } from "lucide-react";
import { toast } from "sonner";
import { compressImage } from "@/lib/imageCompression";

interface ProgramImageUploadProps {
  programId: string;
  currentImageUrl?: string | null;
  coachAvatarUrl?: string | null;
  onUploadComplete?: (url: string) => void;
}

const ProgramImageUpload = ({
  programId,
  currentImageUrl,
  coachAvatarUrl,
  onUploadComplete,
}: ProgramImageUploadProps) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Display image: program image > coach avatar > placeholder
  const displayImage = currentImageUrl || coachAvatarUrl;

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      setIsUploading(true);

      // Create a unique file name
      const fileExt = file.name.split(".").pop();
      const fileName = `${programId}/cover.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("program-images")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("program-images")
        .getPublicUrl(fileName);

      // Add cache buster
      const urlWithCacheBuster = `${publicUrl}?t=${Date.now()}`;

      // Update program
      const { error: updateError } = await supabase
        .from("programs")
        .update({ image_url: urlWithCacheBuster })
        .eq("id", programId);

      if (updateError) throw updateError;

      return urlWithCacheBuster;
    },
    onSuccess: (url) => {
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      queryClient.invalidateQueries({ queryKey: ["program", programId] });
      toast.success("Program image updated!");
      onUploadComplete?.(url);
    },
    onError: (error) => {
      toast.error("Failed to upload image: " + error.message);
    },
    onSettled: () => {
      setIsUploading(false);
    },
  });

  const removeMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("programs")
        .update({ image_url: null })
        .eq("id", programId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      queryClient.invalidateQueries({ queryKey: ["program", programId] });
      toast.success("Program image removed");
    },
    onError: (error) => {
      toast.error("Failed to remove image: " + error.message);
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Reset input
    e.target.value = "";

    try {
      // Auto-compress if over 5MB
      let processedFile: File | Blob = file;
      if (file.size > 5 * 1024 * 1024) {
        toast.info("Compressing large image...");
        processedFile = await compressImage(file);
      }

      uploadMutation.mutate(processedFile as File);
    } catch (error) {
      toast.error("Failed to process image");
      console.error("Image compression error:", error);
    }
  };

  return (
    <div className="space-y-2">
      <div className="relative group w-full aspect-video rounded-lg overflow-hidden bg-muted border border-border">
        {displayImage ? (
          <img
            src={displayImage}
            alt="Program cover"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Image className="w-12 h-12 text-muted-foreground" />
          </div>
        )}

        {/* Upload overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Camera className="w-4 h-4 mr-1" />
                {currentImageUrl ? "Change" : "Upload"}
              </>
            )}
          </Button>
          {currentImageUrl && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => removeMutation.mutate()}
              disabled={removeMutation.isPending}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {!currentImageUrl && coachAvatarUrl && (
        <p className="text-xs text-muted-foreground text-center">
          Using your profile image as default
        </p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
};

export default ProgramImageUpload;
