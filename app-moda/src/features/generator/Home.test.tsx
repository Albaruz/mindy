import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Garment } from "@/types/garment";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "en",
}));

vi.mock("next/dynamic", () => ({
  default: (
    _loader: unknown,
    options?: { loading?: () => React.ReactNode },
  ) =>
    () => (
      <>
        <div data-testid="manual-carousels" />
        {options?.loading?.()}
      </>
    ),
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

vi.mock("@/features/closet/useClosetQuery", () => ({
  useClosetQuery: () => ({ data: mockClosetData() }),
}));

vi.mock("@/features/profile/useProfileQuery", () => ({
  useProfileQuery: () => ({ data: mockProfileData() }),
}));

vi.mock("./useWeatherQuery", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./useWeatherQuery")>();
  return { ...actual, useWeatherQuery: () => ({ data: mockWeatherData() }) };
});

const {
  mockGenerateMutate,
  mockWearMutate,
  mockWeatherData,
  mockProfileData,
  mockClosetData,
} = vi.hoisted(() => ({
  mockGenerateMutate: vi.fn(),
  mockWearMutate: vi.fn(),
  mockWeatherData: vi.fn(() => null),
  mockProfileData: vi.fn(() => null),
  mockClosetData: vi.fn(() => []),
}));

let mockGeneratePending = false;
let mockWearPending = false;

vi.mock("./useGenerateLooks", () => ({
  useGenerateLooks: () => ({
    get isPending() {
      return mockGeneratePending;
    },
    mutate: mockGenerateMutate,
  }),
}));

vi.mock("./useWearToday", () => ({
  useWearToday: () => ({
    get isPending() {
      return mockWearPending;
    },
    mutate: mockWearMutate,
  }),
}));

vi.mock("./ZeroState", () => ({
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

vi.mock("./StyleStep", () => ({
  StyleStep: ({
    value,
    isPending,
    onChange,
    onConfirm,
    onBack,
  }: {
    value: string;
    isPending: boolean;
    onChange: (style: "casual" | "formal") => void;
    onConfirm: () => void;
    onBack: () => void;
  }) => (
    <div data-testid="style-step" data-value={value} data-pending={isPending}>
      <button
        type="button"
        data-testid="style-pick-formal"
        onClick={() => onChange("formal")}
      />
      <button type="button" data-testid="style-confirm" onClick={onConfirm} />
      <button type="button" data-testid="style-back" onClick={onBack} />
    </div>
  ),
}));

vi.mock("./LookShowcase", () => ({
  LookShowcase: ({
    onWear,
    onDiscard,
    onEditManual,
  }: {
    onWear: () => void;
    onDiscard: () => void;
    onEditManual: () => void;
  }) => (
    <div data-testid="look-showcase">
      <button type="button" data-testid="showcase-wear" onClick={onWear} />
      <button
        type="button"
        data-testid="showcase-discard"
        onClick={onDiscard}
      />
      <button
        type="button"
        data-testid="showcase-edit"
        onClick={onEditManual}
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

vi.mock("./InsufficientStyleEmpty", () => ({
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

vi.mock("./OutfitCelebrationScreen", () => ({
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
import { useGeneratorStore, type AiLook } from "./useGeneratorStore";

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

describe("Home view state machine", () => {
  beforeEach(() => {
    useGeneratorStore.getState().resetFlow();
  });

  it("renders the zero state by default", () => {
    render(<Home />);
    expect(screen.getByTestId("zero-state")).toBeInTheDocument();
    expect(screen.getByLabelText("sectionLabel")).toHaveAttribute(
      "data-view",
      "zero",
    );
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
    mockGeneratePending = false;
    mockWearPending = false;
    mockWeatherData.mockImplementation(() => null);
    mockProfileData.mockImplementation(() => null);
    mockClosetData.mockImplementation(() => []);
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
      colorimetry: "summer",
      morphology: "rectangle",
      preferredFit: "regular",
      lifestyle: "casual_daily",
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

  it("goes back from style selection", async () => {
    useGeneratorStore.getState().startAutoSelect();
    render(<Home />);
    await userEvent.click(screen.getByTestId("style-back"));
    expect(
      screen.getByLabelText("sectionLabel").getAttribute("data-view"),
    ).toBe("zero");
  });

  it("wears, discards and edits the active look", async () => {
    useGeneratorStore.getState().setAiLooks([buildLook("a"), buildLook("b")]);
    render(<Home />);
    await userEvent.click(screen.getByTestId("showcase-wear"));
    expect(mockWearMutate).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByTestId("showcase-discard"));
    expect(useGeneratorStore.getState().discardCount).toBe(1);
    await userEvent.click(screen.getByTestId("showcase-edit"));
    expect(
      screen.getByLabelText("sectionLabel").getAttribute("data-view"),
    ).toBe("manual");
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
      { ...buildGarment("t1", "top"), isDirty: true },
      { ...buildGarment("s1", "footwear"), isDirty: true },
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
