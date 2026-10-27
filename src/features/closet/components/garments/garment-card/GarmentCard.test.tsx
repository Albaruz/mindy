import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GarmentCard } from "./GarmentCard";
import type { Garment } from "@/types/garment";

const {
  mockTranslate,
  mockTranslateDetail,
  mockMutateFavorite,
} = vi.hoisted(() => ({
  mockTranslate: vi.fn(),
  mockTranslateDetail: vi.fn(),
  mockMutateFavorite: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/lib/translateGarment", () => ({
  useGarmentTranslator: () => ({
    translate: mockTranslate,
    translateDetail: mockTranslateDetail,
  }),
}));

vi.mock("../../../hooks/garment-actions/useToggleFavorite", () => ({
  useToggleFavorite: () => ({
    isPending: false,
    mutate: mockMutateFavorite,
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
    styles: ["casual"],
    cuts: [],
    isFavorite: false,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockTranslate.mockImplementation((value: string | null) => value);
  mockTranslateDetail.mockImplementation((value: string | null) => value);
  mockMutateFavorite.mockReset();
});

describe("GarmentCard", () => {
  it("renders type title with descriptive image alt", () => {
    render(<GarmentCard garment={buildGarment()} />);
    expect(screen.getByRole("heading", { name: "top" })).toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveAttribute("alt", "top (black · all)");
  });

  it("can eagerly load an above-the-fold closet photo", () => {
    render(<GarmentCard garment={buildGarment()} imageLoading="eager" />);
    expect(screen.getByRole("img")).toHaveAttribute("loading", "eager");
  });

  it("renders placeholder without image", () => {
    render(<GarmentCard garment={buildGarment({ imageUrl: null })} />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("calls edit handler", async () => {
    const onEdit = vi.fn();
    render(
      <GarmentCard
        garment={buildGarment()}
        onEdit={onEdit}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "editGarment" }));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it("renders the favorite toggle as a pressed button", () => {
    render(<GarmentCard garment={buildGarment()} />);
    expect(
      screen.getByRole("button", { name: "addToFavorites" }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("shows the remove-from-favorites state when the garment is favorite", () => {
    render(<GarmentCard garment={buildGarment({ isFavorite: true })} />);
    expect(
      screen.getByRole("button", { name: "removeFromFavorites" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("requests the inverse favorite state", async () => {
    const garment = buildGarment();
    render(<GarmentCard garment={garment} />);

    await userEvent.click(
      screen.getByRole("button", { name: "addToFavorites" }),
    );

    expect(mockMutateFavorite).toHaveBeenCalledWith({
      garment,
      isFavorite: true,
    });
  });

  it("disables wash while washing", () => {
    render(
      <GarmentCard
        garment={buildGarment()}
        onWash={() => {}}
        isWashing
      />,
    );
    expect(
      screen.getByRole("button", { name: "washGarment" }),
    ).toBeDisabled();
  });
});
