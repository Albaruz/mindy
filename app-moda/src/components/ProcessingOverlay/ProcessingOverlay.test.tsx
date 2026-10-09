import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProcessingOverlay } from "./ProcessingOverlay";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

describe("ProcessingOverlay", () => {
  it("renders a blocking status region", () => {
    render(<ProcessingOverlay />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("falls back to the translated processing message", () => {
    render(<ProcessingOverlay />);
    expect(screen.getByText("processingEllipsis")).toBeInTheDocument();
  });

  it("renders a custom message when provided", () => {
    render(<ProcessingOverlay message="Removing background" />);
    expect(screen.getByText("Removing background")).toBeInTheDocument();
  });
});
