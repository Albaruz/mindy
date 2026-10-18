import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Garment } from "@/types/garment";
import { toGarment, type GarmentRow } from "@/lib/garment/garmentMappers";
import { ENTITY_GC_TIME_MS, ENTITY_STALE_TIME_MS, QUERY_KEYS } from "@/constants/query";
import { TABLES, USER_ID_COLUMN } from "@/constants/storage";
import { getSessionUser } from "@/lib/supabase/session";

// Columns used by the app (mirrors GarmentRow). Avoid select("*") to reduce payload.
const GARMENT_COLUMNS = `
  garment_id,
  user_id,
  image_url,
  original_image_url,
  garment_type,
  style,
  cut_length,
  styles,
  cut_lengths,
  color,
  material,
  season,
  is_dirty,
  last_worn_date,
  is_external_garment,
  extra_tags,
  created_at
`.trim();

async function fetchClosetGarments(): Promise<Garment[]> {
  const supabase = createClient();
  const user = await getSessionUser(supabase);
  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from(TABLES.garments)
    .select(GARMENT_COLUMNS)
    .eq(USER_ID_COLUMN, user.id)
    .order("created_at", { ascending: false });

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
