import type { SupabaseClient } from "@supabase/supabase-js";
import { GARMENT_UPLOAD_WIDTH_PX } from "@/constants/validation";
import { TABLES, USER_ID_COLUMN } from "@/constants/storage";
import { resizeToWidth } from "../images/garmentImage";
import { buildVisionExtraTags } from "@/lib/garment/garmentMappers";
import type { InferredTags } from "../../domain/garments/garmentAnalysis";
import { logger } from "@/lib/logger";
import {
  removeGarmentStoragePaths,
  storeGarmentImageBlob,
} from "./garmentStorage";

export interface PersistGarmentDeps {
  client: SupabaseClient;
  userId: string;
  invalidateGarments: () => Promise<void>;
  onProgress: (note: string) => void;
  progressResizing: string;
  progressUploading: string;
  isCancelled?: () => boolean;
}

async function removeUploadedImage(
  client: SupabaseClient,
  path: string,
  userId: string,
): Promise<void> {
  const error = await removeGarmentStoragePaths(client, [path]);
  if (error) {
    logger.warn("Uploaded garment image cleanup failed", { userId, error });
  }
}

// Resizes, uploads and inserts a garment row. Throws on auth, storage
// or database failures so the caller can surface the error.
export async function persistGarment(
  source: Blob,
  tags: InferredTags,
  deps: PersistGarmentDeps,
): Promise<void> {
  deps.onProgress(deps.progressResizing);
  const uploadBlob = await resizeToWidth(source, GARMENT_UPLOAD_WIDTH_PX);
  if (deps.isCancelled?.()) {
    throw new Error("Upload was cancelled.");
  }

  deps.onProgress(deps.progressUploading);

  const { path, imageUrl } = await storeGarmentImageBlob(
    deps.client,
    deps.userId,
    uploadBlob,
  );
  if (deps.isCancelled?.()) {
    await removeUploadedImage(deps.client, path, deps.userId);
    throw new Error("Upload was cancelled.");
  }
  const { error: insertError } = await deps.client
    .from(TABLES.garments)
    .insert({
      user_id: deps.userId,
      image_url: imageUrl,
      original_image_url: imageUrl,
      garment_type: tags.garmentType === "" ? null : tags.garmentType,
      style: tags.style === "" ? null : tags.style,
      cut_length: tags.cutLength === "" ? null : tags.cutLength,
      styles: tags.styles ?? (tags.style === "" ? [] : [tags.style]),
      cut_lengths: tags.cuts ?? (tags.cutLength === "" ? [] : [tags.cutLength]),
      color: tags.color === "" ? null : tags.color,
      material: tags.material === "" ? null : tags.material,
      season: tags.season === "" ? null : tags.season,
      extra_tags: buildVisionExtraTags({
        category: tags.category,
        color: tags.color,
        typeDetail: tags.typeDetail,
        colorShade: tags.colorShade,
        secondaryColor: tags.secondaryColor,
        print: tags.print,
        visualDescription: tags.visualDescription,
      }),
    });
  if (insertError) {
    await removeUploadedImage(deps.client, path, deps.userId);
    throw insertError;
  }

  if (deps.isCancelled?.()) {
    const { error: deleteError } = await deps.client
      .from(TABLES.garments)
      .delete()
      .eq(USER_ID_COLUMN, deps.userId)
      .eq("image_url", imageUrl);
    if (deleteError) {
      logger.warn("Cancelled garment row cleanup failed", {
        userId: deps.userId,
        error: deleteError,
      });
    }
    await removeUploadedImage(deps.client, path, deps.userId);
    throw new Error("Upload was cancelled.");
  }

  try {
    await deps.invalidateGarments();
  } catch (error) {
    // Cache invalidation happens after the database commit and must not make
    // callers retry an insert that already succeeded.
    logger.warn("Garment cache invalidation failed after save", {
      userId: deps.userId,
      error,
    });
  }
}
