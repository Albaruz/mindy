import { useLocale, useTranslations } from "next-intl";
import type { AppLocale } from "@/i18n/routing";

export type GarmentAttributeKind =
  | "type"
  | "color"
  | "material"
  | "style"
  | "season"
  | "cut";

// next-intl "Garments" namespaces per attribute kind (see messages/*.json).
// Stored columns always hold English bases (see garmentOptions
// normalization); Spanish resolves them through these dictionaries.
const KIND_NAMESPACES: Record<GarmentAttributeKind, string> = {
  type: "types",
  color: "colors",
  material: "materials",
  style: "styles",
  season: "seasons",
  cut: "cuts",
};

function normalize(value: string): string {
  return value.toLowerCase().trim();
}

// Client hook: curried translator bound to the active next-intl locale.
// Stored values resolve through the Garments dictionaries; unknown values
// (including specific AI details) return the original untouched.
export function useGarmentTranslator() {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("Garments");

  const lookup = (key: string): string | null =>
    typeof t.has === "function" && t.has(key) ? t(key) : null;

  return {
    locale,
    translate: (
      value: string | null | undefined,
      kind: GarmentAttributeKind,
    ): string | null => {
      if (value === null || value === undefined || value === "") {
        return null;
      }
      const key = normalize(value);
      return (
        lookup(`${KIND_NAMESPACES[kind]}.${key}`) ??
        lookup(`specifics.${key}`) ??
        value
      );
    },
    translateDetail: (value: string | null | undefined): string | null => {
      if (value === null || value === undefined || value === "") {
        return null;
      }
      if (locale !== "es") {
        return value;
      }
      return lookup(`specifics.${normalize(value)}`) ?? value;
    },
  };
}
