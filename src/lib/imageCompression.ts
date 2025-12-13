/**
 * Compresses an image file to be under the target size
 * @param file - The original image file
 * @param maxSizeMB - Maximum file size in MB (default 5MB)
 * @param maxDimension - Maximum width/height dimension (default 2048px)
 * @returns Compressed blob
 */
export async function compressImage(
  file: File,
  maxSizeMB: number = 5,
  maxDimension: number = 2048
): Promise<Blob> {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  // If already under size limit and it's a JPEG, return as-is
  if (file.size <= maxSizeBytes && file.type === "image/jpeg") {
    return file;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    img.onload = () => {
      try {
        let { width, height } = img;

        // Scale down if dimensions exceed max
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;

        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Try different quality levels until we're under the limit
        const tryCompress = (quality: number): void => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error("Failed to compress image"));
                return;
              }

              // If under size limit or quality is very low, accept it
              if (blob.size <= maxSizeBytes || quality <= 0.1) {
                resolve(blob);
              } else {
                // Try lower quality
                tryCompress(quality - 0.1);
              }
            },
            "image/jpeg",
            quality
          );
        };

        // Start with 90% quality
        tryCompress(0.9);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Compresses an image from a data URL/blob URL
 */
export async function compressImageFromUrl(
  imageUrl: string,
  maxSizeMB: number = 5,
  maxDimension: number = 2048
): Promise<Blob> {
  const response = await fetch(imageUrl);
  const blob = await response.blob();
  const file = new File([blob], "image.jpg", { type: blob.type });
  return compressImage(file, maxSizeMB, maxDimension);
}
