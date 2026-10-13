"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { REMEMBER_COOKIE, REMEMBER_SINCE_COOKIE } from "@/lib/supabase/cookies";
import { localizePath } from "@/lib/onboarding";
import { resolveRequestLocale } from "@/lib/serverLocale";

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  (await cookies()).delete(REMEMBER_COOKIE);
  (await cookies()).delete(REMEMBER_SINCE_COOKIE);
  revalidatePath("/", "layout");
  redirect(localizePath("/", await resolveRequestLocale()));
}
