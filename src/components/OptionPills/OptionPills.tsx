"use client";

import { cn } from "@/lib/utils";
import styles from "./OptionPills.module.scss";

interface OptionPillsProps<T extends string> {
  name: string;
  label: string;
  options: readonly T[];
  value: T | "";
  onSelect: (value: T) => void;
  formatOption?: (value: T) => string;
  // Hide the legend when a visible heading already labels the group
  // (kept for screen readers).
  hideLabel?: boolean;
}

// Canonical pill radiogroup for closed vocabularies (garment tags, look
// styles). Pills wrap onto vertical rows on narrow screens.
export function OptionPills<T extends string>({
  name,
  label,
  options,
  value,
  onSelect,
  formatOption = (option) => option,
  hideLabel = false,
}: OptionPillsProps<T>) {
  return (
    <fieldset className={styles.group}>
      <legend className={hideLabel ? styles["visually-hidden"] : undefined}>
        {label}
      </legend>
      <div className={styles.options} role="radiogroup" aria-label={label}>
        {options.map((option) => {
          const selected = value === option;
          return (
            <label
              key={option}
              className={cn(styles.option, selected && styles.selected)}
            >
              <input
                type="radio"
                name={name}
                value={option}
                checked={selected}
                onChange={() => onSelect(option)}
                className={styles.radio}
              />
              <span>{formatOption(option)}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
