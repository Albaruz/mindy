import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { UserProfile } from "@/types/user";
import { toProfile, type ProfileRow } from "./profileMappers";

export const PROFILE_QUERY_KEY = ["profile"] as const;

async function fetchProfile(): Promise<UserProfile | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
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
  });
}
