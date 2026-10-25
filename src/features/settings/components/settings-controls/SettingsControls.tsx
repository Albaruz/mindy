"use client";

import { useLocale, useTranslations } from "next-intl";
import { Monitor, Moon, Sun } from "lucide-react";
import { SegmentedControl } from "@/components/SegmentedControl/SegmentedControl";
import {
  THEME_MODES,
  useThemeStore,
} from "@/features/settings/state/theme-store/themeStore";
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

// Language and theme switches on the shared SegmentedControl, flat on the
// parent card. Language switches via locale-prefixed navigation (NEXT_LOCALE
// persists on device); theme flips CSS variables instantly (no reload).
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
    <div className={styles["settings-controls"]}>
      <fieldset className={styles["settings-controls__group"]}>
        <legend className={styles["settings-controls__legend"]}>
          <span className={styles["settings-controls__title"]}>{t("language")}</span>
          <span className={styles["settings-controls__description"]}>
            {t("languageDescription")}
          </span>
        </legend>
        <SegmentedControl
          label={t("language")}
          value={locale}
          onChange={handleLocaleChange}
          options={routing.locales.map((option) => ({
            value: option,
            label: LANGUAGE_LABELS[option],
          }))}
        />
      </fieldset>

      <fieldset className={styles["settings-controls__group"]}>
        <legend className={styles["settings-controls__legend"]}>
          <span className={styles["settings-controls__title"]}>{t("theme")}</span>
          <span className={styles["settings-controls__description"]}>
            {t("themeDescription")}
          </span>
        </legend>
        <SegmentedControl
          label={t("theme")}
          value={themeMode}
          onChange={setThemeMode}
          options={THEME_MODES.map((option) => {
            const { labelKey, Icon } = THEME_META[option];
            return {
              value: option,
              label: t(labelKey),
              icon: <Icon aria-hidden="true" size={18} strokeWidth={1.5} />,
            };
          })}
        />
      </fieldset>
    </div>
  );
}