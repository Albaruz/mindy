import { useState } from "react";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type {
  GarmentColor,
  GarmentCut,
  GarmentMaterial,
  GarmentSeason,
  GarmentStyle,
  GarmentType,
} from "@/types/garment";
import {
  normalizeGarmentColor,
  normalizeGarmentCut,
  normalizeGarmentMaterial,
  normalizeGarmentSeason,
  normalizeGarmentStyle,
  normalizeGarmentType,
} from "./garmentOptions";
import { useNotificationStore } from "@/features/ui/useNotificationStore";
import { GARMENTS_QUERY_KEY } from "./useClosetQuery";

export const GARMENT_STORAGE_BUCKET = "garments";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ANALYZE_TIMEOUT_MS = 30000;
const ANALYZE_MAX_DIMENSION_PX = 1024;
// Storage width for uploaded garments: keeps every file light while
// looking sharp on cards and the edit preview.
const UPLOAD_WIDTH_PX = 300;

export type UploadPhase = "idle" | "processing";

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

interface InferredTags {
  category: GarmentType | "";
  garmentType: GarmentType | "";
  season: GarmentSeason | "";
  color: GarmentColor | "";
  material: GarmentMaterial | "";
  style: GarmentStyle | "";
  cutLength: GarmentCut | "";
  // Raw details preserved in extra_tags when the AI returns a shade or
  // specific name outside the closed base (turquoise, sneakers, ...).
  typeDetail: string;
  colorShade: string;
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
};

// Automatic upload pipeline: background removal, AI tagging (Groq vision
// over a downscaled base64 copy), resize to 300 px wide, then Storage
// upload and save with the inferred tags. No mandatory form: the user
// refines tags later through the edit action on each card.
export function useUploadGarment() {
  const queryClient = useQueryClient();
  const { addNotification } = useNotificationStore.getState();
  const t = useTranslations("Notifications");
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [progressNote, setProgressNote] = useState<string | null>(null);

  async function processPhoto(file: File): Promise<void> {
    if (!file.type.startsWith("image/")) {
      addNotification("error", t("chooseImage"));
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      addNotification("error", t("tooBig"));
      return;
    }

    setPhase("processing");
    try {
      setProgressNote(t("uploadRemoving"));
      const { removeBackground } = await import("@imgly/background-removal");
      const png = await removeBackground(file, {
        output: { format: "image/png", quality: 1 },
      });

      setProgressNote(t("uploadTagging"));
      const tags = await suggestTags(await toDownscaledDataUrl(png));

      setProgressNote(t("uploadResizing"));
      const uploadBlob = await resizeToWidth(png, UPLOAD_WIDTH_PX);

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

      const { error: insertError } = await supabase.from("garments").insert({
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
      setProgressNote(null);
      addNotification("success", t("added"));
      setPhase("idle");
    } catch (err) {
      setProgressNote(null);
      addNotification(
        "error",
        err instanceof Error
          ? err.message
          : "Could not process the photo. Try another one.",
      );
      setPhase("idle");
    }
  }

  return { phase, progressNote, processPhoto };
}

// Resizes the processed PNG down to the given width so Storage uploads
// stay light. Never upscales: small images are returned untouched.
// PNG output preserves the cutout transparency.
async function resizeToWidth(blob: Blob, targetWidthPx: number): Promise<Blob> {
  const bitmap = await createImageBitmap(blob);
  try {
    const scale = Math.min(1, targetWidthPx / bitmap.width);
    if (scale === 1) {
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

// Downscales the processed PNG so the vision payload stays small.
// Transparency is preserved (PNG), which helps the tagging model.
async function toDownscaledDataUrl(blob: Blob): Promise<string> {
  const bitmap = await createImageBitmap(blob);
  try {
    const scale = Math.min(
      1,
      ANALYZE_MAX_DIMENSION_PX / Math.max(bitmap.width, bitmap.height),
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

async function suggestTags(imageBase64: string): Promise<InferredTags> {
  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64 }),
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
    };
  } catch {
    return EMPTY_TAGS;
  }
}
