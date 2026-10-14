import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Garment } from "@/types/garment";
import type { OutfitHistory } from "@/types/history";
import { toGarment, type GarmentRow } from "@/features/closet/garmentMappers";
import { QUERY_KEYS } from "@/constants/query";
import { TABLES, USER_ID_COLUMN } from "@/constants/storage";
import { getSessionUser } from "@/lib/supabase/session";

export const HISTORY_QUERY_KEY = QUERY_KEYS.history;

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

// Columns for outfit_history table
const HISTORY_COLUMNS = `
  look_id,
  user_id,
  garment_ids,
  worn_date,
  created_at
`.trim();

// Columns for garments table (reused from garmentMappers)
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
  const user = await getSessionUser(supabase);
  if (!user) {
    return [];
  }

  const { data: rows, error } = await supabase
    .from(TABLES.outfitHistory)
    .select(HISTORY_COLUMNS)
    .eq(USER_ID_COLUMN, user.id)
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
    .from(TABLES.garments)
    .select(GARMENT_COLUMNS)
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
    staleTime: 5 * 60 * 1000,   // 5 min: history is append-only, rarely changes
    gcTime: 10 * 60 * 1000,     // 10 min: keep cache
    refetchOnWindowFocus: false,
  });
}
