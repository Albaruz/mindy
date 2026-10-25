import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GarmentCard } from "./GarmentCard";
import type { Garment } from "@/types/garment";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("./useToggleFavorite", () => ({
  useToggleFavorite: () => ({
    isPending: false,
    mutate: vi.fn(),
  }),
}));

vi.mock("@/stores/useNotificationStore", () => ({
  useNotificationStore: {
    getState: () => ({
      addNotification: vi.fn(),
    }),
  },
}));

const { mockTranslate, mockTranslateDetail } = vi.hoisted(() => ({
  mockTranslate: vi.fn(),
  mockTranslateDetail: vi.fn(),
}));

vi.mock("@/lib/translateGarment", () => ({
  useGarmentTranslator: () => ({
    translate: mockTranslate,
    translateDetail: mockTranslateDetail,
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
    extraTags: { specificType: "tee" },
    createdAt: "",
    styles: ["casual"],
    cuts: [],
    isFavorite: false,
    ...overrides,
  };
}

describe("GarmentCard fallback branches", () => {
  it("falls back to the specific type detail when the base has no label", () => {
    mockTranslate.mockReturnValue(null);
    mockTranslateDetail.mockReturnValue("tee");
    render(<GarmentCard garment={buildGarment()} />);
    expect(screen.getByRole("heading", { name: "tee" })).toBeInTheDocument();
  });

  it("falls back to the dictionary key when nothing translates", () => {
    mockTranslate.mockReturnValue(null);
    mockTranslateDetail.mockReturnValue(null);
    render(<GarmentCard garment={buildGarment()} />);
    expect(
      screen.getByRole("heading", { name: "garmentFallback" }),
    ).toBeInTheDocument();
  });

  it("uses the bare type as alt text without subtitle traits", () => {
    mockTranslate.mockImplementation((value: string | null) =>
      value === "top" ? "Top label" : null,
    );
    mockTranslateDetail.mockReturnValue(null);
    render(
      <GarmentCard
        garment={buildGarment({ color: null, season: null })}
      />,
    );
    expect(screen.getByRole("img")).toHaveAttribute("alt", "Top label");
  });
});

describe("GarmentCard wash branches", () => {
  it("calls the wash handler", async () => {
    mockTranslate.mockImplementation((value: string | null) => value);
    mockTranslateDetail.mockImplementation((value: string | null) => value);
    const onWash = vi.fn();
    render(<GarmentCard garment={buildGarment()} onWash={onWash} />);
    await userEvent.click(screen.getByRole("button", { name: "washGarment" }));
    expect(onWash).toHaveBeenCalledTimes(1);
  });

  it("disables wash while washing", () => {
    mockTranslate.mockImplementation((value: string | null) => value);
    mockTranslateDetail.mockImplementation((value: string | null) => value);
    render(
      <GarmentCard garment={buildGarment()} onWash={() => {}} isWashing />,
    );
    expect(screen.getByRole("button", { name: "washGarment" })).toBeDisabled();
  });

  it("renders the favorite toggle without wash or edit handlers", () => {
    mockTranslate.mockImplementation((value: string | null) => value);
    mockTranslateDetail.mockImplementation((value: string | null) => value);
    render(<GarmentCard garment={buildGarment()} />);
    expect(
      screen.getByRole("button", { name: "addToFavorites" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "washGarment" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "editGarment" }),
    ).not.toBeInTheDocument();
  });
});
