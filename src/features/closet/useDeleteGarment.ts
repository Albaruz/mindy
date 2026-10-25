import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/query";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { GARMENT_STORAGE_BUCKET } from "./useUploadGarment";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { TABLES, USER_ID_COLUMN } from "@/constants/storage";
import { requireUser } from "@/lib/supabase/session";

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

      const paths = [toStoragePath(imageUrl), toStoragePath(originalImageUrl ?? null)]
        .filter((path): path is string => path !== null);
      if (paths.length > 0) {
        await supabase.storage
          .from(GARMENT_STORAGE_BUCKET)
          .remove([...new Set(paths)]);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.garments });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.laundryBasket });
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

// Public URLs look like .../storage/v1/object/public/garments/<path>.
// Only paths inside the garments bucket are removed.
function toStoragePath(imageUrl: string | null): string | null {
  if (!imageUrl) {
    return null;
  }
  const marker = `/object/public/${GARMENT_STORAGE_BUCKET}/`;
  const index = imageUrl.indexOf(marker);
  if (index === -1) {
    return null;
  }
  const path = imageUrl.slice(index + marker.length).split("?")[0];
  return path === "" ? null : path;
}
