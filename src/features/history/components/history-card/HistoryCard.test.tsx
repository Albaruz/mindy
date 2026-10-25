import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HistoryCard } from "./HistoryCard";
import type { HistoryEntry } from "../../hooks/queries/useHistoryQuery";
import type { Garment } from "@/types/garment";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "en",
}));

vi.mock("@/lib/translateGarment", () => ({
  useGarmentTranslator: () => ({
    translate: (value: string | null) => value,
    translateDetail: (value: string | null) => value,
  }),
}));

function buildGarment(overrides: Partial<Garment> = {}): Garment {
  return {
    garmentId: "g1",
    userId: "u1",
    imageUrl: "https://example.com/g1.png",
    garmentType: "top",
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

function buildEntry(overrides: Partial<HistoryEntry> = {}): HistoryEntry {
  return {
    history: {
      lookId: "l1",
      userId: "u1",
      garmentIds: ["g1"],
      wornDate: "2026-03-15",
      createdAt: "2026-03-15",
    },
    garments: [buildGarment()],
    ...overrides,
  };
}

describe("HistoryCard", () => {
  it("renders the worn date and garment images", () => {
    render(<HistoryCard entry={buildEntry()} />);
    expect(screen.getByRole("heading")).toHaveTextContent("2026");
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "https://example.com/g1.png");
    expect(img).toHaveAttribute("alt", "top");
  });

  it("falls back to the garment label when the type is missing", () => {
    render(
      <HistoryCard
        entry={buildEntry({
          garments: [
            buildGarment({
              garmentType: null,
              extraTags: { specificType: "sneakers" },
            }),
          ],
        })}
      />,
    );
    expect(screen.getByRole("img")).toHaveAttribute("alt", "sneakers");
  });

  it("shows the unavailable message when no garments are linked", () => {
    render(<HistoryCard entry={buildEntry({ garments: [] })} />);
    expect(screen.getByText("unavailable")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("skips garments without an image", () => {
    render(
      <HistoryCard
        entry={buildEntry({ garments: [buildGarment({ imageUrl: null })] })}
      />,
    );
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("is a passive card without interactive controls", async () => {
    const user = userEvent.setup();
    render(<HistoryCard entry={buildEntry()} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    await user.click(screen.getByRole("heading"));
    expect(screen.getByRole("heading")).toBeInTheDocument();
  });

  it("falls back to the translation label when type and detail are missing", () => {
    const { unmount } = render(
      <HistoryCard
        entry={buildEntry({
          garments: [buildGarment({ garmentType: null })],
        })}
      />,
    );
    expect(screen.getByRole("img")).toHaveAttribute("alt", "garmentFallback");
    unmount();
    // Non-string details are ignored instead of leaking into the alt text.
    render(
      <HistoryCard
        entry={buildEntry({
          garments: [
            buildGarment({
              garmentType: null,
              extraTags: { specificType: 42 as unknown as string },
            }),
          ],
        })}
      />,
    );
    expect(screen.getByRole("img")).toHaveAttribute("alt", "garmentFallback");
  });
});
