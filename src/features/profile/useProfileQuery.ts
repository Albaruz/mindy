import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { UserProfile } from "@/types/user";
import { toProfile, type ProfileRow } from "./profileMappers";
import { QUERY_KEYS } from "@/constants/query";
import { TABLES, USER_ID_COLUMN } from "@/constants/storage";

export const PROFILE_QUERY_KEY = QUERY_KEYS.profile;

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
  created_at
`.trim();

async function fetchProfile(): Promise<UserProfile | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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
    queryKey: PROFILE_QUERY_KEY,
    queryFn: fetchProfile,
    staleTime: 5 * 60 * 1000,   // 5 min: profile rarely changes
    gcTime: 10 * 60 * 1000,     // 10 min: keep cache
    refetchOnWindowFocus: false,
  });
}
