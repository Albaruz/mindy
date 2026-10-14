"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import styles from "./SegmentedControl.module.scss";

interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  // Optional decorative icon before the label (aria-hidden by the caller).
  icon?: ReactNode;
}

interface SegmentedControlProps<T extends string> {
  label: string;
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

// Two-or-more option pill switch (wardrobe clean/dirty, settings groups).
// Single-select radiogroup semantics with a sliding-look active segment.
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <div role="group" aria-label={label} className={styles.segmented}>
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(styles.segment, active && styles.active)}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
