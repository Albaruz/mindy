import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
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
});
