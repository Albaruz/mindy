import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { UserProfile } from "@/types/user";
import { toProfile, type ProfileRow } from "../../domain/profile/profileMappers";
import { ENTITY_GC_TIME_MS, ENTITY_STALE_TIME_MS, QUERY_KEYS } from "@/constants/query";
import { COLUMNS, TABLES, USER_ID_COLUMN } from "@/constants/storage";
import { getSessionUser } from "@/lib/supabase/session";

// Columns used by the app (mirrors ProfileRow). Avoid select("*") to reduce payload.
const PROFILE_COLUMNS = `
  user_id,
  skin_tone,
  eye_color,
  hair_color,
  chest_measurement_cm,
  waist_measurement_cm,
  hip_measurement_cm,
  colorimetry,
  morphology,
  preferred_fit,
  lifestyle,
  extra_preferences,
  ${COLUMNS.createdAt}
`.trim();

async function fetchProfile(): Promise<UserProfile | null> {
  const supabase = createClient();
  const user = await getSessionUser(supabase);
  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from(TABLES.profiles)
    .select(PROFILE_COLUMNS)
    .eq(USER_ID_COLUMN, user.id)
    .maybeSingle();
  if (error) {
    throw error;
  }
  if (!data) {
    return null;
  }
  return toProfile(data as unknown as ProfileRow);
}

export function useProfileQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.profile,
    queryFn: fetchProfile,
    staleTime: ENTITY_STALE_TIME_MS,
    gcTime: ENTITY_GC_TIME_MS,
    refetchOnWindowFocus: false,
  });
}
