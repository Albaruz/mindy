import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { buildGarmentFavoriteUrl } from "@/constants/api";
import { QUERY_KEYS } from "@/constants/query";
import { COLUMNS } from "@/constants/storage";
import { useNotificationStore } from "@/stores/useNotificationStore";
import type { Garment } from "@/types/garment";
import { ERROR_CODES } from "@/constants/errors";
import { AppError } from "@/lib/errors";
import {
  GARMENT_CACHE_QUERY_KEYS,
  invalidateGarmentCaches,
} from "@/lib/garment/invalidateGarmentCaches";

interface ToggleFavoriteVariables {
  garment: Garment;
  isFavorite: boolean;
}

interface FavoriteSnapshots {
  previousFavoriteState: boolean;
  favorite: Garment | undefined;
  favoriteIndex: number;
}

function updateFavoriteInList(
  garments: Garment[] | undefined,
  garment: Garment,
  isFavorite: boolean,
): Garment[] | undefined {
  return garments?.map((item) =>
    item.garmentId === garment.garmentId ? { ...item, isFavorite } : item,
  );
}

function restoreGarment(
  current: Garment[] | undefined,
  garmentId: string,
  previousFavoriteState: boolean,
): Garment[] | undefined {
  if (current === undefined) {
    return current;
  }
  return current.map((item) =>
    item.garmentId === garmentId
      ? { ...item, isFavorite: previousFavoriteState }
      : item,
  );
}

function restoreFavorite(
  current: Garment[] | undefined,
  garmentId: string,
  previous: Garment | undefined,
  previousIndex: number,
  currentGarment: Garment | undefined,
): Garment[] | undefined {
  if (current === undefined) {
    return current;
  }
  const withoutTarget = current.filter((item) => item.garmentId !== garmentId);
  if (previous === undefined) {
    return withoutTarget;
  }
  const cachedGarment = current.find((item) => item.garmentId === garmentId);
  const restored = cachedGarment
    ? { ...cachedGarment, isFavorite: previous.isFavorite }
    : currentGarment
      ? { ...currentGarment, isFavorite: previous.isFavorite }
      : previous;
  const index = Math.min(Math.max(previousIndex, 0), withoutTarget.length);
  return [
    ...withoutTarget.slice(0, index),
    restored,
    ...withoutTarget.slice(index),
  ];
}

export function useToggleFavorite(garmentId: string) {
  const queryClient = useQueryClient();
  const t = useTranslations("Notifications");

  return useMutation<
    void,
    Error,
    ToggleFavoriteVariables,
    FavoriteSnapshots
  >({
    // Per-garment scope keeps concurrent writes independent across the closet.
    scope: { id: `toggle-favorite-${garmentId}` },
    mutationFn: async ({ garment, isFavorite }) => {
      const response = await fetch(buildGarmentFavoriteUrl(garment.garmentId), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ [COLUMNS.isFavorite]: isFavorite }),
      });

      if (!response.ok) {
        throw new AppError(ERROR_CODES.FAVORITE_UPDATE_FAILED);
      }
    },
    onMutate: async ({ garment, isFavorite }) => {
      await Promise.all(
        GARMENT_CACHE_QUERY_KEYS.map((queryKey) =>
          queryClient.cancelQueries({ queryKey }),
        ),
      );

      const garments = queryClient.getQueryData<Garment[]>(QUERY_KEYS.garments);
      const favorites = queryClient.getQueryData<Garment[]>(QUERY_KEYS.favorites);
      const currentGarment = garments?.find(
        (item) => item.garmentId === garment.garmentId,
      );
      const snapshots: FavoriteSnapshots = {
        previousFavoriteState:
          currentGarment?.isFavorite ?? garment.isFavorite ?? false,
        favorite: favorites?.find((item) => item.garmentId === garment.garmentId),
        favoriteIndex:
          favorites?.findIndex((item) => item.garmentId === garment.garmentId) ?? -1,
      };

      queryClient.setQueryData<Garment[]>(QUERY_KEYS.garments, (current) =>
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
    onError: (_error, { garment }, snapshots) => {
      if (snapshots === undefined) return;
      const currentGarment = queryClient
        .getQueryData<Garment[]>(QUERY_KEYS.garments)
        ?.find((item) => item.garmentId === garment.garmentId);
      const restoredGarment = currentGarment === undefined
        ? undefined
        : {
            ...currentGarment,
            isFavorite: snapshots.previousFavoriteState,
          };
      queryClient.setQueryData<Garment[] | undefined>(QUERY_KEYS.garments, (current) =>
        restoreGarment(current, garment.garmentId, snapshots.previousFavoriteState),
      );
      queryClient.setQueryData<Garment[] | undefined>(QUERY_KEYS.favorites, (current) =>
        restoreFavorite(
          current,
          garment.garmentId,
          snapshots.favorite,
          snapshots.favoriteIndex,
          restoredGarment,
        ),
      );
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
    onSettled: () => invalidateGarmentCaches(queryClient),
  });
}
