import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OptionPills } from "./OptionPills";

describe("OptionPills", () => {
  it("renders a radiogroup, marks the selected pill and reports selection", () => {
    const onSelect = vi.fn();
    render(
      <OptionPills
        name="type"
        label="Type"
        options={["top", "bottom"] as const}
        value="top"
        onSelect={onSelect}
        formatOption={(option) => option.toUpperCase()}
      />,
    );
    expect(screen.getByRole("radiogroup", { name: "Type" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "TOP" })).toBeChecked();
    fireEvent.click(screen.getByRole("radio", { name: "BOTTOM" }));
    expect(onSelect).toHaveBeenCalledWith("bottom");
  });

  it("shows an optional icon and can hide the legend visually", () => {
    render(
      <OptionPills
        name="season"
        label="Season"
        options={["summer"] as const}
        value=""
        onSelect={() => {}}
        hideLabel
        renderIcon={(option) => <svg data-testid={`icon-${option}`} />}
      />,
    );
    expect(screen.getByTestId("icon-summer")).toBeInTheDocument();
    expect(screen.getByText("Season", { selector: "legend" })).toHaveClass(
      "visually-hidden",
    );
  });
});