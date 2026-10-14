"use client";

import { cn } from "@/lib/utils";
import styles from "./RadioSegments.module.scss";

interface RadioSegmentsProps<T extends string> {
  name: string;
  label: string;
  options: readonly T[];
  value: T | "";
  onSelect: (value: T) => void;
  formatOption?: (value: T) => string;
}

// Large equal-width radio segments with a filled selection, for primary
// single-choice questions (onboarding). Prefer OptionPills for compact tag
// pickers and SegmentedControl for view switches.
export function RadioSegments<T extends string>({
  name,
  label,
  options,
  value,
  onSelect,
  formatOption = (option) => option,
}: RadioSegmentsProps<T>) {
  return (
    <fieldset className={styles["radio-segments"]}>
      <legend className={styles["radio-segments__legend"]}>{label}</legend>
      <div
        className={styles["radio-segments__options"]}
        role="radiogroup"
        aria-label={label}
      >
        {options.map((option) => {
          const selected = value === option;
          return (
            <label
              key={option}
              className={cn(
                styles["radio-segments__option"],
                selected && styles["radio-segments__option--selected"],
              )}
            >
              <input
                type="radio"
                name={name}
                value={option}
                checked={selected}
                onChange={() => onSelect(option)}
                className={cn("visually-hidden", styles["radio-segments__radio"])}
              />
              <span>{formatOption(option)}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}