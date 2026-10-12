import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type {
  CutoutDifficulty,
  GarmentColor,
  GarmentCut,
  GarmentMaterial,
  GarmentSeason,
  GarmentStyle,
  GarmentType,
} from "@/types/garment";
import { CUTOUT_DIFFICULTY_VALUES } from "@/types/garment";
import {
  normalizeGarmentColor,
  normalizeGarmentCut,
  normalizeGarmentMaterial,
  normalizeGarmentSeason,
  normalizeGarmentStyle,
  normalizeGarmentType,
} from "./garmentOptions";
import { useNotificationStore } from "@/features/ui/useNotificationStore";
import { API_ROUTES } from "@/constants/api";
import { MAX_IMAGE_PROCESSING_DIMENSION_PX } from "@/constants/validation";
import { STORAGE_BUCKETS, TABLES } from "@/constants/storage";
import { GARMENTS_QUERY_KEY } from "./useClosetQuery";

// Storage bucket for garment photos. Re-exported from centralized
// constants for backward compatibility.
export const GARMENT_STORAGE_BUCKET = STORAGE_BUCKETS.garments;

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ANALYZE_TIMEOUT_MS = 30000;
// Storage width for uploaded garments: keeps every file light while
// looking sharp on cards and the edit preview.
const UPLOAD_WIDTH_PX = 300;

export type UploadPhase = "idle" | "processing";

export interface InferredTags {
  category: GarmentType | "";
  garmentType: GarmentType | "";
  season: GarmentSeason | "";
  color: GarmentColor | "";
  material: GarmentMaterial | "";
  style: GarmentStyle | "";
  cutLength: GarmentCut | "";
  typeDetail: string;
  colorShade: string;
  cutoutDifficulty: CutoutDifficulty | "";
  qualityNote: string;
  visualDescription: string;
}

export interface QualityGateRequest {
  file: File;
  tags: InferredTags;
}

const EMPTY_TAGS: InferredTags = {
  category: "",
  garmentType: "",
  season: "",
  color: "",
  material: "",
  style: "",
  cutLength: "",
  typeDetail: "",
  colorShade: "",
  cutoutDifficulty: "",
  qualityNote: "",
  visualDescription: "",
};

export interface GarmentFormInput {
  garmentType: GarmentType | "";
  season: GarmentSeason | "";
  color: GarmentColor | "";
  material: GarmentMaterial | "";
  style: GarmentStyle | "";
  cutLength: GarmentCut | "";
  // Free-form extra tags edited as chips (aiCategory, color_base, ...).
  extraTags: Record<string, string>;
}

// Analyze the original photo first. Difficult images pause for an explicit
// user choice; good images keep the usual automatic background-removal flow.
export function useUploadGarment() {
  const queryClient = useQueryClient();
  const { addNotification } = useNotificationStore.getState();
  const locale = useLocale();
  const t = useTranslations("Notifications");
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [progressNote, setProgressNote] = useState<string | null>(null);
  const [qualityGate, setQualityGate] = useState<QualityGateRequest | null>(
    null,
  );
  const [cutoutFailed, setCutoutFailed] = useState(false);

  async function persistGarment(source: Blob, tags: InferredTags): Promise<void> {
    setProgressNote(t("uploadResizing"));
    const uploadBlob = await resizeToWidth(source, UPLOAD_WIDTH_PX);

    setProgressNote(t("uploadUploading"));
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("You must be signed in to add garments.");
    }

    const path = `${user.id}/${crypto.randomUUID()}.png`;
    const { error: uploadError } = await supabase.storage
      .from(GARMENT_STORAGE_BUCKET)
      .upload(path, uploadBlob, {
        contentType: "image/png",
        upsert: false,
      });
    if (uploadError) {
      throw uploadError;
    }
    const imageUrl = supabase.storage
      .from(GARMENT_STORAGE_BUCKET)
      .getPublicUrl(path).data.publicUrl;

    const { error: insertError } = await supabase.from(TABLES.garments).insert({
      user_id: user.id,
      image_url: imageUrl,
      garment_type: tags.garmentType === "" ? null : tags.garmentType,
      style: tags.style === "" ? null : tags.style,
      cut_length: tags.cutLength === "" ? null : tags.cutLength,
      color: tags.color === "" ? null : tags.color,
      material: tags.material === "" ? null : tags.material,
      season: tags.season === "" ? null : tags.season,
      extra_tags: {
        ...(tags.category === "" ? {} : { aiCategory: tags.category }),
        ...(tags.typeDetail === "" ? {} : { specificType: tags.typeDetail }),
        ...(tags.colorShade === "" ? {} : { colorShade: tags.colorShade }),
      },
    });
    if (insertError) {
      throw insertError;
    }

    await queryClient.invalidateQueries({ queryKey: GARMENTS_QUERY_KEY });
  }

  async function processPhoto(file: File): Promise<void> {
    if (!file.type.startsWith("image/")) {
      addNotification("error", t("chooseImage"));
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      addNotification("error", t("tooBig"));
      return;
    }

    setQualityGate(null);
    setCutoutFailed(false);
    setPhase("processing");
    try {
      // Vision must see the original: its background, contrast, lighting and
      // framing are needed for the cutout-quality decision.
      setProgressNote(t("uploadTagging"));
      const tags = await suggestTags(
        await toDownscaledDataUrl(file),
        locale === "es" ? "es" : "en",
      );
      if (tags.cutoutDifficulty === "hard") {
        setQualityGate({ file, tags });
        return;
      }

      setProgressNote(t("uploadRemoving"));
      let png: Blob;
      try {
        png = await removeBackgroundWithFallback(file, () =>
          setProgressNote(t("uploadRemovingFallback")),
        );
      } catch {
        setQualityGate({ file, tags });
        setCutoutFailed(true);
        return;
      }

      await persistGarment(png, tags);
      addNotification("success", t("added"));
    } catch (err) {
      addNotification(
        "error",
        err instanceof Error
          ? err.message
          : "Could not process the photo. Try another one.",
      );
    } finally {
      setProgressNote(null);
      setPhase("idle");
    }
  }

  async function removeBackground(): Promise<void> {
    if (qualityGate === null || phase === "processing") {
      return;
    }
    setPhase("processing");
    setCutoutFailed(false);
    try {
      setProgressNote(t("uploadRemoving"));
      let png: Blob;
      try {
        png = await removeBackgroundWithFallback(qualityGate.file, () =>
          setProgressNote(t("uploadRemovingFallback")),
        );
      } catch {
        setCutoutFailed(true);
        return;
      }
      await persistGarment(png, qualityGate.tags);
      setQualityGate(null);
      addNotification("success", t("added"));
    } catch (err) {
      addNotification(
        "error",
        err instanceof Error ? err.message : t("uploadFailed"),
      );
    } finally {
      setProgressNote(null);
      setPhase("idle");
    }
  }

  async function useOriginalPhoto(): Promise<void> {
    if (qualityGate === null || phase === "processing") {
      return;
    }
    setPhase("processing");
    try {
      setProgressNote(t("uploadUploading"));
      // Normalize JPEG/WebP/PNG to the bucket's image/png policy.
      await persistGarment(qualityGate.file, qualityGate.tags);
      setQualityGate(null);
      setCutoutFailed(false);
      addNotification("success", t("added"));
    } catch (err) {
      addNotification(
        "error",
        err instanceof Error ? err.message : t("uploadFailed"),
      );
    } finally {
      setProgressNote(null);
      setPhase("idle");
    }
  }

  function dismissQualityGate(): void {
    if (phase === "processing") {
      return;
    }
    setQualityGate(null);
    setCutoutFailed(false);
  }

  return {
    phase,
    progressNote,
    processPhoto,
    qualityGate,
    cutoutFailed,
    removeBackground,
    useOriginalPhoto,
    dismissQualityGate,
  };
}

// Resizes to the upload width and always emits PNG, including original-photo
// uploads, to satisfy the garment Storage bucket's MIME policy.
async function resizeToWidth(blob: Blob, targetWidthPx: number): Promise<Blob> {
  const bitmap = await createImageBitmap(blob);
  try {
    const scale = Math.min(1, targetWidthPx / bitmap.width);
    if (scale === 1 && blob.type === "image/png") {
      return blob;
    }
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas is not available.");
    }
    context.drawImage(bitmap, 0, 0, width, height);
    const resized = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    if (!resized) {
      throw new Error("Could not resize the image.");
    }
    return resized;
  } finally {
    bitmap.close();
  }
}

async function removeBackgroundWithFallback(
  file: File,
  onFallback: () => void,
): Promise<Blob> {
  const processingImage = await downscaleForBackgroundRemoval(
    file,
    MAX_IMAGE_PROCESSING_DIMENSION_PX,
  );
  try {
    return await removeBackgroundInWorker(processingImage, {
      output: { format: "image/png", quality: 1 },
    });
  } catch (workerErr) {
    console.warn(
      "[useUploadGarment] Worker failed, falling back to main thread:",
      workerErr,
    );
    onFallback();
    try {
      return await removeBackgroundFallback(processingImage, {
        output: { format: "image/png", quality: 1 },
      });
    } catch (fallbackError) {
      console.error(
        "[useUploadGarment] Background removal failed in both worker and fallback:",
        { workerErr, fallbackError },
      );
      throw fallbackError;
    }
  }
}

async function downscaleForBackgroundRemoval(
  source: Blob,
  maxDimensionPx: number,
): Promise<Blob> {
  const bitmap = await createImageBitmap(source);
  try {
    const scale = Math.min(
      1,
      maxDimensionPx / Math.max(bitmap.width, bitmap.height),
    );
    if (scale === 1) {
      return source;
    }

    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (context === null) {
      throw new Error("Canvas is not available.");
    }
    context.drawImage(bitmap, 0, 0, width, height);
    const resized = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    if (resized === null) {
      throw new Error("Could not prepare the image for background removal.");
    }
    return resized;
  } finally {
    bitmap.close();
  }
}

// Downscales the processed PNG so the vision payload stays small.
// Transparency is preserved (PNG), which helps the tagging model.
async function toDownscaledDataUrl(blob: Blob): Promise<string> {
  const bitmap = await createImageBitmap(blob);
  try {
    const scale = Math.min(
      1,
      MAX_IMAGE_PROCESSING_DIMENSION_PX / Math.max(bitmap.width, bitmap.height),
    );
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas is not available.");
    }
    context.drawImage(bitmap, 0, 0, width, height);
    return canvas.toDataURL("image/png");
  } finally {
    bitmap.close();
  }
}

function readClosedTag<T extends string>(
  value: unknown,
  normalize: (raw: unknown) => { base: T | null; detail: string | null },
): T | "" {
  const { base } = normalize(value);
  return base ?? "";
}

function readDetail(
  value: unknown,
  normalize: (raw: unknown) => { base: string | null; detail: string | null },
): string {
  const { detail } = normalize(value);
  return detail ?? "";
}

async function suggestTags(
  imageBase64: string,
  locale: "en" | "es",
): Promise<InferredTags> {
  try {
    const response = await fetch(API_ROUTES.analyze, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64, locale }),
      signal: AbortSignal.timeout(ANALYZE_TIMEOUT_MS),
    });
    if (!response.ok) {
      return EMPTY_TAGS;
    }
    const payload: unknown = await response.json();
    if (typeof payload !== "object" || payload === null) {
      return EMPTY_TAGS;
    }
    const record = payload as Record<string, unknown>;
    // Closed bases go to columns; shades/specific names fall back to
    // extra_tags via the normalizer (turquoise -> blue + shade).
    const typeValue = record.garmentType ?? record.type;
    const colorValue = record.color;
    return {
      category: readClosedTag(record.category, normalizeGarmentType),
      garmentType: readClosedTag(typeValue, normalizeGarmentType),
      season: readClosedTag(record.season, normalizeGarmentSeason),
      color: readClosedTag(colorValue, normalizeGarmentColor),
      material: readClosedTag(record.material, normalizeGarmentMaterial),
      style: readClosedTag(record.style, normalizeGarmentStyle),
      cutLength: readClosedTag(record.cutLength, normalizeGarmentCut),
      typeDetail:
        readDetail(record.typeDetail ?? record.specificType, normalizeGarmentType) ||
        readDetail(typeValue, normalizeGarmentType),
      colorShade:
        readDetail(record.colorDetail ?? record.shade, normalizeGarmentColor) ||
        readDetail(colorValue, normalizeGarmentColor),
      cutoutDifficulty:
        typeof record.cutoutDifficulty === "string" &&
        (CUTOUT_DIFFICULTY_VALUES as readonly string[]).includes(
          record.cutoutDifficulty,
        )
          ? (record.cutoutDifficulty as CutoutDifficulty)
          : "",
      qualityNote:
        typeof record.qualityNote === "string" ? record.qualityNote : "",
      visualDescription:
        typeof record.visualDescription === "string"
          ? record.visualDescription
          : "",
    };
  } catch {
    return EMPTY_TAGS;
  }
}

// Runs @imgly/background-removal in a Web Worker to avoid blocking the main thread.
// The worker loads the UMD build from jsDelivr CDN (cached by browser).
async function removeBackgroundInWorker(
  file: Blob,
  options: { output: { format: "image/png"; quality: number } }
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const worker = new Worker("/bg-removal-worker.js");
    let ready = false;

    worker.onmessage = (event) => {
      const data = event.data;
      
      // Worker signals initialization failed
      if (data.ready === false) {
        reject(new Error(data.error || 'Worker initialization failed'));
        worker.terminate();
        return;
      }
      
      // Worker signals it's ready
      if (data.ready === true) {
        ready = true;
        worker.postMessage({ imageBlob: file, options });
        return;
      }

      const { success, result, error } = data;
      if (success) {
        resolve(result);
      } else {
        reject(new Error(error || 'Unknown worker error'));
      }
      worker.terminate();
    };
    worker.onerror = (err) => {
      // err is ErrorEvent: use err.message (empty string) or err.filename + err.lineno
      const msg = err.message || (err.filename ? `${err.filename}:${err.lineno}` : 'Worker script error');
      reject(new Error(`Worker error: ${msg}`));
      worker.terminate();
    };

    // Timeout in case worker never signals ready
    setTimeout(() => {
      if (!ready) {
        reject(new Error('Worker failed to initialize (timeout)'));
        worker.terminate();
      }
    }, 10000);
  });
}

// Fallback: original dynamic import on main thread (used if worker fails)
async function removeBackgroundFallback(
  file: Blob,
  options: { output: { format: "image/png"; quality: number } }
): Promise<Blob> {
  const { removeBackground } = await import("@imgly/background-removal");
  return removeBackground(file, options);
}
