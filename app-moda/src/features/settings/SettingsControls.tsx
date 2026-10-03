"use client";

import { MotionConfig, motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  THEME_MODES,
  useThemeStore,
  type ThemeMode,
} from "@/features/settings/themeStore";
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

const SPRING = { type: "spring", stiffness: 300, damping: 30 } as const;

// Sliding-pill segmented controls for language and theme, breathing flat
// on the parent card (no nested boxes, no shadows). The terracotta pill
// is shared per group via layoutId so it glides between options.
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
      router.replace(pathname, { locale: nextLocale });
    }
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className={styles.controls}>
        <fieldset className={styles.group}>
          <legend className={styles.legend}>
            <span className={styles.title}>{t("language")}</span>
            <span className={styles.description}>
              {t("languageDescription")}
            </span>
          </legend>
          <div
            role="group"
            aria-label={t("language")}
            className={styles.segmented}
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
                    styles.segment,
                    selected && styles["is-active"],
                  )}
                >
                  {selected ? (
                    <motion.span
                      layoutId="settingsLanguageIndicator"
                      aria-hidden="true"
                      className={styles.indicator}
                      transition={SPRING}
                    />
                  ) : null}
                  <span className={styles.segmentContent}>
                    {LANGUAGE_LABELS[option]}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset className={styles.group}>
          <legend className={styles.legend}>
            <span className={styles.title}>{t("theme")}</span>
            <span className={styles.description}>
              {t("themeDescription")}
            </span>
          </legend>
          <div
            role="group"
            aria-label={t("theme")}
            className={styles.segmented}
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
                    styles.segment,
                    selected && styles["is-active"],
                  )}
                >
                  {selected ? (
                    <motion.span
                      layoutId="settingsThemeIndicator"
                      aria-hidden="true"
                      className={styles.indicator}
                      transition={SPRING}
                    />
                  ) : null}
                  <span className={styles.segmentContent}>
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
    </MotionConfig>
  );
}
