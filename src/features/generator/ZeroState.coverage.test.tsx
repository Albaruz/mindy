import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { ZeroState } from "./ZeroState";

const { mockSeasonAccent, mockIsRainExpected, mockIsRainyCondition } = vi.hoisted(() => ({
  mockSeasonAccent: vi.fn(),
  mockIsRainExpected: vi.fn(),
  mockIsRainyCondition: vi.fn((cond: string) => ["Rain", "Drizzle", "Thunderstorm"].includes(cond)),
}));

vi.mock("next-intl", () => ({
  useTranslations: (ns: string) => {
    if (ns === "Generator") {
      return (key: string, opts?: Record<string, unknown>) => {
        if (key === "placePrefix") return "in";
        if (key === "autoButton") return "Auto";
        if (key === "manualButton") return "Manual";
        const place = opts?.place ? ` ${opts.place}` : "";
        return `t.${key}${place}`;
      };
    }
    return (key: string) => `t.${key}`;
  },
  useLocale: () => "en",
}));

vi.mock("framer-motion", async (importOriginal) => {
  const actual = await importOriginal<typeof import("framer-motion")>();
  return {
    ...actual,
    MotionConfig: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: {
      path: ({ ...props }: React.SVGProps<SVGPathElement>) => <path {...props} />,
      g: ({ children, ...props }: React.SVGProps<SVGGElement>) => <g {...props}>{children}</g>,
      line: ({ ...props }: React.SVGProps<SVGLineElement>) => <line {...props} />,
    },
    useReducedMotion: () => false,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

vi.mock("@/features/generator/WeatherThreadIcon", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/generator/WeatherThreadIcon")>();
  return {
    ...actual,
    WeatherThreadIcon: ({ kind }: { kind: string }) => <div data-testid={`icon-${kind}`} />,
    seasonAccent: mockSeasonAccent,
    resolveThreadKind: actual.resolveThreadKind,
  };
});

vi.mock("@/constants/animations", () => ({
  GREETING_MIN_DISPLAY_MS: 500,
}));

vi.mock("./useWeatherQuery", () => ({
  isRainExpected: mockIsRainExpected,
  isRainyCondition: mockIsRainyCondition,
}));

function renderZeroState(props: {
  weather?: { condition?: string; dayCondition?: string; dayLow?: number; dayHigh?: number; temperatureC?: number; rainProbability?: number | null; city?: string | null; fallback?: boolean } | null;
  colorimetry?: string | null;
  onAuto?: () => void;
  onManual?: () => void;
} = {}) {
  return render(
    <ZeroState
      weather={props.weather ?? null}
      colorimetry={props.colorimetry ?? null}
      onAuto={props.onAuto ?? vi.fn()}
      onManual={props.onManual ?? vi.fn()}
    />
  );
}

function advanceTimers(ms = 600) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

describe("ZeroState branches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockIsRainExpected.mockReturnValue(false);
    mockIsRainyCondition.mockImplementation((cond: string) => ["Rain", "Drizzle", "Thunderstorm"].includes(cond));
    mockSeasonAccent.mockReturnValue("#c87966");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows neutral greeting when weather is null", () => {
    renderZeroState({ weather: null });
    expect(screen.getByText("t.greetingNeutral")).toBeInTheDocument();
    expect(screen.queryByTestId("icon-cloud")).not.toBeInTheDocument();
  });

  it("shows neutral greeting when weather is undefined", () => {
    renderZeroState({ weather: undefined });
    expect(screen.getByText("t.greetingNeutral")).toBeInTheDocument();
  });

  it("shows neutral greeting when weather.fallback is true", () => {
    renderZeroState({ weather: { condition: "Clear", fallback: true } });
    expect(screen.getByText("t.greetingNeutral")).toBeInTheDocument();
    expect(screen.getByText("t.weatherFallbackNote")).toBeInTheDocument();
  });

  it("shows raining greeting when current condition is Rain", () => {
    renderZeroState({ weather: { condition: "Rain", temperatureC: 15, dayLow: 10, dayHigh: 20 } });
    advanceTimers();
    expect(screen.getByText("t.greetingRaining")).toBeInTheDocument();
    expect(screen.getByTestId("icon-umbrella")).toBeInTheDocument();
  });

  it("shows rain expected greeting when dayCondition is Rain (condition is not Rain)", () => {
    renderZeroState({ weather: { condition: "Clouds", dayCondition: "Rain", temperatureC: 15, dayLow: 10, dayHigh: 20 } });
    advanceTimers();
    expect(screen.getByText("t.greetingRainExpected")).toBeInTheDocument();
    expect(screen.getByTestId("icon-umbrella")).toBeInTheDocument();
  });

  it("shows rain expected greeting when rainProbability is high", () => {
    mockIsRainExpected.mockReturnValue(true);
    renderZeroState({ weather: { condition: "Clouds", rainProbability: 70, temperatureC: 15, dayLow: 10, dayHigh: 20 } });
    advanceTimers();
    expect(screen.getByText("t.greetingRainExpected")).toBeInTheDocument();
    expect(screen.getByTestId("icon-umbrella")).toBeInTheDocument();
  });

  it("shows cold greeting when dayLow is below 10", () => {
    renderZeroState({ weather: { condition: "Clear", dayLow: 5, temperatureC: 8, dayHigh: 15 } });
    advanceTimers();
    expect(screen.getByText("t.greetingCold")).toBeInTheDocument();
    expect(screen.getByTestId("icon-sun")).toBeInTheDocument();
  });

  it("shows cool greeting when dayLow is between 10 and 18", () => {
    renderZeroState({ weather: { condition: "Clouds", dayLow: 12, temperatureC: 14, dayHigh: 20 } });
    advanceTimers();
    expect(screen.getByText("t.greetingCool")).toBeInTheDocument();
    expect(screen.getByTestId("icon-cloud")).toBeInTheDocument();
  });

  it("shows hot greeting when dayHigh is 26 or above", () => {
    renderZeroState({ weather: { condition: "Clear", dayHigh: 30, temperatureC: 25, dayLow: 18 } });
    advanceTimers();
    expect(screen.getByText("t.greetingHot")).toBeInTheDocument();
    expect(screen.getByTestId("icon-sun")).toBeInTheDocument();
  });

  it("shows fair greeting for mild temperatures (dayLow >= 18)", () => {
    renderZeroState({ weather: { condition: "Clear", dayLow: 18, dayHigh: 22, temperatureC: 19 } });
    advanceTimers();
    expect(screen.getByText("t.greetingFair")).toBeInTheDocument();
    expect(screen.getByTestId("icon-sun")).toBeInTheDocument();
  });

  it("includes city in greeting when city is provided", () => {
    renderZeroState({ weather: { condition: "Clear", dayLow: 18, dayHigh: 22, temperatureC: 19, city: "Madrid" } });
    advanceTimers();
    expect(screen.getByText("t.greetingFair in Madrid")).toBeInTheDocument();
  });

  it("falls back to 'other' conditionKey when condition is unknown", () => {
    renderZeroState({ weather: { condition: "Mystery", temperatureC: 15, dayLow: 10, dayHigh: 20 } });
    advanceTimers();
    expect(screen.getByTestId("icon-cloud")).toBeInTheDocument();
  });

  it("shows icon only after min display elapsed and weather ready", () => {
    renderZeroState({ weather: { condition: "Clear", temperatureC: 15, dayLow: 10, dayHigh: 20 } });
    expect(screen.queryByTestId("icon-sun")).not.toBeInTheDocument();
    advanceTimers();
    expect(screen.getByTestId("icon-sun")).toBeInTheDocument();
  });

  it("shows icon after min display elapsed on remount with weather", () => {
    const { unmount } = renderZeroState({ weather: { condition: "Clear", temperatureC: 15, dayLow: 10, dayHigh: 20 } });
    advanceTimers();
    unmount();
    renderZeroState({ weather: { condition: "Clear", temperatureC: 15, dayLow: 10, dayHigh: 20 } });
    expect(screen.queryByTestId("icon-sun")).not.toBeInTheDocument();
    advanceTimers();
    expect(screen.getByTestId("icon-sun")).toBeInTheDocument();
  });

  it("uses DEFAULT_ACCENT when colorimetry is null", () => {
    renderZeroState({ weather: { condition: "Clear", temperatureC: 15, dayLow: 10, dayHigh: 20 }, colorimetry: null });
    advanceTimers();
    expect(mockSeasonAccent).toHaveBeenCalledWith(null);
  });

  it("uses DEFAULT_ACCENT when colorimetry is undefined (component normalizes to null)", () => {
    renderZeroState({ weather: { condition: "Clear", temperatureC: 15, dayLow: 10, dayHigh: 20 }, colorimetry: undefined });
    advanceTimers();
    expect(mockSeasonAccent).toHaveBeenCalledWith(null);
  });

  it("uses season accent when colorimetry is valid", () => {
    renderZeroState({ weather: { condition: "Clear", temperatureC: 15, dayLow: 10, dayHigh: 20 }, colorimetry: "autumn" });
    advanceTimers();
    expect(mockSeasonAccent).toHaveBeenCalledWith("autumn");
  });

  it("renders both action buttons", () => {
    const onAuto = vi.fn();
    const onManual = vi.fn();
    renderZeroState({ weather: { condition: "Clear", temperatureC: 15, dayLow: 10, dayHigh: 20 }, onAuto, onManual });
    expect(screen.getByRole("button", { name: "Auto" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Manual" })).toBeInTheDocument();
  });

  it("calls onAuto when Auto button clicked", () => {
    const onAuto = vi.fn();
    renderZeroState({ weather: { condition: "Clear", temperatureC: 15, dayLow: 10, dayHigh: 20 }, onAuto });
    screen.getByRole("button", { name: "Auto" }).click();
    expect(onAuto).toHaveBeenCalledTimes(1);
  });

  it("calls onManual when Manual button clicked", () => {
    const onManual = vi.fn();
    renderZeroState({ weather: { condition: "Clear", temperatureC: 15, dayLow: 10, dayHigh: 20 }, onManual });
    screen.getByRole("button", { name: "Manual" }).click();
    expect(onManual).toHaveBeenCalledTimes(1);
  });

  it("uses condition from dayCondition when condition is null", () => {
    renderZeroState({ weather: { condition: null, dayCondition: "Snow", temperatureC: 0, dayLow: -5, dayHigh: 5 } });
    advanceTimers();
    expect(screen.getByText("t.greetingCold")).toBeInTheDocument();
    expect(screen.getByTestId("icon-snow")).toBeInTheDocument();
  });

  it("handles Drizzle condition as rain", () => {
    renderZeroState({ weather: { condition: "Drizzle", temperatureC: 12, dayLow: 10, dayHigh: 15 } });
    advanceTimers();
    expect(screen.getByText("t.greetingRaining")).toBeInTheDocument();
    expect(screen.getByTestId("icon-umbrella")).toBeInTheDocument();
  });

  it("handles Thunderstorm condition as rain", () => {
    renderZeroState({ weather: { condition: "Thunderstorm", temperatureC: 12, dayLow: 10, dayHigh: 15 } });
    advanceTimers();
    expect(screen.getByText("t.greetingRaining")).toBeInTheDocument();
    expect(screen.getByTestId("icon-umbrella")).toBeInTheDocument();
  });

  it("handles Snow condition", () => {
    renderZeroState({ weather: { condition: "Snow", temperatureC: 0, dayLow: -5, dayHigh: 2 } });
    advanceTimers();
    expect(screen.getByText("t.greetingCold")).toBeInTheDocument();
    expect(screen.getByTestId("icon-snow")).toBeInTheDocument();
  });

  it("handles Mist condition as fog -> other -> cloud", () => {
    renderZeroState({ weather: { condition: "Mist", temperatureC: 12, dayLow: 10, dayHigh: 15 } });
    advanceTimers();
    expect(screen.getByTestId("icon-cloud")).toBeInTheDocument();
  });

  it("handles Haze condition as fog -> other -> cloud", () => {
    renderZeroState({ weather: { condition: "Haze", temperatureC: 12, dayLow: 10, dayHigh: 15 } });
    advanceTimers();
    expect(screen.getByTestId("icon-cloud")).toBeInTheDocument();
  });

  it("holds the neutral greeting until the minimum display elapses with weather ready", () => {
    renderZeroState({
      weather: { condition: "Rain", temperatureC: 18, dayLow: 15, dayHigh: 20 },
      colorimetry: "summer",
    });
    // Forecast ready but the hello still owns the screen.
    expect(screen.getByText("t.greetingNeutral")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    advanceTimers();
    expect(screen.queryByText("t.greetingNeutral")).not.toBeInTheDocument();
    expect(screen.getByRole("img")).toBeInTheDocument();
  });

  it("swaps the neutral greeting for the weather copy when the forecast resolves", () => {
    const { rerender } = render(
      <ZeroState weather={null} colorimetry={null} onAuto={vi.fn()} onManual={vi.fn()} />,
    );
    expect(screen.getByText("t.greetingNeutral")).toBeInTheDocument();
    rerender(
      <ZeroState
        weather={{ condition: "Rain", temperatureC: 18, dayLow: 15, dayHigh: 20 }}
        colorimetry="summer"
        onAuto={vi.fn()}
        onManual={vi.fn()}
      />,
    );
    // Fast fetch: still the neutral greeting until the window elapses.
    expect(screen.getByText("t.greetingNeutral")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    advanceTimers();
    expect(screen.queryByText("t.greetingNeutral")).not.toBeInTheDocument();
    expect(screen.getByRole("img")).toBeInTheDocument();
  });
});
