import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GarmentImage } from "./GarmentImage";

describe("GarmentImage", () => {
  it("renders a lazy image with its alt text", () => {
    render(<GarmentImage src="/a.png" alt="Blue shirt" className="img" />);
    const image = screen.getByRole("img", { name: "Blue shirt" });
    expect(image).toHaveAttribute("src", "/a.png");
    expect(image).toHaveAttribute("loading", "lazy");
    expect(image).toHaveClass("img");
  });

  it("marks eager images as high priority", () => {
    render(<GarmentImage src="/a.png" alt="Hero" loading="eager" />);
    const image = screen.getByRole("img", { name: "Hero" });
    expect(image).toHaveAttribute("loading", "eager");
    expect(image).toHaveAttribute("fetchpriority", "high");
  });

  it("renders the decorative placeholder when there is no photo", () => {
    const { container } = render(
      <GarmentImage src={null} alt="x" placeholderClassName="ph" />,
    );
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(container.querySelector(".ph")).toHaveAttribute("aria-hidden", "true");
  });

  it("renders nothing without a photo or placeholder", () => {
    const { container } = render(<GarmentImage src={null} alt="x" />);
    expect(container).toBeEmptyDOMElement();
  });
});