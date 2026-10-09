import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { MorphoIcon } from "./MorphoIcon";
import type { Morphology } from "@/types/user";

const MORPHOLOGIES: Morphology[] = [
  "triangle",
  "inverted_triangle",
  "hourglass",
  "rectangle",
  "oval",
];

describe("MorphoIcon", () => {
  for (const type of MORPHOLOGIES) {
    it(`renders the ${type} silhouette`, () => {
      const { container } = render(<MorphoIcon type={type} />);
      const svg = container.querySelector("svg");
      expect(svg).not.toBeNull();
      const path = container.querySelector("path");
      expect(path?.getAttribute("d")).toBeTruthy();
    });
  }

  it("forwards className to the svg", () => {
    const { container } = render(
      <MorphoIcon type="oval" className="custom-icon" />,
    );
    expect(container.querySelector("svg")).toHaveClass("custom-icon");
  });
});
