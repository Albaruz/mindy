import type { createClient } from "@/lib/supabase/server";
import { TABLES, USER_ID_COLUMN } from "@/constants/storage";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

// Onboarding counts as complete once the wizard outputs exist. The signup
// trigger pre-creates an empty row, so row existence alone is not enough.
export async function hasCompletedOnboarding(
  supabase: ServerClient,
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from(TABLES.profiles)
    .select("colorimetry, morphology, preferred_fit, lifestyle")
    .eq(USER_ID_COLUMN, userId)
    .maybeSingle();
  if (error || !data) {
    return false;
  }

  const row = data as unknown as Record<string, unknown>;
  return (
    typeof row.colorimetry === "string" &&
    row.colorimetry !== "" &&
    typeof row.morphology === "string" &&
    row.morphology !== "" &&
    typeof row.preferred_fit === "string" &&
    row.preferred_fit !== "" &&
    typeof row.lifestyle === "string" &&
    row.lifestyle !== ""
  );
}

export function postAuthDestination(completed: boolean): string {
  return completed ? "/generator" : "/profile/onboarding";
}

// Prefix an internal path with the active locale (/generator -> /es/generator).
export function localizePath(path: string, locale: string): string {
  return `/${locale}${path.startsWith("/") ? path : `/${path}`}`;
}
