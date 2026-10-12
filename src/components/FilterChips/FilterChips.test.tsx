import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilterChips, CATEGORY_FILTERS } from "./FilterChips";
import type { CategoryFilter } from "./FilterChips";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

describe("FilterChips", () => {
  it("renders one chip per category filter", () => {
    render(<FilterChips activeCategory="all" onChange={() => {}} />);
    for (const category of CATEGORY_FILTERS) {
      expect(
        screen.getByRole("button", { name: `filters.${category}` }),
      ).toBeInTheDocument();
    }
  });

  it("marks the active category as pressed", () => {
    render(<FilterChips activeCategory="tops" onChange={() => {}} />);
    expect(
      screen.getByRole("button", { name: "filters.tops" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: "filters.all" }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("calls onChange with the selected category", async () => {
    const onChange = vi.fn();
    render(<FilterChips activeCategory="all" onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "filters.shoes" }));
    expect(onChange).toHaveBeenCalledWith("shoes" satisfies CategoryFilter);
  });

  it("exposes an accessible group label", () => {
    render(<FilterChips activeCategory="all" onChange={() => {}} />);
    expect(
      screen.getByRole("group", { name: "filterByCategory" }),
    ).toBeInTheDocument();
  });
});
