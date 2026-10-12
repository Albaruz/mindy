import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import styles from "./FilterChips.module.scss";

// Stable filter keys: labels translate, keys drive the taxonomy prefilter
// (see searchGarments). Never use display text as filter state.
export type CategoryFilter =
  | "all"
  | "tops"
  | "bottoms"
  | "shoes"
  | "outerwear";

export const CATEGORY_FILTERS: readonly CategoryFilter[] = [
  "all",
  "tops",
  "bottoms",
  "shoes",
  "outerwear",
];

interface FilterChipsProps {
  activeCategory: CategoryFilter;
  onChange: (category: CategoryFilter) => void;
}

// Quick category filters for the closet view. State lives in the parent so
// the active category composes with the text search filtering.
export function FilterChips({ activeCategory, onChange }: FilterChipsProps) {
  const t = useTranslations("Closet");
  const ta = useTranslations("Accessibility");
  return (
    <div role="group" aria-label={ta("filterByCategory")} className={styles.row}>
      {CATEGORY_FILTERS.map((category) => {
        const active = category === activeCategory;
        return (
          <button
            key={category}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(category)}
            className={cn(styles.chip, active && styles["is-active"])}
          >
            {t(`filters.${category}`)}
          </button>
        );
      })}
    </div>
  );
}
