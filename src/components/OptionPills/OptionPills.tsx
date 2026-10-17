"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import styles from "./OptionPills.module.scss";

interface OptionPillsProps<T extends string> {
  name: string;
  label: string;
  options: readonly T[];
  value: T | "";
  onSelect: (value: T) => void;
  formatOption?: (value: T) => string;
  disabledOptions?: readonly T[];
  alignment?: "start" | "center";
  // Optional decorative icon shown before each label (aria-hidden by the caller).
  renderIcon?: (value: T) => ReactNode;
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
  disabledOptions = [],
  alignment = "start",
  renderIcon,
  hideLabel = false,
}: OptionPillsProps<T>) {
  return (
    <fieldset
      className={cn(
        styles["option-pills"],
        alignment === "center" && styles["option-pills--centered"],
      )}
    >
      <legend className={hideLabel ? "visually-hidden" : styles["option-pills__legend"]}>
        {label}
      </legend>
      <div className={styles["option-pills__options"]} role="radiogroup" aria-label={label}>
        {options.map((option) => {
          const selected = value === option;
          const disabled = disabledOptions.includes(option);
          return (
            <label
              key={option}
              className={cn(
                styles["option-pills__option"],
                selected && styles["option-pills__option--selected"],
                disabled && styles["option-pills__option--disabled"],
              )}
            >
              <input
                type="radio"
                name={name}
                value={option}
                checked={selected}
                disabled={disabled}
                onChange={() => {
                  if (!disabled) {
                    onSelect(option);
                  }
                }}
                className={cn("visually-hidden", styles["option-pills__radio"])}
              />
              <span className={styles["option-pills__label"]}>
                {renderIcon?.(option)}
                {formatOption(option)}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
