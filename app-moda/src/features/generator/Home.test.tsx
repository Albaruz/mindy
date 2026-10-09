import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Garment } from "@/types/garment";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "en",
}));

vi.mock("next/dynamic", () => ({
  default: () => () => <div data-testid="manual-carousels" />,
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
  useClosetQuery: () => ({ data: [] }),
}));

vi.mock("@/features/profile/useProfileQuery", () => ({
  useProfileQuery: () => ({ data: null }),
}));

vi.mock("./useWeatherQuery", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./useWeatherQuery")>();
  return { ...actual, useWeatherQuery: () => ({ data: null }) };
});

vi.mock("./useGenerateLooks", () => ({
  useGenerateLooks: () => ({ isPending: false, mutate: vi.fn() }),
}));

vi.mock("./useWearToday", () => ({
  useWearToday: () => ({ isPending: false, mutate: vi.fn() }),
}));

vi.mock("./ZeroState", () => ({
  ZeroState: () => <div data-testid="zero-state" />,
}));

vi.mock("./StyleStep", () => ({
  StyleStep: () => <div data-testid="style-step" />,
}));

vi.mock("./LookShowcase", () => ({
  LookShowcase: () => <div data-testid="look-showcase" />,
  ShowcaseEmptyState: () => <div data-testid="showcase-empty" />,
}));

vi.mock("./InsufficientStyleEmpty", () => ({
  InsufficientStyleEmpty: () => <div data-testid="style-empty" />,
}));

vi.mock("./OutfitCelebrationScreen", () => ({
  OutfitCelebrationScreen: () => <div data-testid="celebration" />,
}));

vi.mock("@/components/BottomActionBar/BottomActionBar", () => ({
  BottomActionBar: () => <div data-testid="action-bar" />,
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

function buildLook(): AiLook {
  return {
    id: "ai-look-0",
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
