import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { buildGarmentFavoriteUrl } from "@/constants/api";
import { QUERY_KEYS } from "@/constants/query";
import { useNotificationStore } from "@/stores/useNotificationStore";
import type { Garment } from "@/types/garment";

interface ToggleFavoriteVariables {
  garment: Garment;
  isFavorite: boolean;
}

interface FavoriteSnapshots {
  garments: Garment[] | undefined;
  laundryBasket: Garment[] | undefined;
  favorites: Garment[] | undefined;
}

const FAVORITE_QUERY_KEYS = [
  QUERY_KEYS.garments,
  QUERY_KEYS.laundryBasket,
  QUERY_KEYS.favorites,
] as const;

function updateFavoriteInList(
  garments: Garment[] | undefined,
  garment: Garment,
  isFavorite: boolean,
): Garment[] | undefined {
  return garments?.map((item) =>
    item.garmentId === garment.garmentId ? { ...item, isFavorite } : item,
  );
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();
  const t = useTranslations("Notifications");

  return useMutation<
    void,
    Error,
    ToggleFavoriteVariables,
    FavoriteSnapshots
  >({
    mutationFn: async ({ garment, isFavorite }) => {
      const response = await fetch(buildGarmentFavoriteUrl(garment.garmentId), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ is_favorite: isFavorite }),
      });

      if (!response.ok) {
        throw new Error("Could not update favorite");
      }
    },
    onMutate: async ({ garment, isFavorite }) => {
      await Promise.all(
        FAVORITE_QUERY_KEYS.map((queryKey) =>
          queryClient.cancelQueries({ queryKey }),
        ),
      );

      const snapshots: FavoriteSnapshots = {
        garments: queryClient.getQueryData<Garment[]>(QUERY_KEYS.garments),
        laundryBasket: queryClient.getQueryData<Garment[]>(
          QUERY_KEYS.laundryBasket,
        ),
        favorites: queryClient.getQueryData<Garment[]>(QUERY_KEYS.favorites),
      };

      queryClient.setQueryData<Garment[]>(QUERY_KEYS.garments, (current) =>
        updateFavoriteInList(current, garment, isFavorite),
      );
      queryClient.setQueryData<Garment[]>(QUERY_KEYS.laundryBasket, (current) =>
        updateFavoriteInList(current, garment, isFavorite),
      );
      queryClient.setQueryData<Garment[]>(QUERY_KEYS.favorites, (current) => {
        if (current === undefined) return current;
        if (!isFavorite) {
          return current.filter((item) => item.garmentId !== garment.garmentId);
        }

        const updatedGarment = { ...garment, isFavorite: true };
        const alreadyCached = current.some(
          (item) => item.garmentId === garment.garmentId,
        );
        return alreadyCached
          ? current.map((item) =>
              item.garmentId === garment.garmentId ? updatedGarment : item,
            )
          : [...current, updatedGarment];
      });

      return snapshots;
    },
    onError: (_error, _variables, snapshots) => {
      if (snapshots === undefined) return;
      queryClient.setQueryData(QUERY_KEYS.garments, snapshots.garments);
      queryClient.setQueryData(
        QUERY_KEYS.laundryBasket,
        snapshots.laundryBasket,
      );
      queryClient.setQueryData(QUERY_KEYS.favorites, snapshots.favorites);
      useNotificationStore
        .getState()
        .addNotification("error", t("favoriteFailed"));
    },
    onSuccess: (_data, { isFavorite }) => {
      useNotificationStore
        .getState()
        .addNotification(
          "success",
          isFavorite ? t("addedToFavorites") : t("removedFromFavorites"),
        );
    },
    onSettled: async () => {
      await Promise.all(
        FAVORITE_QUERY_KEYS.map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      );
    },
  });
}
