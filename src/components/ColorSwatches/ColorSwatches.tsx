"use client";

import { cn } from "@/lib/utils";
import styles from "./ColorSwatches.module.scss";

interface ColorSwatchesBaseProps<T extends string> {
  name: string;
  label: string;
  options: readonly T[];
  swatches: Record<string, string>;
  /** Also the accessible name of each circle, so it must be localized. */
  formatOption?: (value: T) => string;
  /** Selection ring color: accent for picks, danger for vetoes. */
  tone?: "accent" | "danger";
  /** Hide the caption under each circle (the name stays as aria-label). */
  hideNames?: boolean;
}

interface ColorSwatchesSingleProps<T extends string>
  extends ColorSwatchesBaseProps<T> {
  multiple?: false;
  value: T | "";
  onSelect: (value: T | "") => void;
  // When true, activating the already-selected option clears the value.
  // Native radios never emit change for a checked input, so the toggle
  // is handled on click (covers mouse, touch and keyboard activation).
  allowDeselect?: boolean;
}

interface ColorSwatchesMultipleProps<T extends string>
  extends ColorSwatchesBaseProps<T> {
  multiple: true;
  values: readonly T[];
  onToggle: (value: T) => void;
}

type ColorSwatchesProps<T extends string> =
  | ColorSwatchesSingleProps<T>
  | ColorSwatchesMultipleProps<T>;

// Canonical color picker: labeled circles. Single mode (radios) echoes the
// selected value next to the legend (onboarding traits, garment form);
// multiple mode (checkboxes) lets the user pick several (forbidden colors).
export function ColorSwatches<T extends string>(
  props: ColorSwatchesProps<T>,
) {
  const {
    name,
    label,
    options,
    swatches,
    formatOption = (option: T) => option,
    tone = "accent",
    hideNames = false,
  } = props;
  const isSelected = (option: T) =>
    props.multiple === true ? props.values.includes(option) : props.value === option;

  return (
    <fieldset className={styles["color-swatches"]}>
      <legend className={styles["color-swatches__legend"]}>
        {label}
        {props.multiple !== true && props.value !== "" ? (
          <span className={styles["color-swatches__value"]}>
            {formatOption(props.value)}
          </span>
        ) : null}
      </legend>
      <div
        className={styles["color-swatches__row"]}
        // The fieldset already groups checkboxes; radios get a radiogroup.
        {...(props.multiple === true
          ? {}
          : { role: "radiogroup", "aria-label": label })}
      >
        {options.map((option) => {
          const selected = isSelected(option);
          const optionLabel = formatOption(option);
          return (
            <label
              key={option}
              title={optionLabel}
              className={cn(
                styles["color-swatches__swatch"],
                hideNames && styles["color-swatches__swatch--compact"],
                tone === "danger" && styles["color-swatches__swatch--danger"],
                selected && styles["color-swatches__swatch--selected"],
              )}
            >
              <input
                type={props.multiple === true ? "checkbox" : "radio"}
                name={name}
                value={option}
                checked={selected}
                onChange={() =>
                  props.multiple === true
                    ? props.onToggle(option)
                    : props.onSelect(option)
                }
                onClick={() => {
                  if (props.multiple !== true && props.allowDeselect && selected) {
                    props.onSelect("");
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
              {hideNames ? null : (
                <span className={styles["color-swatches__name"]}>{optionLabel}</span>
              )}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
