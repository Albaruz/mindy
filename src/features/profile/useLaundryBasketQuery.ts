import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Garment } from "@/types/garment";
import { toGarment, type GarmentRow } from "@/lib/garment/garmentMappers";
import { isWashableGarment } from "@/lib/garment/categorizeGarments";
import { ENTITY_GC_TIME_MS, ENTITY_STALE_TIME_MS, QUERY_KEYS } from "@/constants/query";
import { TABLES, USER_ID_COLUMN } from "@/constants/storage";
import { getSessionUser } from "@/lib/supabase/session";

// Columns used by the app (mirrors GarmentRow). Avoid select("*") to reduce payload.
const GARMENT_COLUMNS = `
  garment_id,
  user_id,
  image_url,
  garment_type,
  style,
  cut_length,
  color,
  material,
  season,
  is_dirty,
  last_worn_date,
  is_external_garment,
  extra_tags,
  created_at
`.trim();

async function fetchDirtyGarments(): Promise<Garment[]> {
  const supabase = createClient();
  const user = await getSessionUser(supabase);
  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from(TABLES.garments)
    .select(GARMENT_COLUMNS)
    .eq(USER_ID_COLUMN, user.id)
    .eq("is_dirty", true)
    .order("created_at", { ascending: false });
  if (error) {
    throw error;
  }
  // Shoes and outerwear never belong in the basket, even when older rows
  // still carry is_dirty from before the exemption.
  return (data as unknown as GarmentRow[])
    .map(toGarment)
    .filter(isWashableGarment);
}

export function useLaundryBasketQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.laundryBasket,
    queryFn: fetchDirtyGarments,
    staleTime: ENTITY_STALE_TIME_MS,
    gcTime: ENTITY_GC_TIME_MS,
    refetchOnWindowFocus: false,
  });
}
