"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { usePathname } from "@/i18n/navigation";
import styles from "./AppHeader.module.scss";

const TopNavigation = dynamic(
  () =>
    import("@/components/TopNavigation/TopNavigation").then(
      (module) => module.TopNavigation,
    ),
  { loading: () => null },
);

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
    <header className={styles["app-header"]}>
      <div className={styles["app-header__content"]}>
        <Image
          src="/images/logo-mindy.svg"
          alt="Mindy"
          width={96}
          height={52}
          priority
          className={styles["app-header__logo"]}
        />
        <nav className={styles["app-header__nav"]}>
          <TopNavigation />
        </nav>
      </div>
    </header>
  );
}
