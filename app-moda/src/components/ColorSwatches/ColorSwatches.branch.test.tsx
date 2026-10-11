import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ColorSwatches } from "./ColorSwatches";

const OPTIONS = ["red", "blue"] as const;

describe("ColorSwatches branch coverage", () => {
  it("falls back to a default swatch color when missing", () => {
    const { container } = render(
      <ColorSwatches
        name="color"
        label="Color"
        options={OPTIONS}
        swatches={{}}
        value=""
        onSelect={() => {}}
      />,
    );
    const dots = container.querySelectorAll('[aria-hidden="true"]');
    expect(dots.length).toBeGreaterThan(0);
  });

  it("omits the legend value when nothing is selected", () => {
    const { container } = render(
      <ColorSwatches
        name="color"
        label="Color"
        options={OPTIONS}
        swatches={{ red: "#ff0000" }}
        value=""
        onSelect={() => {}}
      />,
    );
    expect(container.querySelector("legend")?.textContent).toBe("Color");
  });

  it("does not clear on plain change without deselect", async () => {
    const onSelect = vi.fn();
    render(
      <ColorSwatches
        name="color"
        label="Color"
        options={OPTIONS}
        swatches={{ red: "#ff0000", blue: "#0000ff" }}
        value="red"
        onSelect={onSelect}
      />,
    );
    await userEvent.click(screen.getByRole("radio", { name: "blue" }));
    expect(onSelect).toHaveBeenCalledWith("blue");
  });
});
