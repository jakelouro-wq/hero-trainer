import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import ImageCropModal from "./ImageCropModal";

interface ProfileImageUploadProps {
  currentImageUrl?: string | null;
  userName?: string | null;
  size?: "sm" | "md" | "lg";
  onUploadComplete?: (url: string) => void;
}

const ProfileImageUpload = ({
  currentImageUrl,
  userName,
  size = "md",
  onUploadComplete,
}: ProfileImageUploadProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);

  const sizeClasses = {
    sm: "h-12 w-12",
    md: "h-20 w-20",
    lg: "h-32 w-32",
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const uploadMutation = useMutation({
    mutationFn: async (blob: Blob) => {
      if (!user?.id) throw new Error("Not authenticated");

      setIsUploading(true);

      const fileName = `${user.id}/avatar.jpg`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, blob, {
          cacheControl: "3600",
          upsert: true,
          contentType: "image/jpeg",
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      // Add cache buster
      const urlWithCacheBuster = `${publicUrl}?t=${Date.now()}`;

      // Update profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: urlWithCacheBuster })
        .eq("id", user.id);

      if (updateError) throw updateError;

      return urlWithCacheBuster;
    },
    onSuccess: (url) => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["client"] });
      toast.success("Profile image updated!");
      onUploadComplete?.(url);
    },
    onError: (error) => {
      toast.error("Failed to upload image: " + error.message);
    },
    onSettled: () => {
      setIsUploading(false);
    },
  });

  const handleCropComplete = (croppedBlob: Blob) => {
    uploadMutation.mutate(croppedBlob);
    setSelectedImageSrc(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    // Create object URL and open crop modal
    const imageUrl = URL.createObjectURL(file);
    setSelectedImageSrc(imageUrl);
    setCropModalOpen(true);
    
    // Reset input so same file can be selected again
    e.target.value = "";
  };

  return (
    <div className="relative group">
      <Avatar className={`${sizeClasses[size]} border-2 border-border`}>
        <AvatarImage src={currentImageUrl || undefined} />
        <AvatarFallback className="bg-primary text-primary-foreground font-bold">
          {getInitials(userName)}
        </AvatarFallback>
      </Avatar>

      {/* Upload overlay */}
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className={`absolute inset-0 ${sizeClasses[size]} rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer`}
      >
        {isUploading ? (
          <Loader2 className="w-6 h-6 text-white animate-spin" />
        ) : (
          <Camera className="w-6 h-6 text-white" />
        )}
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {selectedImageSrc && (
        <ImageCropModal
          open={cropModalOpen}
          imageSrc={selectedImageSrc}
          onClose={() => {
            setCropModalOpen(false);
            URL.revokeObjectURL(selectedImageSrc);
            setSelectedImageSrc(null);
          }}
          onCropComplete={handleCropComplete}
        />
      )}
    </div>
  );
};

export default ProfileImageUpload;
