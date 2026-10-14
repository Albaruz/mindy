import { useState } from "react";
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
import { useNotificationStore } from "@/features/ui/useNotificationStore";
import { MAX_UPLOAD_FILE_SIZE_BYTES } from "@/constants/validation";
import { GARMENTS_QUERY_KEY } from "./useClosetQuery";
import { toDownscaledDataUrl } from "./garmentImage";
import { removeBackgroundWithFallback } from "./backgroundRemoval";
import {
  persistGarment,
  GARMENT_STORAGE_BUCKET,
} from "./garmentPersistence";
import type { InferredTags } from "./garmentAnalysis";
import { suggestTags } from "./garmentAnalysis";

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

  async function saveGarment(source: Blob, tags: InferredTags): Promise<void> {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("You must be signed in to add garments.");
    }
    await persistGarment(source, tags, {
      client: supabase,
      userId: user.id,
      invalidateGarments: () =>
        queryClient.invalidateQueries({ queryKey: GARMENTS_QUERY_KEY }),
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

      await saveGarment(png, tags);
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
      await saveGarment(png, qualityGate.tags);
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
      await saveGarment(qualityGate.file, qualityGate.tags);
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
