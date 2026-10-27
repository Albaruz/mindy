import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import styles from "./FilterChips.module.scss";
import type { CategoryFilter } from "@/types/ui";

export const CATEGORY_FILTERS: readonly CategoryFilter[] = [
  "all",
  "tops",
  "bottoms",
  "shoes",
  "mid_layer",
  "outerwear",
];

interface FilterChipsProps {
  activeCategory: CategoryFilter;
  onChange: (category: CategoryFilter) => void;
}

// Quick category filters for the closet view. State lives in the parent so
// the active category composes with the text search filtering.
export function FilterChips({
  activeCategory,
  onChange,
}: FilterChipsProps) {
  const t = useTranslations("Closet");
  const ta = useTranslations("Accessibility");
  const rowRef = useRef<HTMLDivElement>(null);
  const activeChipRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const row = rowRef.current;
    const activeChip = activeChipRef.current;
    if (
      row === null ||
      activeChip === null ||
      row.scrollWidth <= row.clientWidth ||
      typeof row.scrollTo !== "function"
    ) {
      return;
    }

    const rowRect = row.getBoundingClientRect();
    const chipRect = activeChip.getBoundingClientRect();
    const maxScrollLeft = Math.max(0, row.scrollWidth - row.clientWidth);
    const centeredLeft =
      row.scrollLeft +
      chipRect.left -
      rowRect.left +
      chipRect.width / 2 -
      row.clientWidth / 2;
    const reducedMotion =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    row.scrollTo({
      left: Math.min(maxScrollLeft, Math.max(0, centeredLeft)),
      behavior: reducedMotion ? "auto" : "smooth",
    });
  }, [activeCategory]);

  return (
    <div
      ref={rowRef}
      role="group"
      aria-label={ta("filterByCategory")}
      className={styles.row}
    >
      {CATEGORY_FILTERS.map((category) => {
        const active = category === activeCategory;
        return (
          <button
            key={category}
            ref={active ? activeChipRef : undefined}
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
