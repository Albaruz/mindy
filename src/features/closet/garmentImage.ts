import { MAX_IMAGE_PROCESSING_DIMENSION_PX } from "@/constants/validation";

// Client-side image preparation for the closet flow. Every helper draws
// through the same bitmap pipeline so canvas handling stays in one place.

async function withBitmap<T>(
  blob: Blob,
  run: (bitmap: ImageBitmap) => Promise<T>,
): Promise<T> {
  const bitmap = await createImageBitmap(blob);
  try {
    return await run(bitmap);
  } finally {
    bitmap.close();
  }
}

function drawScaled(
  bitmap: ImageBitmap,
  scale: number,
): HTMLCanvasElement | null {
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    return null;
  }
  context.drawImage(bitmap, 0, 0, width, height);
  return canvas;
}

function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png"),
  ).then((resized) => {
    if (!resized) {
      throw new Error("Could not resize the image.");
    }
    return resized;
  });
}

// Resizes to the upload width and always emits PNG, including
// original-photo uploads, to satisfy the garment Storage bucket's MIME policy.
export async function resizeToWidth(
  blob: Blob,
  targetWidthPx: number,
): Promise<Blob> {
  return withBitmap(blob, async (bitmap) => {
    const scale = Math.min(1, targetWidthPx / bitmap.width);
    if (scale === 1 && blob.type === "image/png") {
      return blob;
    }
    const canvas = drawScaled(bitmap, scale);
    if (!canvas) {
      throw new Error("Canvas is not available.");
    }
    return canvasToPng(canvas);
  });
}

// Downscales large originals so background removal stays fast.
export async function downscaleToMaxDimension(
  source: Blob,
  maxDimensionPx: number,
): Promise<Blob> {
  return withBitmap(source, async (bitmap) => {
    const scale = Math.min(
      1,
      maxDimensionPx / Math.max(bitmap.width, bitmap.height),
    );
    if (scale === 1) {
      return source;
    }
    const canvas = drawScaled(bitmap, scale);
    if (!canvas) {
      throw new Error("Canvas is not available.");
    }
    const resized = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    if (resized === null) {
      throw new Error("Could not prepare the image for background removal.");
    }
    return resized;
  });
}

// Downscales the original photo so the vision payload stays small. JPEG is
// intentional here: the original background is useful to Vision and JPEG is
// substantially smaller than PNG for camera photos.
export async function toDownscaledDataUrl(blob: Blob): Promise<string> {
  return withBitmap(blob, async (bitmap) => {
    const scale = Math.min(
      1,
      MAX_IMAGE_PROCESSING_DIMENSION_PX /
        Math.max(bitmap.width, bitmap.height),
    );
    const canvas = drawScaled(bitmap, scale);
    if (!canvas) {
      throw new Error("Canvas is not available.");
    }
    return canvas.toDataURL("image/jpeg", 0.85);
  });
}
