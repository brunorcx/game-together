const MAX_COVER_BYTES = 1024 * 1024;
const MAX_INPUT_BYTES = 20 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 1800;

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Could not compress this image."));
      },
      "image/jpeg",
      quality,
    );
  });
}

export async function compressCoverImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file.");
  if (file.size > MAX_INPUT_BYTES) throw new Error("The selected image must be smaller than 20 MB before compression.");
  if (typeof createImageBitmap !== "function") throw new Error("This browser does not support image compression.");

  const image = await createImageBitmap(file);
  try {
    let scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(image.width, image.height));
    for (let resizeAttempt = 0; resizeAttempt < 8; resizeAttempt++) {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Could not prepare the image for compression.");
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      for (const quality of [0.86, 0.72, 0.58, 0.44, 0.3]) {
        const blob = await canvasToJpeg(canvas, quality);
        if (blob.size <= MAX_COVER_BYTES) {
          return new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "cover"}.jpg`, {
            type: "image/jpeg",
            lastModified: Date.now(),
          });
        }
      }

      scale *= 0.75;
    }

    throw new Error("Could not compress the image below 1 MB. Try a smaller image.");
  } finally {
    image.close();
  }
}
