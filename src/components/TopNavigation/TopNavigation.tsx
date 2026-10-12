"use client";

import { useEffect, useRef } from "react";
import { MotionConfig, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Calendar, LayoutGrid, User, WandSparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link, usePathname } from "@/i18n/navigation";
import styles from "./TopNavigation.module.scss";

const TABS = [
  { segment: "generator", labelKey: "generator", Icon: WandSparkles },
  { segment: "closet", labelKey: "closet", Icon: LayoutGrid },
  { segment: "calendar", labelKey: "calendar", Icon: Calendar },
  { segment: "profile", labelKey: "profile", Icon: User },
] as const;

const LOCALE_PREFIX_PATTERN = /^\/(en|es)(?=\/|$)/;

// Soft spring for the sliding pill: fluid travel without overshoot.
const INDICATOR_SPRING = {
  type: "spring",
  stiffness: 300,
  damping: 30,
} as const;

export function TopNavigation() {
  const t = useTranslations("Navigation");
  const ta = useTranslations("Accessibility");
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);

  const trail = pathname?.replace(LOCALE_PREFIX_PATTERN, "") ?? "";
  const activeSegment =
    TABS.find(
      ({ segment }) =>
        trail === `/${segment}` || trail.startsWith(`/${segment}/`),
    )?.segment ?? null;

  // Keep the active tab visible when the pill scrolls horizontally on mobile.
  useEffect(() => {
    navRef.current
      ?.querySelector('[aria-current="page"]')
      ?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [activeSegment]);

  return (
    <MotionConfig reducedMotion="user">
      <nav
        ref={navRef}
        aria-label={ta("mainNavigation")}
        className={styles.navigation}
      >
        <ul className={styles["navigation__list"]} role="tablist">
          {TABS.map(({ segment, labelKey, Icon }) => {
            const href = `/${segment}`;
            const active = activeSegment === segment;
            return (
              <li
                key={segment}
                className={cn(
                  styles["navigation__item"],
                  active && styles["navigation__item--active"]
                )}
                role="presentation"
              >
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  role="tab"
                  className={styles["navigation__link"]}
                >
                  {active && (
                    <motion.span
                      layoutId="activeTabIndicator"
                      aria-hidden="true"
                      className={styles["navigation__indicator"]}
                      transition={INDICATOR_SPRING}
                    />
                  )}
                  <span className={styles["navigation__content"]}>
                    <Icon aria-hidden="true" size={18} className={styles["navigation__icon"]} />
                    <span className={styles["navigation__label"]}>{t(labelKey)}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </MotionConfig>
  );
}