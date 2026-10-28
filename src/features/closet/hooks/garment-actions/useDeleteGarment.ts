import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { COLUMNS, TABLES, USER_ID_COLUMN } from "@/constants/storage";
import { requireUser } from "@/lib/supabase/session";
import { ERROR_CODES } from "@/constants/errors";
import { AppError } from "@/lib/errors";
import {
  getGarmentStoragePath,
  removeGarmentStoragePaths,
} from "../../services/persistence/garmentStorage";
import { logger } from "@/lib/logger";
import { invalidateGarmentCaches } from "@/lib/garment/invalidateGarmentCaches";

// Deletes a garment row owned by the signed-in user (RLS enforced).
// Storage cleanup is best-effort: the row is removed even if the file
// no longer exists or the path cannot be derived from the public URL.
export function useDeleteGarment() {
  const queryClient = useQueryClient();
  const t = useTranslations("Notifications");

  return useMutation({
    mutationFn: async ({
      garmentId,
      imageUrl,
      originalImageUrl,
    }: {
      garmentId: string;
      imageUrl: string | null;
      originalImageUrl?: string | null;
    }): Promise<void> => {
      const supabase = createClient();
      const user = await requireUser(supabase);

      const { error } = await supabase
        .from(TABLES.garments)
        .delete()
        .eq(COLUMNS.garmentId, garmentId)
        .eq(USER_ID_COLUMN, user.id);
      if (error) {
        throw new AppError(ERROR_CODES.GARMENT_DELETE_FAILED);
      }

      const paths = [
        getGarmentStoragePath(imageUrl),
        getGarmentStoragePath(originalImageUrl),
      ].filter((path): path is string => path !== null);
      const cleanupError = await removeGarmentStoragePaths(supabase, paths);
      if (cleanupError) {
        logger.warn("Deleted garment storage cleanup failed", {
          userId: user.id,
          garmentId,
          error: cleanupError,
        });
      }
    },
    onSuccess: async () => {
      await invalidateGarmentCaches(queryClient);
      useNotificationStore
        .getState()
        .addNotification("success", t("deleted"));
    },
    onError: () => {
      useNotificationStore
        .getState()
        .addNotification("error", t("deleteFailed"));
    },
  });
}
