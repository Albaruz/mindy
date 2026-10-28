import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/query";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { TABLES, USER_ID_COLUMN } from "@/constants/storage";
import { requireUser } from "@/lib/supabase/session";
import {
  getGarmentStoragePath,
  removeGarmentStoragePaths,
} from "../../services/persistence/garmentStorage";
import { logger } from "@/lib/logger";

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
      const user = await requireUser(supabase, "You must be signed in to delete garments.");

      const { error } = await supabase
        .from(TABLES.garments)
        .delete()
        .eq("garment_id", garmentId)
        .eq(USER_ID_COLUMN, user.id);
      if (error) {
        throw error;
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
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.garments });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.favorites });
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
