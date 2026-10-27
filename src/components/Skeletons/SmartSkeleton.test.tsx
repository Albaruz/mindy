import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SmartSkeleton } from "./SmartSkeleton";
import type { SkeletonVariant } from "./SmartSkeleton";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, vars?: Record<string, string>) =>
    vars?.label ?? key,
}));

const VARIANTS: SkeletonVariant[] = [
  "top",
  "bottom",
  "footwear",
  "mid_layer",
  "outerwear",
  "brand",
];

describe("SmartSkeleton", () => {
  it("renders a busy status region with the label", () => {
    render(<SmartSkeleton label="Garment" />);
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-busy", "true");
    expect(status).toHaveAttribute("aria-label", "Garment");
  });

  it.each(VARIANTS)("renders the %s variant", (variant) => {
    const { container } = render(
      <SmartSkeleton label="Garment" variant={variant} />,
    );
    expect(container.querySelector("svg")).toBeInTheDocument();
  });
});
