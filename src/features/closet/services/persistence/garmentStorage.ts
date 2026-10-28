import type { SupabaseClient } from "@supabase/supabase-js";
import { STORAGE_BUCKETS } from "@/constants/storage";
import { GARMENT_UPLOAD_WIDTH_PX } from "@/constants/validation";
import { resizeToWidth } from "../images/garmentImage";

export const GARMENT_STORAGE_BUCKET = STORAGE_BUCKETS.garments;

type StorageClient = Pick<SupabaseClient, "storage">;

export interface UploadedGarmentImage {
  path: string;
  imageUrl: string;
}

/** Resizes and stores one garment image in the shared PNG bucket. */
export async function uploadGarmentImage(
  client: StorageClient,
  userId: string,
  source: Blob,
): Promise<UploadedGarmentImage> {
  const blob = await resizeToWidth(source, GARMENT_UPLOAD_WIDTH_PX);
  return storeGarmentImageBlob(client, userId, blob);
}

/** Stores a pre-resized PNG produced by the persistence pipeline. */
export async function storeGarmentImageBlob(
  client: StorageClient,
  userId: string,
  blob: Blob,
): Promise<UploadedGarmentImage> {
  const path = `${userId}/${crypto.randomUUID()}.png`;
  const { error } = await client.storage.from(GARMENT_STORAGE_BUCKET).upload(path, blob, {
    contentType: "image/png",
    upsert: false,
  });
  if (error) {
    throw error;
  }
  return {
    path,
    imageUrl: client.storage.from(GARMENT_STORAGE_BUCKET).getPublicUrl(path).data.publicUrl,
  };
}

/** Extracts a path only from this app's public garments-bucket URLs. */
export function getGarmentStoragePath(
  imageUrl: string | null | undefined,
): string | null {
  if (!imageUrl) {
    return null;
  }
  const marker = `/object/public/${GARMENT_STORAGE_BUCKET}/`;
  const markerIndex = imageUrl.indexOf(marker);
  if (markerIndex < 0) {
    return null;
  }
  const path = imageUrl.slice(markerIndex + marker.length).split("?")[0];
  return path || null;
}

/** Removes each distinct object path, returning failures for caller logging. */
export async function removeGarmentStoragePaths(
  client: StorageClient,
  paths: readonly string[],
): Promise<unknown | null> {
  const uniquePaths = [...new Set(paths.filter(Boolean))];
  if (uniquePaths.length === 0) {
    return null;
  }
  try {
    const { error } = await client.storage
      .from(GARMENT_STORAGE_BUCKET)
      .remove(uniquePaths);
    return error;
  } catch (error) {
    return error;
  }
}
