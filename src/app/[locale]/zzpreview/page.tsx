// TEMP DIAGNOSTIC HARNESS — delete before shipping. Renders the real
// SettingsControls on a public route to reproduce the language-switch
// blink without an authenticated session.
import { getTranslations } from "next-intl/server";
import { TopNavigation } from "@/components/TopNavigation/TopNavigation";
import { SettingsControls } from "@/features/settings/components/settings-controls/SettingsControls";

export default async function PreviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const ts = await getTranslations({ locale, namespace: "Settings" });
  return (
    <>
      <TopNavigation />
      <section style={{ padding: "2rem", maxWidth: "32rem", margin: "0 auto" }}>
      <h1>{ts("title")}</h1>
      <SettingsControls />
    </section>
    </>
  );
}
