import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PageHeader } from "./PageHeader";

describe("PageHeader branch coverage", () => {
  it("centers the header when aligned center", () => {
    render(<PageHeader title="Closet" align="center" />);
    expect(screen.getByRole("heading", { name: "Closet" }).parentElement?.parentElement?.className).toContain(
      "centered",
    );
  });

  it("applies the compact variant", () => {
    render(<PageHeader title="Closet" compact />);
    expect(screen.getByRole("heading", { name: "Closet" }).parentElement?.parentElement?.className).toContain(
      "compact",
    );
  });

  it("marks the header when an avatar is present", () => {
    render(<PageHeader title="Closet" avatar={<span data-testid="page-avatar">A</span>} />);
    expect(screen.getByTestId("page-avatar")).toBeInTheDocument();
  });

  it("omits avatar and actions by default", () => {
    const { container } = render(<PageHeader title="Closet" />);
    expect(container.querySelector('[class*="__avatar"]')).not.toBeInTheDocument();
    expect(container.querySelector('[class*="__actions"]')).not.toBeInTheDocument();
  });
});
