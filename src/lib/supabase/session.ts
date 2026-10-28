import type { SupabaseClient, User } from "@supabase/supabase-js";
import { ERROR_CODES } from "@/constants/errors";
import { AppError } from "@/lib/errors";

type AuthClient = Pick<SupabaseClient, "auth">;

/** Current user, or null when there is no session. */
export async function getSessionUser(
  supabase: AuthClient,
): Promise<User | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** Current user; throws a stable code when there is no session (mutations). */
export async function requireUser(
  supabase: AuthClient,
): Promise<User> {
  const user = await getSessionUser(supabase);
  if (!user) {
    throw new AppError(ERROR_CODES.SESSION_REQUIRED);
  }
  return user;
}
