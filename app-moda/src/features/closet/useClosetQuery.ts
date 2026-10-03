import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Garment } from "@/types/garment";
import { toGarment, type GarmentRow } from "./garmentMappers";

export const GARMENTS_QUERY_KEY = ["garments"] as const;

async function fetchClosetGarments(): Promise<Garment[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("garments")
    .select("*")
    .eq("user_id", user.id)
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
