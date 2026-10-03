"use client";

import Image from "next/image";
import { TopNavigation } from "@/components/TopNavigation/TopNavigation";
import { usePathname } from "@/i18n/navigation";

// Global header (logo + pill menu), hidden on the auth gate and the
// password recovery flow: those screens carry their own centered logo
// and no navigation.
export function AppHeader() {
  const pathname = usePathname();
  const trail = pathname?.replace(/^\/(en|es)(?=\/|$)/, "") ?? "";
  if (
    trail === "" ||
    trail === "/" ||
    trail === "/forgot-password" ||
    trail === "/reset-password"
  ) {
    return null;
  }
  return (
    <header className="appHeader">
      <Image
        src="/images/logo-mindy.svg"
        alt="Mindy"
        width={96}
        height={52}
        priority
      />
      <TopNavigation />
    </header>
  );
}
