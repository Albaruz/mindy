import { redirect } from "next/navigation";
import { localizePath } from "@/lib/onboarding";

// Settings live inline on the profile screen now; keep the legacy route
// working by forwarding it there.
export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(localizePath("/profile", locale));
}
