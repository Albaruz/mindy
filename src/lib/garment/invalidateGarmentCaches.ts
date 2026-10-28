import type { QueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/query";

/** Cache entries whose rendered garment data can change after a garment write. */
export const GARMENT_CACHE_QUERY_KEYS = [
  QUERY_KEYS.garments,
  QUERY_KEYS.favorites,
  QUERY_KEYS.history,
] as const;

/** Revalidates all views that embed or derive data from garments. */
export async function invalidateGarmentCaches(
  queryClient: QueryClient,
): Promise<void> {
  await Promise.all(
    GARMENT_CACHE_QUERY_KEYS.map((queryKey) =>
      queryClient.invalidateQueries({ queryKey }),
    ),
  );
}
