import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Garment } from "@/types/garment";
import { FavoritesSelectionStep } from "./FavoritesSelectionStep";

const { mockFavorites } = vi.hoisted(() => ({
  mockFavorites: [] as Garment[],
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/features/closet/useFavoritesQuery", () => ({
  useFavoritesQuery: () => ({ data: mockFavorites }),
}));

vi.mock("./useGeneratorStore", () => ({
  useGeneratorStore: (selector: (state: { lookStyle: string }) => unknown) =>
    selector({ lookStyle: "casual" }),
}));

describe("FavoritesSelectionStep", () => {
  it("shows the empty state when favorites have no photos", () => {
    mockFavorites.splice(
      0,
      mockFavorites.length,
      {
        garmentId: "g1",
        imageUrl: null,
      } as Garment,
    );

    render(
      <FavoritesSelectionStep onSelect={vi.fn()} onBack={vi.fn()} />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "favoritesPickerEmpty",
    );
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("does not offer dirty favorites for selection", () => {
    mockFavorites.splice(
      0,
      mockFavorites.length,
      {
        garmentId: "dirty-favorite",
        garmentType: "top",
        imageUrl: "https://example.com/garment.png",
        isDirty: true,
      } as Garment,
    );

    render(
      <FavoritesSelectionStep onSelect={vi.fn()} onBack={vi.fn()} />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "favoritesPickerEmpty",
    );
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });
});
