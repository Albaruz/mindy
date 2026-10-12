import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Garment } from "@/types/garment";

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

vi.mock("@/features/closet/useClosetQuery", () => ({
  useClosetQuery: mockCloset,
}));

vi.mock("@/features/profile/useProfileQuery", () => ({
  useProfileQuery: () => ({ data: null }),
}));

vi.mock("./useWeatherQuery", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./useWeatherQuery")>();
  return { ...actual, useWeatherQuery: mockWeather };
});

vi.mock("./useDismissGarment", () => ({
  useDismissGarment: () => vi.fn(),
}));

vi.mock("./useCombineLocked", () => ({
  useCombineLocked: () => ({ isPending: false, mutate: vi.fn() }),
}));

vi.mock("./useWearToday", () => ({
  useWearToday: () => ({ isPending: false, mutate: vi.fn() }),
}));

vi.mock("./CategoryCarousel", () => ({
  CategoryCarousel: ({ category }: { category: string }) => (
    <div data-testid={`carousel-${category}`} />
  ),
}));

vi.mock("@/components/BottomActionBar/BottomActionBar", () => ({
  BottomActionBar: () => <div data-testid="action-bar" />,
}));

import { ManualCarousels } from "./ManualCarousels";
import { useGeneratorStore } from "./useGeneratorStore";

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
