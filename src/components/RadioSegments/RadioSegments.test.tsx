import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RadioSegments } from "./RadioSegments";

describe("RadioSegments", () => {
  it("renders labelled radio segments and reports selection", () => {
    const onSelect = vi.fn();
    render(
      <RadioSegments
        name="fit"
        label="Fit"
        options={["regular", "oversized"] as const}
        value="regular"
        onSelect={onSelect}
        formatOption={(option) => `fit:${option}`}
      />,
    );
    expect(screen.getByRole("radiogroup", { name: "Fit" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "fit:regular" })).toBeChecked();
    fireEvent.click(screen.getByRole("radio", { name: "fit:oversized" }));
    expect(onSelect).toHaveBeenCalledWith("oversized");
  });

  it("falls back to the raw option as label and allows an empty value", () => {
    render(
      <RadioSegments
        name="section"
        label="Section"
        options={["women", "men"] as const}
        value=""
        onSelect={() => {}}
      />,
    );
    expect(screen.getByRole("radio", { name: "women" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "men" })).not.toBeChecked();
  });
});