import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { HistoryCard } from "./HistoryCard";
import type { HistoryEntry } from "./useHistoryQuery";
import type { Garment } from "@/types/garment";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "en",
}));

vi.mock("@/lib/translateGarment", () => ({
  useGarmentTranslator: () => ({
    translate: () => null,
    translateDetail: () => null,
  }),
}));

function buildGarment(overrides: Partial<Garment> = {}): Garment {
  return {
    garmentId: "garment-one",
    userId: "user-one",
    imageUrl: "https://example.com/garment-one.png",
    garmentType: null,
    style: "casual",
    cutLength: null,
    color: "black",
    material: "cotton",
    season: "all",
    isDirty: false,
    lastWornDate: null,
    isExternalGarment: false,
    extraTags: {},
    createdAt: "",
    ...overrides,
  };
}

function buildEntry(garments: Garment[]): HistoryEntry {
  return {
    history: {
      lookId: "look-one",
      userId: "user-one",
      garmentIds: ["garment-one"],
      wornDate: "2026-03-15",
      createdAt: "2026-03-15",
    },
    garments,
  };
}

describe("HistoryCard branch coverage", () => {
  it("falls back to the translation label when type and detail are missing", () => {
    render(<HistoryCard entry={buildEntry([buildGarment()])} />);
    expect(screen.getByRole("img")).toHaveAttribute("alt", "garmentFallback");
  });

  it("prefers the specific type detail over the fallback", () => {
    render(
      <HistoryCard
        entry={buildEntry([buildGarment({ extraTags: { specificType: 42 } })])}
      />,
    );
    expect(screen.getByRole("img")).toHaveAttribute("alt", "garmentFallback");
  });
});
