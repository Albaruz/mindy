import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Garment } from "@/types/garment";
import type { OutfitHistory } from "@/types/history";
import { toGarment, type GarmentRow } from "@/features/closet/garmentMappers";

export const HISTORY_QUERY_KEY = ["outfit-history"] as const;

// Row shape of public.outfit_history (snake_case, as returned by Supabase).
interface OutfitHistoryRow {
  look_id: string;
  user_id: string;
  garment_ids: string[] | null;
  worn_date: string;
  created_at: string;
}

export interface HistoryEntry {
  history: OutfitHistory;
  garments: Garment[];
}

function toHistory(row: OutfitHistoryRow): OutfitHistory {
  return {
    lookId: row.look_id,
    userId: row.user_id,
    garmentIds: row.garment_ids ?? [],
    wornDate: row.worn_date,
    createdAt: row.created_at,
  };
}

async function fetchHistory(): Promise<HistoryEntry[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return [];
  }

  const { data: rows, error } = await supabase
    .from("outfit_history")
    .select("*")
    .eq("user_id", user.id)
    .order("worn_date", { ascending: false });
  if (error) {
    throw error;
  }
  const history = (rows as unknown as OutfitHistoryRow[]).map(toHistory);

  // Join garment images in a single follow-up query instead of N requests.
  const garmentIds = [...new Set(history.flatMap((entry) => entry.garmentIds))];
  if (garmentIds.length === 0) {
    return history.map((entry) => ({ history: entry, garments: [] }));
  }

  const { data: garmentRows, error: garmentsError } = await supabase
    .from("garments")
    .select("*")
    .in("garment_id", garmentIds);
  if (garmentsError) {
    throw garmentsError;
  }

  const garmentsById = new Map(
    (garmentRows as unknown as GarmentRow[])
      .map(toGarment)
      .map((garment) => [garment.garmentId, garment] as const),
  );

  return history.map((entry) => ({
    history: entry,
    garments: entry.garmentIds.flatMap((id) => {
      const garment = garmentsById.get(id);
      return garment === undefined ? [] : [garment];
    }),
  }));
}

export function useHistoryQuery() {
  return useQuery({
    queryKey: HISTORY_QUERY_KEY,
    queryFn: fetchHistory,
  });
}
