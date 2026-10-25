import { useState } from "react";
import { QUERY_KEYS } from "@/constants/query";
import { useLocale, useTranslations } from "next-intl";
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
import { useNotificationStore } from "@/stores/useNotificationStore";
import { MAX_UPLOAD_FILE_SIZE_BYTES } from "@/constants/validation";
import { toDownscaledDataUrl } from "../../services/images/garmentImage";
import {
  persistGarment,
  GARMENT_STORAGE_BUCKET,
} from "../../services/persistence/garmentPersistence";
import type { InferredTags } from "../../domain/garments/garmentAnalysis";
import { suggestTags } from "../../domain/garments/garmentAnalysis";
import { requireUser } from "@/lib/supabase/session";

export { GARMENT_STORAGE_BUCKET };
export type { InferredTags };

export type UploadPhase = "idle" | "processing";

export interface QualityGateRequest {
  file: File;
  tags: InferredTags;
}

export interface GarmentFormInput {
  garmentType: GarmentType | "";
  season: GarmentSeason | "";
  color: GarmentColor | "";
  material: GarmentMaterial | "";
  style: GarmentStyle | "";
  cutLength: GarmentCut | "";
  styles?: GarmentStyle[];
  cuts?: GarmentCut[];
  // Free-form extra tags edited as chips (aiCategory, color_base, ...).
  extraTags: Record<string, string>;
}

// Analyze the original photo first. Difficult images pause for an explicit
// user choice; normal images are saved as-is so background removal never blocks
// the default upload flow.
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

  async function saveGarment(source: Blob, tags: InferredTags): Promise<void> {
    const supabase = createClient();
    const user = await requireUser(supabase, "You must be signed in to add garments.");
    await persistGarment(source, tags, {
      client: supabase,
      userId: user.id,
      invalidateGarments: () =>
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.garments }),
      onProgress: setProgressNote,
      progressResizing: t("uploadResizing"),
      progressUploading: t("uploadUploading"),
    });
  }

  async function processPhoto(file: File): Promise<void> {
    if (!file.type.startsWith("image/")) {
      addNotification("error", t("chooseImage"));
      return;
    }
    if (file.size > MAX_UPLOAD_FILE_SIZE_BYTES) {
      addNotification("error", t("tooBig"));
      return;
    }

    setQualityGate(null);
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

      setProgressNote(t("uploadUploading"));
      await saveGarment(file, tags);
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

  async function useOriginalPhoto(): Promise<void> {
    if (qualityGate === null || phase === "processing") {
      return;
    }
    setPhase("processing");
    try {
      setProgressNote(t("uploadUploading"));
      // Normalize JPEG/WebP/PNG to the bucket's image/png policy.
      await saveGarment(qualityGate.file, qualityGate.tags);
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

  function dismissQualityGate(): void {
    if (phase === "processing") {
      return;
    }
    setQualityGate(null);
  }

  return {
    phase,
    progressNote,
    processPhoto,
    qualityGate,
    useOriginalPhoto,
    dismissQualityGate,
  };
}
