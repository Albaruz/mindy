import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ColorSwatches } from "./ColorSwatches";

const OPTIONS = ["red", "blue", "green"] as const;
const SWATCHES = { red: "#ff0000", blue: "#0000ff", green: "#00ff00" };

describe("ColorSwatches", () => {
  it("renders one radio per option", () => {
    render(
      <ColorSwatches
        name="color"
        label="Color"
        options={OPTIONS}
        swatches={SWATCHES}
        value=""
        onSelect={() => {}}
      />,
    );
    expect(screen.getByRole("radio", { name: "red" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "blue" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "green" })).toBeInTheDocument();
  });

  it("checks the selected value and echoes it in the legend", () => {
    render(
      <ColorSwatches
        name="color"
        label="Color"
        options={OPTIONS}
        swatches={SWATCHES}
        value="blue"
        onSelect={() => {}}
      />,
    );
    expect(screen.getByRole("radio", { name: "blue" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "red" })).not.toBeChecked();
    expect(screen.getAllByText("blue").length).toBeGreaterThanOrEqual(2);
  });

  it("calls onSelect when an option is chosen", async () => {
    const onSelect = vi.fn();
    render(
      <ColorSwatches
        name="color"
        label="Color"
        options={OPTIONS}
        swatches={SWATCHES}
        value=""
        onSelect={onSelect}
      />,
    );
    await userEvent.click(screen.getByRole("radio", { name: "green" }));
    expect(onSelect).toHaveBeenCalledWith("green");
  });

  it("clears the value when the selected option is clicked and deselect is allowed", async () => {
    const onSelect = vi.fn();
    render(
      <ColorSwatches
        name="color"
        label="Color"
        options={OPTIONS}
        swatches={SWATCHES}
        value="blue"
        onSelect={onSelect}
        allowDeselect
      />,
    );
    await userEvent.click(screen.getByRole("radio", { name: "blue" }));
    expect(onSelect).toHaveBeenCalledWith("");
  });

  it("keeps the value when the selected option is clicked without deselect", async () => {
    const onSelect = vi.fn();
    render(
      <ColorSwatches
        name="color"
        label="Color"
        options={OPTIONS}
        swatches={SWATCHES}
        value="blue"
        onSelect={onSelect}
      />,
    );
    await userEvent.click(screen.getByRole("radio", { name: "blue" }));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("applies formatOption to labels", () => {
    render(
      <ColorSwatches
        name="color"
        label="Color"
        options={OPTIONS}
        swatches={SWATCHES}
        value=""
        onSelect={() => {}}
        formatOption={(value) => value.toUpperCase()}
      />,
    );
    expect(screen.getByRole("radio", { name: "RED" })).toBeInTheDocument();
  });
});
