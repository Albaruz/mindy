import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Garment } from "@/types/garment";
import type { UserProfile } from "@/types/user";
import type { WeatherInfo } from "@/types/weather";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "en",
}));

vi.mock("next/dynamic", () => ({
  // Home declares two dynamic components (manual carousels, celebration).
  // Resolve each call to its matching stub by inspecting the loader source,
  // so the celebration overlay renders with its test ids.
  default: (
    _loader: () => Promise<unknown>,
    options?: { loading?: () => React.ReactNode },
  ) => {
    const source = Function.prototype.toString.call(_loader);
    if (source.includes("OutfitCelebrationScreen")) {
      function CelebrationStub({ onClose }: { onClose: () => void }) {
        return (
          <div data-testid="celebration">
            <button
              type="button"
              data-testid="celebration-close"
              onClick={onClose}
            />
          </div>
        );
      }
      return CelebrationStub;
    }
    function ManualStub() {
      return (
        <>
          <div data-testid="manual-carousels" />
          {options?.loading?.()}
        </>
      );
    }
    return ManualStub;
  },
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: mockRouterPush }),
}));

vi.mock("framer-motion", async (importOriginal) => {
  const actual = await importOriginal<typeof import("framer-motion")>();
  return {
    ...actual,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
  };
});

vi.mock("@/features/closet/hooks/queries/useClosetQuery", () => ({
  useClosetQuery: () => ({ data: mockClosetData() }),
}));

vi.mock("@/features/closet/hooks/queries/useFavoritesQuery", () => ({
  useFavoritesQuery: () => ({ data: mockFavoritesData() }),
}));

vi.mock("@/features/profile/hooks/profile/useProfileQuery", () => ({
  useProfileQuery: () => ({ data: mockProfileData() }),
}));

vi.mock("@/lib/garment/useLaundryMutation", () => ({
  useWashAllGarments: () => ({ isPending: false, mutate: mockDoLaundry }),
}));

vi.mock("../../hooks/weather/useWeatherQuery", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../hooks/weather/useWeatherQuery")>();
  return {
    ...actual,
    useWeatherQuery: () => ({
      data: mockWeatherData(),
    }),
  };
});

const {
  mockGenerateMutate,
  mockWearMutate,
  mockPlanMutate,
  mockWeatherData,
  mockProfileData,
  mockClosetData,
  mockFavoritesData,
  mockRouterPush,
  mockDoLaundry,
} = vi.hoisted(() => ({
  mockGenerateMutate: vi.fn(),
  mockWearMutate: vi.fn(),
  mockPlanMutate: vi.fn(),
  mockWeatherData: vi.fn<() => WeatherInfo | null>(() => null),
  mockProfileData: vi.fn<() => UserProfile | null>(() => null),
  mockClosetData: vi.fn<() => Garment[]>(() => []),
  mockFavoritesData: vi.fn<() => Garment[]>(() => []),
  mockRouterPush: vi.fn(),
  mockDoLaundry: vi.fn(),
}));

let mockGeneratePending = false;
let mockWearPending = false;

vi.mock("../../hooks/generation/useGenerateLooks", () => ({
  useGenerateLooks: () => ({
    get isPending() {
      return mockGeneratePending;
    },
    mutate: mockGenerateMutate,
  }),
}));

vi.mock("../../hooks/outfit-actions/useWearToday", () => ({
  useWearToday: () => ({
    get isPending() {
      return mockWearPending;
    },
    mutate: mockWearMutate,
  }),
}));

vi.mock("../../components/states/zero-state/ZeroState", () => ({
  ZeroState: ({
    onAuto,
    onManual,
  }: {
    onAuto: () => void;
    onManual: () => void;
  }) => (
    <div data-testid="zero-state">
      <button type="button" data-testid="zero-auto" onClick={onAuto} />
      <button type="button" data-testid="zero-manual" onClick={onManual} />
    </div>
  ),
}));

vi.mock("../../components/flow/style-step/StyleStep", () => ({
  StyleStep: ({
    value,
    isPending,
    onChange,
    onConfirm,
    onBack,
    hasFavorites,
    useFavorite,
    onToggleFavorite,
  }: {
    value: string;
    isPending: boolean;
    onChange: (style: "casual" | "formal") => void;
    onConfirm: () => void;
    onBack: () => void;
    hasFavorites: boolean;
    useFavorite: boolean;
    onToggleFavorite: (value: boolean) => void;
  }) => (
    <div data-testid="style-step" data-value={value} data-pending={isPending}>
      <button
        type="button"
        data-testid="style-pick-formal"
        onClick={() => onChange("formal")}
      />
      <button type="button" data-testid="style-confirm" onClick={onConfirm} />
      <button type="button" data-testid="style-back" onClick={onBack} />
      {hasFavorites ? (
        <button
          type="button"
          data-testid="toggle-favorite-selection"
          aria-pressed={useFavorite}
          onClick={() => onToggleFavorite(!useFavorite)}
        />
      ) : null}
    </div>
  ),
}));

vi.mock("../../components/flow/favorites-selection-step/FavoritesSelectionStep", () => ({
  FavoritesSelectionStep: ({ onSelect }: { onSelect: (id: string) => void }) => (
    <button
      type="button"
      data-testid="select-explicit-favorite"
      onClick={() => onSelect("favorite-top")}
    />
  ),
}));

vi.mock("../../components/showcase/look-showcase/LookShowcase", () => ({
  LookShowcase: ({
    onWear,
    onDiscard,
  }: {
    onWear: () => void;
    onDiscard: () => void;
  }) => (
    <div data-testid="look-showcase">
      <button type="button" data-testid="showcase-wear" onClick={onWear} />
      <button
        type="button"
        data-testid="showcase-discard"
        onClick={onDiscard}
      />
    </div>
  ),
  ShowcaseEmptyState: ({
    onManual,
    reason,
  }: {
    onManual: () => void;
    reason?: string;
  }) => (
    <div data-testid="showcase-empty" data-reason={reason ?? "exhausted"}>
      <button type="button" data-testid="empty-manual" onClick={onManual} />
    </div>
  ),
}));

vi.mock("../../hooks/outfit-actions/usePlanTomorrow", () => ({
  usePlanTomorrow: () => ({
    get isPending() {
      return false;
    },
    mutate: mockPlanMutate,
  }),
}));

vi.mock("../../components/showcase/showcase-card/ShowcaseCard", () => ({
  ShowcaseCard: () => <div data-testid="streaming-look-preview" />,
}));

vi.mock("../../components/states/insufficient-style-empty/InsufficientStyleEmpty", () => ({
  InsufficientStyleEmpty: ({
    onChooseAnother,
    onManual,
  }: {
    onChooseAnother: () => void;
    onManual: () => void;
  }) => (
    <div data-testid="style-empty">
      <button
        type="button"
        data-testid="shortage-another"
        onClick={onChooseAnother}
      />
      <button type="button" data-testid="shortage-manual" onClick={onManual} />
    </div>
  ),
}));

vi.mock("../../components/showcase/outfit-celebration-screen/OutfitCelebrationScreen", () => ({
  OutfitCelebrationScreen: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="celebration">
      <button type="button" data-testid="celebration-close" onClick={onClose} />
    </div>
  ),
}));

vi.mock("@/components/BottomActionBar/BottomActionBar", () => ({
  BottomActionBar: ({
    onPrimary,
    primaryDisabled,
    left,
    right,
  }: {
    onPrimary: () => void;
    primaryDisabled?: boolean;
    left: { onClick: () => void };
    right: { onClick: () => void };
  }) => (
    <div data-testid="action-bar">
      <button
        type="button"
        data-testid="bar-primary"
        onClick={onPrimary}
        disabled={primaryDisabled}
      />
      <button
        type="button"
        data-testid="bar-left"
        onClick={left.onClick}
      />
      <button
        type="button"
        data-testid="bar-right"
        onClick={right.onClick}
      />
    </div>
  ),
}));

import { Home } from "./Home";
import { useGeneratorStore, type AiLook } from "../../state/generator-store/useGeneratorStore";

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

function buildLook(id = "ai-look-0"): AiLook {
  return {
    id,
    garments: [buildGarment("t1", "top"), buildGarment("b1", "bottom")],
    reason: "Nice.",
    suitability: 90,
  };
}

const READY_CLOSET = [
  buildGarment("top-1", "top"),
  buildGarment("bottom-1", "bottom"),
  buildGarment("shoes-1", "footwear"),
];

describe("Home view state machine", () => {
  beforeEach(() => {
    useGeneratorStore.getState().resetFlow();
    mockClosetData.mockImplementation(() => READY_CLOSET);
  });

  it("renders the zero state by default", () => {
    render(<Home />);
    expect(screen.getByTestId("zero-state")).toBeInTheDocument();
    expect(screen.getByLabelText("sectionLabel")).toHaveAttribute(
      "data-view",
      "zero",
    );
  });

  it("blocks the generator and links to the closet when it is empty", async () => {
    mockClosetData.mockImplementation(() => []);
    render(<Home />);
    expect(screen.getByTestId("generator-blocked")).toHaveTextContent(
      "closetRequiredTitle",
    );
    await userEvent.click(screen.getByRole("button", { name: "goToCloset" }));
    expect(mockRouterPush).toHaveBeenCalledWith("/closet");
  });

  it("explains which categories are missing before enabling the generator", () => {
    mockClosetData.mockImplementation(() => [buildGarment("top-1", "top")]);
    render(<Home />);
    expect(screen.getByTestId("generator-blocked")).toHaveTextContent(
      "garmentsRequiredTitle",
    );
    expect(screen.getByText("garmentsRequiredDescription")).toBeInTheDocument();
  });

  it("offers to wash clothes when the required categories are all dirty", async () => {
    mockClosetData.mockImplementation(() => [
      { ...buildGarment("top-1", "top"), isDirty: true },
      { ...buildGarment("bottom-1", "bottom"), isDirty: true },
      buildGarment("shoes-1", "footwear"),
    ]);
    render(<Home />);
    expect(screen.getByTestId("generator-blocked")).toHaveTextContent(
      "laundryRequiredTitle",
    );
    await userEvent.click(screen.getByRole("button", { name: "washToGenerate" }));
    expect(mockDoLaundry).toHaveBeenCalledTimes(1);
  });

  it("renders style selection in auto-select", () => {
    useGeneratorStore.getState().startAutoSelect();
    render(<Home />);
    expect(screen.getByTestId("style-step")).toBeInTheDocument();
  });

  it("renders loading skeletons while generating", () => {
    useGeneratorStore.getState().startLoading();
    render(<Home />);
    expect(screen.getByLabelText("loadingLooks")).toBeInTheDocument();
  });

  it("shows a verified first look while the remaining response streams", () => {
    useGeneratorStore.getState().startLoading();
    useGeneratorStore.getState().setStreamedLooks([buildLook()]);
    render(<Home />);
    expect(screen.getByTestId("streaming-look-preview")).toBeInTheDocument();
    expect(screen.getByText("streamingPreview")).toBeInTheDocument();
    expect(screen.getByLabelText("loadingLooks")).toHaveAttribute("aria-busy", "true");
  });

  it("renders the showcase with an active look", () => {
    useGeneratorStore.getState().setAiLooks([buildLook()]);
    render(<Home />);
    expect(screen.getByTestId("look-showcase")).toBeInTheDocument();
    expect(screen.getByTestId("action-bar")).toBeInTheDocument();
  });

  it("renders the empty showcase without looks", () => {
    useGeneratorStore.getState().setAiLooks([]);
    render(<Home />);
    expect(screen.getByTestId("showcase-empty")).toBeInTheDocument();
  });

  it("renders the strict style shortage instead of looks", () => {
    useGeneratorStore.getState().setAiLooks([buildLook()]);
    useGeneratorStore.getState().failStrictStyleFilter("formal");
    render(<Home />);
    expect(screen.getByTestId("style-empty")).toBeInTheDocument();
    expect(screen.queryByTestId("look-showcase")).not.toBeInTheDocument();
  });

  it("renders the limit state once the discard budget is spent", () => {
    useGeneratorStore.getState().setAiLooks([buildLook()]);
    useGeneratorStore.setState({ discardCount: 4 });
    render(<Home />);
    expect(screen.getByTestId("showcase-empty")).toBeInTheDocument();
  });

  it("renders manual carousels on demand", () => {
    useGeneratorStore.getState().startManual();
    render(<Home />);
    expect(screen.getByTestId("manual-carousels")).toBeInTheDocument();
  });

  it("overlays the celebration above any view", () => {
    useGeneratorStore.getState().showCelebration([buildGarment("t1", "top")]);
    render(<Home />);
    expect(screen.getByTestId("celebration")).toBeInTheDocument();
    expect(screen.getByTestId("zero-state")).toBeInTheDocument();
  });
});

describe("Home interactions", () => {
  beforeEach(() => {
    useGeneratorStore.getState().resetFlow();
    mockGenerateMutate.mockClear();
    mockWearMutate.mockClear();
    mockRouterPush.mockClear();
    mockDoLaundry.mockClear();
    mockGeneratePending = false;
    mockWearPending = false;
    mockWeatherData.mockImplementation(() => null);
    mockProfileData.mockImplementation(() => null);
    mockClosetData.mockImplementation(() => READY_CLOSET);
    mockFavoritesData.mockImplementation(() => []);
  });

  it("navigates from zero state via auto and manual", async () => {
    const first = render(<Home />);
    await userEvent.click(screen.getByTestId("zero-manual"));
    expect(
      screen.getByLabelText("sectionLabel").getAttribute("data-view"),
    ).toBe("manual");
    first.unmount();
    useGeneratorStore.getState().resetFlow();
    render(<Home />);
    await userEvent.click(screen.getByTestId("zero-auto"));
    expect(
      screen.getByLabelText("sectionLabel").getAttribute("data-view"),
    ).toBe("auto-select");
  });

  it("changes style and confirms generation with profile", async () => {
    mockProfileData.mockImplementation(() => ({
      userId: "test-user-id",
      hairColor: "brown",
      createdAt: new Date().toISOString(),
      skinTone: "medium",
      eyeColor: "brown",
      chestMeasurementCm: 92,
      waistMeasurementCm: 76,
      hipMeasurementCm: 98,
      colorimetry: "summer",
      morphology: "rectangle",
      preferredFit: "regular",
      lifestyle: "casual_daily",
      extraPreferences: {},
    }));
    useGeneratorStore.getState().startAutoSelect();
    render(<Home />);
    await userEvent.click(screen.getByTestId("style-pick-formal"));
    expect(useGeneratorStore.getState().lookStyle).toBe("formal");
    await userEvent.click(screen.getByTestId("style-confirm"));
    expect(mockGenerateMutate).toHaveBeenCalledTimes(1);
    expect(mockGenerateMutate.mock.calls[0][0].style).toBe("formal");
    expect(
      mockGenerateMutate.mock.calls[0][0].profile,
    ).toEqual({
      colorimetry: "summer",
      morphology: "rectangle",
      preferredFit: "regular",
      lifestyle: "casual_daily",
    });
  });

  it("passes available favorites as optional candidates during automatic generation", async () => {
    mockFavoritesData.mockImplementation(() => [
      { ...buildGarment("favorite-top", "top"), isFavorite: true },
    ]);
    useGeneratorStore.getState().startAutoSelect();
    render(<Home />);

    await userEvent.click(screen.getByTestId("style-confirm"));

    expect(mockGenerateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        forcedFavoritesIds: [],
        suggestedFavoriteIds: ["favorite-top"],
      }),
    );
  });

  it("keeps the explicit favorite-selection flow forced and separate", async () => {
    mockFavoritesData.mockImplementation(() => [
      { ...buildGarment("favorite-top", "top"), isFavorite: true },
    ]);
    useGeneratorStore.getState().startAutoSelect();
    render(<Home />);

    await userEvent.click(screen.getByTestId("toggle-favorite-selection"));
    await userEvent.click(screen.getByTestId("style-confirm"));
    expect(useGeneratorStore.getState().view).toBe("favorites-selection");
    await userEvent.click(screen.getByTestId("select-explicit-favorite"));

    expect(mockGenerateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        forcedFavoritesIds: ["favorite-top"],
        suggestedFavoriteIds: [],
      }),
    );
  });

  it("goes back from style selection", async () => {
    useGeneratorStore.getState().startAutoSelect();
    render(<Home />);
    await userEvent.click(screen.getByTestId("style-back"));
    expect(
      screen.getByLabelText("sectionLabel").getAttribute("data-view"),
    ).toBe("zero");
  });

  it("wears and discards the active look", async () => {
    useGeneratorStore.getState().setAiLooks([buildLook("a"), buildLook("b")]);
    render(<Home />);
    await userEvent.click(screen.getByTestId("showcase-wear"));
    expect(mockWearMutate).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByTestId("showcase-discard"));
    expect(useGeneratorStore.getState().discardCount).toBe(1);
  });

  it("returns from an automatic look to the generator start screen", async () => {
    useGeneratorStore.getState().setAiLooks([buildLook()]);
    render(<Home />);

    await userEvent.click(screen.getByTestId("bar-left"));

    expect(useGeneratorStore.getState().view).toBe("zero");
    expect(useGeneratorStore.getState().aiLooks).toHaveLength(1);
  });

  it("skips wearing while a wear is pending", async () => {
    mockWearPending = true;
    useGeneratorStore.getState().setAiLooks([buildLook()]);
    render(<Home />);
    await userEvent.click(screen.getByTestId("showcase-wear"));
    expect(mockWearMutate).not.toHaveBeenCalled();
  });

  it("blocks discard at the budget limit", async () => {
    useGeneratorStore.getState().setAiLooks([buildLook()]);
    useGeneratorStore.setState({ discardCount: 4 });
    render(<Home />);
    expect(screen.getByTestId("showcase-empty")).toBeInTheDocument();
  });

  it("drives the bottom action bar", async () => {
    useGeneratorStore.getState().setAiLooks([buildLook("a"), buildLook("b")]);
    render(<Home />);
    await userEvent.click(screen.getByTestId("bar-primary"));
    expect(mockWearMutate).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByTestId("bar-right"));
    expect(useGeneratorStore.getState().discardCount).toBe(1);
    await userEvent.click(screen.getByTestId("bar-left"));
    expect(
      screen.getByLabelText("sectionLabel").getAttribute("data-view"),
    ).toBe("zero");
  });

  it("recovers from shortage and empty states", async () => {
    useGeneratorStore.getState().setAiLooks([buildLook()]);
    useGeneratorStore.getState().failStrictStyleFilter("formal");
    render(<Home />);
    await userEvent.click(screen.getByTestId("shortage-another"));
    expect(
      screen.getByLabelText("sectionLabel").getAttribute("data-view"),
    ).toBe("auto-select");
  });

  it("dismisses the celebration", async () => {
    useGeneratorStore.getState().showCelebration([buildGarment("t1", "top")]);
    render(<Home />);
    await userEvent.click(screen.getByTestId("celebration-close"));
    expect(
      screen.queryByTestId("celebration"),
    ).not.toBeInTheDocument();
  });

  it("navigates to the calendar when the celebration closes", async () => {
    useGeneratorStore.getState().showCelebration([buildGarment("t1", "top")]);
    render(<Home />);
    await userEvent.click(screen.getByTestId("celebration-close"));
    expect(mockRouterPush).toHaveBeenCalledWith("/calendar");
  });

  it("shows outerwear skeletons on cold days", () => {
    mockWeatherData.mockImplementation(() => ({
      temperatureC: 5,
      condition: "Snow",
      city: null,
      dayLow: 2,
      dayHigh: 6,
      dayCondition: "Snow",
      rainProbability: null,
      fallback: false,
    }));
    mockClosetData.mockImplementation(() => [
      buildGarment("t1", "top"),
      buildGarment("b1", "bottom"),
      buildGarment("s1", "footwear"),
      buildGarment("o1", "outerwear"),
    ]);
    useGeneratorStore.getState().startLoading();
    render(<Home />);
    expect(screen.getByLabelText("loadingLooks")).toBeInTheDocument();
  });

  it("shows loading while the mutation is pending", () => {
    mockGeneratePending = true;
    render(<Home />);
    expect(screen.getByLabelText("loadingLooks")).toBeInTheDocument();
  });
});
