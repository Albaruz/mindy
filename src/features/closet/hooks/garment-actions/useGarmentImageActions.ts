import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { QUERY_KEYS } from "@/constants/query";
import { TABLES, USER_ID_COLUMN } from "@/constants/storage";
import { createClient } from "@/lib/supabase/client";
import { requireUser } from "@/lib/supabase/session";
import type { Garment } from "@/types/garment";
import { removeBackgroundWithFallback } from "../../services/images/backgroundRemoval";
import {
  getGarmentStoragePath,
  removeGarmentStoragePaths,
  uploadGarmentImage,
} from "../../services/persistence/garmentStorage";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { logger } from "@/lib/logger";

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

      const uploaded = await uploadGarmentImage(client, user.id, source);
      const nextUrl = uploaded.imageUrl;
      const update = removeBackground
        ? { image_url: nextUrl }
        : { image_url: nextUrl, original_image_url: nextUrl };
      try {
        const { data, error } = await client
          .from(TABLES.garments)
          .update(update)
          .eq("garment_id", garment.garmentId)
          .eq(USER_ID_COLUMN, user.id)
          .select("garment_id")
          .maybeSingle();
        if (error) throw error;
        if (data === null) throw new Error("Garment not found.");
      } catch (error) {
        const cleanupError = await removeGarmentStoragePaths(client, [uploaded.path]);
        if (cleanupError) {
          logger.warn("Replacement garment image cleanup failed", {
            userId: user.id,
            error: cleanupError,
          });
        }
        throw error;
      }

      const oldPaths = removeBackground
        ? garment.imageUrl !== (garment.originalImageUrl ?? garment.imageUrl)
          ? [getGarmentStoragePath(garment.imageUrl)]
          : []
        : [
            getGarmentStoragePath(garment.imageUrl),
            getGarmentStoragePath(garment.originalImageUrl),
          ];
       // A newly created garment normally stores the same URL in both columns.
       // Delete each old object once; duplicate paths can make Storage reject
       // an otherwise successful image replacement.
        const paths = [
          ...new Set(oldPaths.filter((path): path is string => path !== null)),
        ];
        if (paths.length > 0) {
          const cleanupError = await removeGarmentStoragePaths(client, paths);
         // The database now points at the new image. A cleanup failure should
         // not tell the user that replacing the image failed or roll back the
         // already persisted change.
          if (cleanupError) {
            logger.warn("Could not remove the previous garment image", {
              userId: user.id,
              error: cleanupError,
            });
          }
       }

      return {
        imageUrl: nextUrl,
        originalImageUrl: removeBackground
          ? garment.originalImageUrl ?? garment.imageUrl ?? nextUrl
          : nextUrl,
      };
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.garments });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.favorites });
      notify("success", variables.removeBackground ? t("backgroundRemoved") : t("imageUpdated"));
    },
    onError: (error) => notify("error", error instanceof Error ? error.message : t("imageUpdateFailed")),
  });

  return {
    ...mutation,
    isRemovingBackground:
      mutation.isPending && mutation.variables?.removeBackground === true,
  };
}
