import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { QUERY_KEYS } from "@/constants/query";
import { TABLES, USER_ID_COLUMN } from "@/constants/storage";
import { createClient } from "@/lib/supabase/client";
import { requireUser } from "@/lib/supabase/session";
import type { Garment } from "@/types/garment";
import { removeBackgroundWithFallback } from "./backgroundRemoval";
import { resizeToWidth } from "./garmentImage";
import { GARMENT_STORAGE_BUCKET } from "./garmentPersistence";
import { GARMENT_UPLOAD_WIDTH_PX } from "@/constants/validation";
import { useNotificationStore } from "@/stores/useNotificationStore";

function storagePath(url: string | null | undefined): string | null {
  if (!url) return null;
  const marker = `/object/public/${GARMENT_STORAGE_BUCKET}/`;
  const index = url.indexOf(marker);
  return index === -1 ? null : url.slice(index + marker.length).split("?")[0] || null;
}

async function uploadImage(client: ReturnType<typeof createClient>, userId: string, source: Blob) {
  const blob = await resizeToWidth(source, GARMENT_UPLOAD_WIDTH_PX);
  const path = `${userId}/${crypto.randomUUID()}.png`;
  const { error } = await client.storage.from(GARMENT_STORAGE_BUCKET).upload(path, blob, {
    contentType: "image/png",
    upsert: false,
  });
  if (error) throw error;
  return client.storage.from(GARMENT_STORAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}

export function useGarmentImageActions() {
  const queryClient = useQueryClient();
  const t = useTranslations("Notifications");
  const notify = useNotificationStore.getState().addNotification;

  const mutation = useMutation({
    mutationFn: async ({ garment, file, removeBackground }: {
      garment: Garment;
      file?: File;
      removeBackground?: boolean;
    }): Promise<{ imageUrl: string; originalImageUrl: string }> => {
      const client = createClient();
      const user = await requireUser(client, "You must be signed in to edit garment images.");
      let source: Blob;
      if (removeBackground) {
        const sourceUrl = garment.originalImageUrl ?? garment.imageUrl;
        if (!sourceUrl) throw new Error("The garment has no source image.");
        const response = await fetch(sourceUrl);
        if (!response.ok) throw new Error("Could not read the original garment image.");
        source = await removeBackgroundWithFallback(await response.blob(), () => undefined);
      } else {
        if (!file) throw new Error("Choose an image first.");
        source = file;
      }

      const nextUrl = await uploadImage(client, user.id, source);
      const update = removeBackground
        ? { image_url: nextUrl }
        : { image_url: nextUrl, original_image_url: nextUrl };
      const { error } = await client
        .from(TABLES.garments)
        .update(update)
        .eq("garment_id", garment.garmentId)
        .eq(USER_ID_COLUMN, user.id);
      if (error) throw error;

      const oldPaths = removeBackground
        ? garment.imageUrl !== (garment.originalImageUrl ?? garment.imageUrl)
          ? [storagePath(garment.imageUrl)]
          : []
        : [storagePath(garment.imageUrl), storagePath(garment.originalImageUrl)];
      const paths = oldPaths.filter((path): path is string => path !== null);
      if (paths.length > 0) await client.storage.from(GARMENT_STORAGE_BUCKET).remove(paths);

      return {
        imageUrl: nextUrl,
        originalImageUrl: removeBackground
          ? garment.originalImageUrl ?? garment.imageUrl ?? nextUrl
          : nextUrl,
      };
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.garments });
      notify("success", variables.removeBackground ? t("backgroundRemoved") : t("imageUpdated"));
    },
    onError: (error) => notify("error", error instanceof Error ? error.message : t("imageUpdateFailed")),
  });

  return mutation;
}
