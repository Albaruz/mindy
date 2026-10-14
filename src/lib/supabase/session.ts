import type { SupabaseClient, User } from "@supabase/supabase-js";

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

/** Current user; throws message when there is no session (mutations). */
export async function requireUser(
  supabase: AuthClient,
  message: string,
): Promise<User> {
  const user = await getSessionUser(supabase);
  if (!user) {
    throw new Error(message);
  }
  return user;
}