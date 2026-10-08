import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Garment } from "@/types/garment";
import { toGarment, type GarmentRow } from "./garmentMappers";
import { QUERY_KEYS } from "@/constants/query";
import { TABLES, USER_ID_COLUMN } from "@/constants/storage";

export const GARMENTS_QUERY_KEY = QUERY_KEYS.garments;

async function fetchClosetGarments(): Promise<Garment[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from(TABLES.garments)
    .select("*")
    .eq(USER_ID_COLUMN, user.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }
  return (data as unknown as GarmentRow[]).map(toGarment);
}

export function useClosetQuery() {
  return useQuery({
    queryKey: GARMENTS_QUERY_KEY,
    queryFn: fetchClosetGarments,
  });
}
