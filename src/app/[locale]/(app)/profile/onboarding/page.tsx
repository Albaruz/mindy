import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasCompletedOnboarding, localizePath } from "@/lib/onboarding";
import { toProfile, type ProfileRow } from "@/features/profile/domain/profile/profileMappers";
import { OnboardingWizard } from "@/features/onboarding/views/onboarding-wizard/OnboardingWizard";
import { TABLES, USER_ID_COLUMN } from "@/constants/storage";

// Completed profiles skip the wizard and go straight to the generator,
// unless ?edit=true explicitly reopens it prefilled for editing.
export default async function OnboardingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const { locale } = await params;
  const { edit } = await searchParams;
  const isEdit = edit === "true";

  // NB: redirect() throws, so it must stay outside the try block.
  let profile = null as ReturnType<typeof toProfile> | null;
  let skipWizard = false;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data } = await supabase
        .from(TABLES.profiles)
        .select("*")
        .eq(USER_ID_COLUMN, user.id)
        .maybeSingle();
      if (data) {
        profile = toProfile(data as unknown as ProfileRow);
      }
      if (!isEdit) {
        skipWizard = await hasCompletedOnboarding(supabase, user.id).catch(
          () => false,
        );
      }
    }
  } catch {
    profile = null;
    skipWizard = false;
  }

  if (skipWizard) {
    redirect(localizePath("/generator", locale));
  }

  return <OnboardingWizard initialProfile={profile} />;
}
