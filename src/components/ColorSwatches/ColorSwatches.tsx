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
    <fieldset className={styles.swatches}>
      <legend>
        {label}
        {value !== "" ? (
          <span className={styles.swatchValue}>{formatOption(value)}</span>
        ) : null}
      </legend>
      <div className={styles.swatchRow} role="radiogroup" aria-label={label}>
        {options.map((option) => {
          const selected = value === option;
          const optionLabel = formatOption(option);
          return (
            <label
              key={option}
              title={optionLabel}
              className={cn(styles.swatch, selected && styles.selected)}
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
                className={styles.radio}
                aria-label={optionLabel}
              />
              <span
                aria-hidden="true"
                className={styles.swatchDot}
                style={{ background: swatches[option] ?? "#ccc" }}
              />
              <span className={styles.swatchName}>{optionLabel}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
