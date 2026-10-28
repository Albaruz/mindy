import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Garment } from "@/types/garment";
import type { ReactNode } from "react";

const { mockCloset, mockWeather, mockToggleLock, mockWearTodayMutate } = vi.hoisted(() => ({
  mockCloset: vi.fn(),
  mockWeather: vi.fn(),
  mockToggleLock: vi.fn(),
  mockWearTodayMutate: vi.fn(),
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
  useWearToday: () => ({ isPending: false, mutate: mockWearTodayMutate }),
}));

vi.mock("../../../hooks/outfit-actions/usePlanTomorrow", () => ({
  usePlanTomorrow: () => ({ isPending: false, mutate: vi.fn() }),
}));

vi.mock("../category-carousel/CategoryCarousel", () => ({
  CategoryCarousel: ({
    category,
    inclusionControl,
  }: {
    category: string;
    inclusionControl?: { state: string; onToggle: () => void };
  }) => (
    <div
      data-testid={`carousel-${category}`}
      data-inclusion-state={inclusionControl?.state}
    >
      {inclusionControl ? (
        <button
          type="button"
          aria-label={inclusionControl.state === "excluded" ? "showLayer" : "hideLayer"}
          onClick={inclusionControl.onToggle}
        />
      ) : null}
    </div>
  ),
}));

vi.mock("@/components/BottomActionBar/BottomActionBar", () => ({
  BottomActionBar: ({
    left,
    extraRightControl,
    primaryLabel,
    onPrimary,
    primaryDisabled,
  }: {
    left: { label: string; onClick: () => void };
    extraRightControl?: ReactNode;
    primaryLabel: string;
    onPrimary: () => void;
    primaryDisabled: boolean;
  }) => (
    <div data-testid="action-bar">
      <button type="button" aria-label={left.label} onClick={left.onClick} />
      <button
        type="button"
        aria-label={primaryLabel}
        disabled={primaryDisabled}
        onClick={onPrimary}
      />
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
    mockWearTodayMutate.mockClear();
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

  it("shows a mid-layer carousel independently and alongside outerwear", () => {
    useGeneratorStore.getState().toggleMidLayerIncluded();
    mockCloset.mockReturnValue({
      data: [
        buildGarment("t1", "top"),
        buildGarment("b1", "bottom"),
        buildGarment("m1", "mid_layer"),
        buildGarment("o1", "outerwear"),
      ],
      isPending: false,
    });
    mockWeather.mockReturnValue({ data: null });

    render(<ManualCarousels />);

    expect(screen.getByTestId("carousel-mid_layer")).toBeInTheDocument();
    expect(screen.getByTestId("carousel-outerwear")).toBeInTheDocument();
    expect(useGeneratorStore.getState().slots.mid_layer.garment?.garmentId).toBe(
      "m1",
    );
    expect(useGeneratorStore.getState().slots.outerwear.garment?.garmentId).toBe(
      "o1",
    );
  });

  it("shows and initializes the outerwear carousel on a cold day", () => {
    mockCloset.mockReturnValue({
      data: [
        buildGarment("t1", "top"),
        buildGarment("b1", "bottom"),
        buildGarment("o1", "outerwear"),
      ],
      isPending: false,
    });
    mockWeather.mockReturnValue({
      data: {
        temperatureC: 12,
        condition: "Clouds",
        city: "Madrid",
        dayLow: 8,
        dayHigh: 15,
        dayCondition: "Clouds",
        rainProbability: 10,
        fallback: false,
      },
    });

    render(<ManualCarousels />);

    expect(screen.getByTestId("carousel-outerwear")).toBeInTheDocument();
    expect(useGeneratorStore.getState().slots.outerwear.garment?.garmentId).toBe(
      "o1",
    );
  });

  it("keeps a suggested outerwear garment visible and editable on a mild day", () => {
    const suggestedCoat = buildGarment("o1", "outerwear");
    mockCloset.mockReturnValue({
      data: [
        buildGarment("t1", "top"),
        buildGarment("b1", "bottom"),
        suggestedCoat,
      ],
      isPending: false,
    });
    mockWeather.mockReturnValue({
      data: {
        temperatureC: 22,
        condition: "Clear",
        city: "Madrid",
        dayLow: 18,
        dayHigh: 25,
        dayCondition: "Clear",
        rainProbability: 0,
        fallback: false,
      },
    });
    useGeneratorStore.getState().setGarment("outerwear", suggestedCoat);

    render(<ManualCarousels />);

    expect(screen.getByTestId("carousel-outerwear")).toBeInTheDocument();
  });

  it("does not wear an outerwear slot while its weather-hidden carousel is unavailable", async () => {
    mockCloset.mockReturnValue({
      data: [buildGarment("t1", "top"), buildGarment("b1", "bottom")],
      isPending: false,
    });
    mockWeather.mockReturnValue({
      data: {
        temperatureC: 22,
        condition: "Clear",
        city: "Madrid",
        dayLow: 18,
        dayHigh: 25,
        dayCondition: "Clear",
        rainProbability: 0,
        fallback: false,
      },
    });
    const hiddenCoat = buildGarment("o1", "outerwear");
    useGeneratorStore.getState().setGarment("outerwear", hiddenCoat);

    render(<ManualCarousels />);

    expect(screen.queryByTestId("carousel-outerwear")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "wear" }));

    const wornGarments = mockWearTodayMutate.mock.calls[0]?.[0] as Garment[];
    expect(wornGarments.map((garment) => garment.garmentId)).not.toContain("o1");
  });

  it("keeps the mid-layer excluded until the user enables it", async () => {
    mockCloset.mockReturnValue({
      data: [buildGarment("t1", "top"), buildGarment("m1", "mid_layer")],
      isPending: false,
    });
    mockWeather.mockReturnValue({ data: null });
    render(<ManualCarousels />);

    expect(useGeneratorStore.getState().midLayerIncluded).toBe(false);
    expect(screen.getByTestId("carousel-mid_layer")).toHaveAttribute(
      "data-inclusion-state",
      "excluded",
    );
    await userEvent.click(screen.getByRole("button", { name: "showLayer" }));

    expect(useGeneratorStore.getState().midLayerIncluded).toBe(true);
    expect(useGeneratorStore.getState().slots.mid_layer.garment?.garmentId).toBe(
      "m1",
    );
  });

  it("does not include an excluded mid-layer when wearing the manual look", async () => {
    mockCloset.mockReturnValue({
      data: [
        buildGarment("t1", "top"),
        buildGarment("b1", "bottom"),
        buildGarment("m1", "mid_layer"),
      ],
      isPending: false,
    });
    mockWeather.mockReturnValue({ data: null });
    render(<ManualCarousels />);

    await userEvent.click(screen.getByRole("button", { name: "wear" }));

    expect(mockWearTodayMutate).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ garmentId: "t1" }),
        expect.objectContaining({ garmentId: "b1" }),
      ]),
    );
    const wornGarments = mockWearTodayMutate.mock.calls[0]?.[0] as Garment[];
    expect(wornGarments.some((garment) => garment.garmentId === "m1")).toBe(
      false,
    );
  });

  it("orders the layering carousels from outermost to base layer", () => {
    mockCloset.mockReturnValue({
      data: [
        buildGarment("o1", "outerwear"),
        buildGarment("m1", "mid_layer"),
        buildGarment("t1", "top"),
        buildGarment("b1", "bottom"),
        buildGarment("f1", "footwear"),
      ],
      isPending: false,
    });
    mockWeather.mockReturnValue({ data: null });

    render(<ManualCarousels />);

    const carouselIds = ["outerwear", "mid_layer", "top", "bottom", "footwear"];
    const carousels = carouselIds.map((category) =>
      screen.getByTestId(`carousel-${category}`),
    );
    expect(
      carousels.every(
        (carousel, index) =>
          index === 0 ||
          Boolean(
            carousels[index - 1]?.compareDocumentPosition(carousel) &
              Node.DOCUMENT_POSITION_FOLLOWING,
          ),
      ),
    ).toBe(true);
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
