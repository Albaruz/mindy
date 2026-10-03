import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Garment } from "@/types/garment";
import { toGarment, type GarmentRow } from "@/features/closet/garmentMappers";
import { isLaundryExemptGarment } from "@/features/generator/categorizeGarments";

export const LAUNDRY_QUERY_KEY = ["laundry-basket"] as const;

async function fetchDirtyGarments(): Promise<Garment[]> {
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
    .eq("is_dirty", true)
    .order("created_at", { ascending: false });
  if (error) {
    throw error;
  }
  // Shoes and outerwear never belong in the basket, even when older rows
  // still carry is_dirty from before the exemption.
  return (data as unknown as GarmentRow[])
    .map(toGarment)
    .filter((garment) => !isLaundryExemptGarment(garment));
}

export function useLaundryBasketQuery() {
  return useQuery({
    queryKey: LAUNDRY_QUERY_KEY,
    queryFn: fetchDirtyGarments,
  });
}
