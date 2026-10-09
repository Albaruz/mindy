import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PageHeader } from "./PageHeader";

describe("PageHeader", () => {
  it("renders the title as a heading", () => {
    render(<PageHeader title="Closet" />);
    expect(screen.getByRole("heading", { name: "Closet" })).toBeInTheDocument();
  });

  it("renders the description when provided", () => {
    render(<PageHeader title="Closet" description="Your garments" />);
    expect(screen.getByText("Your garments")).toBeInTheDocument();
  });

  it("omits the description when not provided", () => {
    render(<PageHeader title="Closet" />);
    expect(screen.queryByText("Your garments")).not.toBeInTheDocument();
  });

  it("renders actions and avatar slots", () => {
    render(
      <PageHeader
        title="Closet"
        actions={<button type="button">Add</button>}
        avatar={<span data-testid="avatar">A</span>}
      />,
    );
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
    expect(screen.getByTestId("avatar")).toBeInTheDocument();
  });
});
