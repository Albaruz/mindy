"use client";

import { LayoutGroup, motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  THEME_MODES,
  useThemeStore,
} from "@/features/settings/themeStore";
import type { ThemeMode } from "@/types/ui";
import { routing, type AppLocale } from "@/i18n/routing";
import { usePathname, useRouter } from "@/i18n/navigation";
import styles from "./SettingsControls.module.scss";

const LANGUAGE_LABELS: Record<AppLocale, string> = {
  en: "English",
  es: "Español",
};

const THEME_META: Record<ThemeMode, { labelKey: string; Icon: typeof Sun }> = {
  system: { labelKey: "themeSystem", Icon: Monitor },
  light: { labelKey: "themeLight", Icon: Sun },
  dark: { labelKey: "themeDark", Icon: Moon },
};

const INDICATOR_SPRING = {
  type: "spring",
  stiffness: 300,
  damping: 30,
} as const;

// Segmented controls for language and theme, breathing flat on the parent
// card (no nested boxes, no shadows). Selection transitions stay local to
// the clicked control instead of using shared layout animations.
// Language switches via locale-prefixed navigation (NEXT_LOCALE persists
// on device); theme flips CSS variables instantly (no reload).
export function SettingsControls() {
  const t = useTranslations("Settings");
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const pathname = usePathname();
  const themeMode = useThemeStore((state) => state.mode);
  const setThemeMode = useThemeStore((state) => state.setMode);

  const handleLocaleChange = (nextLocale: AppLocale) => {
    if (nextLocale !== locale) {
      router.replace(pathname, { locale: nextLocale, scroll: false });
    }
  };

  return (
    <LayoutGroup id="settings-controls">
      <div className={styles["settings-controls"]}>
      <fieldset className={styles["settings-controls__group"]}>
          <legend className={styles["settings-controls__legend"]}>
            <span className={styles["settings-controls__title"]}>{t("language")}</span>
            <span className={styles["settings-controls__description"]}>
              {t("languageDescription")}
            </span>
          </legend>
          <div
            role="group"
            aria-label={t("language")}
            className={styles["settings-controls__segmented"]}
          >
            {routing.locales.map((option) => {
              const selected = locale === option;
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => handleLocaleChange(option)}
                  className={cn(
                    styles["settings-controls__segment"],
                    selected && styles["settings-controls__segment--active"],
                  )}
                >
                  {selected ? (
                    <motion.span
                      layoutId="languageIndicator"
                      initial={false}
                      aria-hidden="true"
                      className={styles["settings-controls__indicator"]}
                      transition={INDICATOR_SPRING}
                    />
                  ) : null}
                  <span className={styles["settings-controls__segment-content"]}>
                    {LANGUAGE_LABELS[option]}
                  </span>
                </button>
              );
            })}
          </div>
      </fieldset>

      <fieldset className={styles["settings-controls__group"]}>
          <legend className={styles["settings-controls__legend"]}>
            <span className={styles["settings-controls__title"]}>{t("theme")}</span>
            <span className={styles["settings-controls__description"]}>
              {t("themeDescription")}
            </span>
          </legend>
          <div
            role="group"
            aria-label={t("theme")}
            className={styles["settings-controls__segmented"]}
          >
            {THEME_MODES.map((option) => {
              const { labelKey, Icon } = THEME_META[option];
              const selected = themeMode === option;
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setThemeMode(option)}
                  className={cn(
                    styles["settings-controls__segment"],
                    selected && styles["settings-controls__segment--active"],
                  )}
                >
                  <span className={styles["settings-controls__segment-content"]}>
                    <Icon
                      aria-hidden="true"
                      size={18}
                      strokeWidth={1.5}
                    />
                    {t(labelKey)}
                  </span>
                </button>
              );
            })}
          </div>
      </fieldset>
      </div>
    </LayoutGroup>
  );
}
