import { useQuery } from "@tanstack/react-query";
import { API_ROUTES } from "@/constants/api";
import { QUERY_KEYS, ENTITY_STALE_TIME_MS, ENTITY_GC_TIME_MS } from "@/constants/query";
import type { Garment } from "@/types/garment";

async function fetchFavorites(): Promise<Garment[]> {
  const response = await fetch(API_ROUTES.favorites, {
    credentials: "include",
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Failed to fetch favorites");
  }
  return response.json();
}

export function useFavoritesQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.favorites,
    queryFn: fetchFavorites,
    staleTime: ENTITY_STALE_TIME_MS,
    gcTime: ENTITY_GC_TIME_MS,
    refetchOnWindowFocus: false,
  });
}
