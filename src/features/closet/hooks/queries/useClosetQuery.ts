import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Garment } from "@/types/garment";
import {
  GARMENT_ROW_COLUMNS,
  toGarment,
  type GarmentRow,
} from "@/lib/garment/garmentMappers";
import { ENTITY_GC_TIME_MS, ENTITY_STALE_TIME_MS, QUERY_KEYS } from "@/constants/query";
import { COLUMNS, TABLES, USER_ID_COLUMN } from "@/constants/storage";
import { getSessionUser } from "@/lib/supabase/session";

async function fetchClosetGarments(): Promise<Garment[]> {
  const supabase = createClient();
  const user = await getSessionUser(supabase);
  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from(TABLES.garments)
    .select(GARMENT_ROW_COLUMNS)
    .eq(USER_ID_COLUMN, user.id)
    .order(COLUMNS.createdAt, { ascending: false });

  if (error) {
    throw error;
  }
  return (data as unknown as GarmentRow[]).map(toGarment);
}

export function useClosetQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.garments,
    queryFn: fetchClosetGarments,
    staleTime: ENTITY_STALE_TIME_MS,
    gcTime: ENTITY_GC_TIME_MS,
    refetchOnWindowFocus: false,
  });
}
