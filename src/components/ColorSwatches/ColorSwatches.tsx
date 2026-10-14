"use client";

import { cn } from "@/lib/utils";
import styles from "./ColorSwatches.module.scss";

interface ColorSwatchesProps<T extends string> {
  name: string;
  label: string;
  options: readonly T[];
  swatches: Record<string, string>;
  value: T | "";
  onSelect: (value: T | "") => void;
  // When true, activating the already-selected option clears the value.
  // Native radios never emit change for a checked input, so the toggle
  // is handled on click (covers mouse, touch and keyboard activation).
  allowDeselect?: boolean;
  formatOption?: (value: T) => string;
}

// Canonical color picker: labeled circles with the selected value echoed
// next to the legend. Shared by onboarding traits and the garment form.
export function ColorSwatches<T extends string>({
  name,
  label,
  options,
  swatches,
  value,
  onSelect,
  allowDeselect = false,
  formatOption = (option) => option,
}: ColorSwatchesProps<T>) {
  return (
    <fieldset className={styles["color-swatches"]}>
      <legend className={styles["color-swatches__legend"]}>
        {label}
        {value !== "" ? (
          <span className={styles["color-swatches__value"]}>{formatOption(value)}</span>
        ) : null}
      </legend>
      <div className={styles["color-swatches__row"]} role="radiogroup" aria-label={label}>
        {options.map((option) => {
          const selected = value === option;
          const optionLabel = formatOption(option);
          return (
            <label
              key={option}
              title={optionLabel}
              className={cn(styles["color-swatches__swatch"], selected && styles["color-swatches__swatch--selected"])}
            >
              <input
                type="radio"
                name={name}
                value={option}
                checked={selected}
                onChange={() => onSelect(option)}
                onClick={() => {
                  if (allowDeselect && selected) {
                    onSelect("");
                  }
                }}
                className={cn("visually-hidden", styles["color-swatches__radio"])}
                aria-label={optionLabel}
              />
              <span
                aria-hidden="true"
                className={styles["color-swatches__dot"]}
                style={{ background: swatches[option] ?? "#ccc" }}
              />
              <span className={styles["color-swatches__name"]}>{optionLabel}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
