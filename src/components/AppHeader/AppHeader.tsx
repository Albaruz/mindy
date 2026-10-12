"use client";

import Image from "next/image";
import { TopNavigation } from "@/components/TopNavigation/TopNavigation";
import { usePathname } from "@/i18n/navigation";
import styles from "./AppHeader.module.scss";

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
    <header className={styles.appHeader}>
      <Image
        src="/images/logo-mindy.svg"
        alt="Mindy"
        width={96}
        height={52}
        priority
        className={styles["appHeader__logo"]}
      />
      <nav className={styles["appHeader__nav"]}>
        <TopNavigation />
      </nav>
    </header>
  );
}