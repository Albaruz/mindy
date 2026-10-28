import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { COLUMNS, TABLES, USER_ID_COLUMN } from "@/constants/storage";
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
import { ERROR_CODES } from "@/constants/errors";
import { AppError, isAppError } from "@/lib/errors";
import { invalidateGarmentCaches } from "@/lib/garment/invalidateGarmentCaches";

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
      const user = await requireUser(client);
      let source: Blob;
      if (removeBackground) {
        const sourceUrl = garment.originalImageUrl ?? garment.imageUrl;
        if (!sourceUrl) {
          throw new AppError(ERROR_CODES.GARMENT_IMAGE_SOURCE_MISSING);
        }
        const response = await fetch(sourceUrl);
        if (!response.ok) {
          throw new AppError(ERROR_CODES.GARMENT_IMAGE_READ_FAILED);
        }
        source = await removeBackgroundWithFallback(await response.blob(), () => undefined);
      } else {
        if (!file) {
          throw new AppError(ERROR_CODES.GARMENT_IMAGE_FILE_REQUIRED);
        }
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
          .eq(COLUMNS.garmentId, garment.garmentId)
          .eq(USER_ID_COLUMN, user.id)
          .select(COLUMNS.garmentId)
          .maybeSingle();
        if (error) throw error;
         if (data === null) throw new AppError(ERROR_CODES.GARMENT_NOT_FOUND);
      } catch (error) {
        const cleanupError = await removeGarmentStoragePaths(client, [uploaded.path]);
        if (cleanupError) {
          logger.warn("Replacement garment image cleanup failed", {
            userId: user.id,
            error: cleanupError,
          });
        }
        throw isAppError(error)
          ? error
          : new AppError(ERROR_CODES.GARMENT_IMAGE_UPDATE_FAILED);
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
      notify("success", variables.removeBackground ? t("backgroundRemoved") : t("imageUpdated"));
      return invalidateGarmentCaches(queryClient);
    },
    onError: (error) =>
      notify(
        "error",
        isAppError(error)
          ? t(`errors.${error.code}`)
          : t("imageUpdateFailed"),
      ),
  });

  return {
    ...mutation,
    isRemovingBackground:
      mutation.isPending && mutation.variables?.removeBackground === true,
  };
}
