import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilterChips, CATEGORY_FILTERS } from "./FilterChips";
import type { CategoryFilter } from "@/types/ui";

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

  it("centers the newly active chip in the horizontal row", () => {
    const originalScrollTo = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      "scrollTo",
    );
    const scrollTo = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollTo", {
      configurable: true,
      value: scrollTo,
    });

    try {
      const { rerender } = render(
        <FilterChips activeCategory="all" onChange={() => {}} />,
      );
      const row = screen.getByRole("group");
      const midLayerChip = screen.getByRole("button", { name: "filters.mid_layer" });
      Object.defineProperties(row, {
        clientWidth: { configurable: true, value: 300 },
        scrollWidth: { configurable: true, value: 600 },
        getBoundingClientRect: {
          configurable: true,
          value: () => ({
            left: 10,
            top: 0,
            right: 310,
            bottom: 40,
            width: 300,
            height: 40,
            x: 10,
            y: 0,
            toJSON: () => undefined,
          }),
        },
      });
      Object.defineProperty(midLayerChip, "getBoundingClientRect", {
        configurable: true,
        value: () => ({
          left: 240,
          top: 0,
          right: 320,
          bottom: 40,
          width: 80,
          height: 40,
          x: 240,
          y: 0,
          toJSON: () => undefined,
        }),
      });
      scrollTo.mockClear();

      rerender(<FilterChips activeCategory="mid_layer" onChange={() => {}} />);

      expect(scrollTo).toHaveBeenLastCalledWith({ left: 120, behavior: "smooth" });
    } finally {
      if (originalScrollTo) {
        Object.defineProperty(
          HTMLElement.prototype,
          "scrollTo",
          originalScrollTo,
        );
      } else {
        Reflect.deleteProperty(HTMLElement.prototype, "scrollTo");
      }
    }
  });

  it("exposes an accessible group label", () => {
    render(<FilterChips activeCategory="all" onChange={() => {}} />);
    expect(
      screen.getByRole("group", { name: "filterByCategory" }),
    ).toBeInTheDocument();
  });
});
