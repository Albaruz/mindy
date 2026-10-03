import { redirect } from "next/navigation";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import {
  hasCompletedOnboarding,
  localizePath,
  postAuthDestination,
} from "@/lib/onboarding";
import { AuthForm } from "./AuthForm";
import styles from "./page.module.scss";

// Auth gate at `/`: signed-in users go to the generator (or to onboarding
// when their profile is incomplete); everyone else signs in or registers.
export default async function AuthPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  // No backend configured (or unreachable): show the form as signed out.
  // NB: redirect() throws, so it must stay outside the try block.
  let destination: string | null = null;
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Auth" });
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const completed = await hasCompletedOnboarding(supabase, user.id).catch(
        () => false,
      );
      destination = postAuthDestination(completed);
    }
  } catch {
    destination = null;
  }

  if (destination !== null) {
    redirect(localizePath(destination, locale));
  }

  return (
    <section className={styles.page}>
      <div className={styles.card}>
        <Image
          src="/images/logo-mindy.svg"
          alt="Mindy"
          width={140}
          height={76}
          priority
          className={styles.logo}
        />
        <h1 className={styles.title}>{t("title")}</h1>
        <p className={styles.subtitle}>
          {t("subtitle")}
        </p>
        <AuthForm />
      </div>
    </section>
  );
}
