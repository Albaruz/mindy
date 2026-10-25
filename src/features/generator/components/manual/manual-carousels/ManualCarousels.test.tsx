import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Garment } from "@/types/garment";
import type { ReactNode } from "react";

const { mockCloset, mockWeather, mockToggleLock } = vi.hoisted(() => ({
  mockCloset: vi.fn(),
  mockWeather: vi.fn(),
  mockToggleLock: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("swiper/css", () => ({}));
vi.mock("swiper/css/effect-coverflow", () => ({}));

vi.mock("@/features/closet/hooks/queries/useClosetQuery", () => ({
  useClosetQuery: mockCloset,
}));

vi.mock("@/features/profile/hooks/profile/useProfileQuery", () => ({
  useProfileQuery: () => ({ data: null }),
}));

vi.mock("../../../hooks/weather/useWeatherQuery", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../hooks/weather/useWeatherQuery")>();
  return { ...actual, useWeatherQuery: mockWeather };
});

vi.mock("../../../hooks/generation/useDismissGarment", () => ({
  useDismissGarment: () => vi.fn(),
}));

vi.mock("../../../hooks/generation/useCombineLocked", () => ({
  useCombineLocked: () => ({ isPending: false, mutate: vi.fn() }),
}));

vi.mock("../../../hooks/outfit-actions/useWearToday", () => ({
  useWearToday: () => ({ isPending: false, mutate: vi.fn() }),
}));

vi.mock("../../../hooks/outfit-actions/usePlanTomorrow", () => ({
  usePlanTomorrow: () => ({ isPending: false, mutate: vi.fn() }),
}));

vi.mock("../category-carousel/CategoryCarousel", () => ({
  CategoryCarousel: ({ category }: { category: string }) => (
    <div data-testid={`carousel-${category}`} />
  ),
}));

vi.mock("@/components/BottomActionBar/BottomActionBar", () => ({
  BottomActionBar: ({
    left,
    extraRightControl,
  }: {
    left: { label: string; onClick: () => void };
    extraRightControl?: ReactNode;
  }) => (
    <div data-testid="action-bar">
      <button type="button" aria-label={left.label} onClick={left.onClick} />
      {extraRightControl}
    </div>
  ),
}));

import { ManualCarousels } from "./ManualCarousels";
import { useGeneratorStore } from "../../../state/generator-store/useGeneratorStore";

function buildGarment(id: string, type: Garment["garmentType"]): Garment {
  return {
    garmentId: id,
    userId: "u1",
    imageUrl: null,
    garmentType: type,
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
  };
}

describe("ManualCarousels", () => {
  beforeEach(() => {
    useGeneratorStore.getState().resetFlow();
    mockToggleLock.mockClear();
  });

  it("renders base carousels", () => {
    mockCloset.mockReturnValue({
      data: [buildGarment("t1", "top"), buildGarment("b1", "bottom")],
      isPending: false,
    });
    mockWeather.mockReturnValue({ data: null });
    render(<ManualCarousels />);
    expect(screen.getByTestId("generator-manual")).toBeInTheDocument();
    expect(screen.getByTestId("carousel-top")).toBeInTheDocument();
    expect(screen.getByTestId("carousel-bottom")).toBeInTheDocument();
  });

  it("places the favorites filter in the action bar", async () => {
    mockCloset.mockReturnValue({
      data: [buildGarment("t1", "top"), buildGarment("b1", "bottom")],
      isPending: false,
    });
    mockWeather.mockReturnValue({ data: null });
    render(<ManualCarousels />);

    const favoritesFilter = screen.getByRole("checkbox", { name: "filters.favorites" });
    expect(screen.getByTestId("action-bar")).toContainElement(favoritesFilter);
    expect(favoritesFilter.className).toContain("check--hide-label");
    expect(favoritesFilter).toHaveAttribute("aria-checked", "false");
    await userEvent.click(favoritesFilter);
    expect(favoritesFilter).toHaveAttribute("aria-checked", "true");
  });

  it("returns from manual carousels to the generator start screen", async () => {
    mockCloset.mockReturnValue({ data: [], isPending: false });
    mockWeather.mockReturnValue({ data: null });
    useGeneratorStore.getState().startManual();
    render(<ManualCarousels />);

    await userEvent.click(screen.getByRole("button", { name: "back" }));

    expect(useGeneratorStore.getState().view).toBe("zero");
  });

  it("hides bottom carousel for one-piece tops", () => {
    mockCloset.mockReturnValue({
      data: [buildGarment("d1", "dress")],
      isPending: false,
    });
    mockWeather.mockReturnValue({ data: null });
    useGeneratorStore
      .getState()
      .setGarment("top", buildGarment("d1", "dress"));
    render(<ManualCarousels />);
    expect(screen.queryByTestId("carousel-bottom")).not.toBeInTheDocument();
  });
});
