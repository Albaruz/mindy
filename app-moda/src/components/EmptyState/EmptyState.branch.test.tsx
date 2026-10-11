import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyState } from "./EmptyState";

describe("EmptyState branch coverage", () => {
  it("renders the icon slot", () => {
    render(<EmptyState message="Empty" icon={<span data-testid="state-icon">icon</span>} />);
    expect(screen.getByTestId("state-icon")).toBeInTheDocument();
  });

  it("omits the icon slot when not provided", () => {
    const { container } = render(<EmptyState message="Empty" />);
    expect(container.querySelector('[class*="__icon"]')).not.toBeInTheDocument();
  });

  it("applies the compact variant", () => {
    const { getByText } = render(<EmptyState message="Empty" compact />);
    expect(getByText("Empty").parentElement?.className).toContain("compact");
  });

  it("omits description and actions when not provided", () => {
    const { container } = render(<EmptyState message="Empty" />);
    expect(container.querySelector('[class*="__description"]')).not.toBeInTheDocument();
    expect(container.querySelector('[class*="__actions"]')).not.toBeInTheDocument();
  });
});
