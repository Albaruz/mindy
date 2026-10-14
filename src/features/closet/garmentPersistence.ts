import type { SupabaseClient } from "@supabase/supabase-js";
import { GARMENT_UPLOAD_WIDTH_PX } from "@/constants/validation";
import { STORAGE_BUCKETS, TABLES } from "@/constants/storage";
import { resizeToWidth } from "./garmentImage";
import { buildVisionExtraTags } from "./garmentMappers";
import type { InferredTags } from "./garmentAnalysis";

// Storage bucket for garment photos. Re-exported from centralized
// constants for backward compatibility.
export const GARMENT_STORAGE_BUCKET = STORAGE_BUCKETS.garments;

export interface PersistGarmentDeps {
  client: SupabaseClient;
  userId: string;
  invalidateGarments: () => Promise<void>;
  onProgress: (note: string) => void;
  progressResizing: string;
  progressUploading: string;
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

  deps.onProgress(deps.progressUploading);

  const path = `${deps.userId}/${crypto.randomUUID()}.png`;
  const { error: uploadError } = await deps.client.storage
    .from(GARMENT_STORAGE_BUCKET)
    .upload(path, uploadBlob, {
      contentType: "image/png",
      upsert: false,
    });
  if (uploadError) {
    throw uploadError;
  }
  const imageUrl = deps.client.storage
    .from(GARMENT_STORAGE_BUCKET)
    .getPublicUrl(path).data.publicUrl;

  const { error: insertError } = await deps.client
    .from(TABLES.garments)
    .insert({
      user_id: deps.userId,
      image_url: imageUrl,
      garment_type: tags.garmentType === "" ? null : tags.garmentType,
      style: tags.style === "" ? null : tags.style,
      cut_length: tags.cutLength === "" ? null : tags.cutLength,
      color: tags.color === "" ? null : tags.color,
      material: tags.material === "" ? null : tags.material,
      season: tags.season === "" ? null : tags.season,
      extra_tags: buildVisionExtraTags({
        category: tags.category,
        color: tags.color,
        typeDetail: tags.typeDetail,
        colorShade: tags.colorShade,
      }),
    });
  if (insertError) {
    throw insertError;
  }

  await deps.invalidateGarments();
}
