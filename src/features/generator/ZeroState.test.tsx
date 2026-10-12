import { describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/components/Button/Button", () => ({
  Button: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock("./WeatherThreadIcon", () => ({
  WeatherThreadIcon: () => <span data-testid="thread-icon" />,
  resolveThreadKind: () => "sun",
  seasonAccent: () => "#000",
}));

vi.mock("./useWeatherQuery", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("./useWeatherQuery")>();
  return {
    ...actual,
    isRainyCondition: (condition: string | null) => condition === "Rain",
    isRainExpected: (probability: number | null) => (probability ?? 0) >= 50,
  };
});

import { ZeroState } from "./ZeroState";
import { GREETING_MIN_DISPLAY_MS } from "@/constants/animations";

const RAINY_WEATHER = {
  temperatureC: 18,
  condition: "Rain",
  city: "Madrid",
  dayLow: 15,
  dayHigh: 20,
  dayCondition: "Rain",
  rainProbability: 80,
  fallback: false,
} as const;

describe("ZeroState", () => {
  it("renders neutral greeting without weather", () => {
    render(
      <ZeroState weather={null} colorimetry={null} onAuto={() => {}} onManual={() => {}} />,
    );
    expect(screen.getByTestId("generator-zero-state")).toBeInTheDocument();
    expect(screen.getByText("greetingNeutral")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("holds the neutral greeting for the minimum display time", () => {
    vi.useFakeTimers();
    try {
      render(
        <ZeroState
          weather={{ ...RAINY_WEATHER }}
          colorimetry="summer"
          onAuto={() => {}}
          onManual={() => {}}
        />,
      );
      // Forecast ready but the hello still owns the screen.
      expect(screen.getByText("greetingNeutral")).toBeInTheDocument();
      expect(screen.queryByRole("img")).not.toBeInTheDocument();
      act(() => {
        vi.advanceTimersByTime(GREETING_MIN_DISPLAY_MS);
      });
      expect(screen.getByTestId("thread-icon")).toBeInTheDocument();
      expect(screen.getByRole("img")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("swaps the neutral greeting for the weather copy when the forecast resolves", () => {
    vi.useFakeTimers();
    try {
      const { rerender } = render(
        <ZeroState weather={null} colorimetry={null} onAuto={() => {}} onManual={() => {}} />,
      );
      expect(screen.getByText("greetingNeutral")).toBeInTheDocument();
      rerender(
        <ZeroState
          weather={{ ...RAINY_WEATHER }}
          colorimetry="summer"
          onAuto={() => {}}
          onManual={() => {}}
        />,
      );
      // Fast fetch: still the neutral greeting until the window elapses.
      expect(screen.getByText("greetingNeutral")).toBeInTheDocument();
      expect(screen.queryByRole("img")).not.toBeInTheDocument();
      act(() => {
        vi.advanceTimersByTime(GREETING_MIN_DISPLAY_MS);
      });
      expect(screen.queryByText("greetingNeutral")).not.toBeInTheDocument();
      expect(screen.getByRole("img")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("calls auto and manual handlers", async () => {
    const onAuto = vi.fn();
    const onManual = vi.fn();
    render(
      <ZeroState
        weather={null}
        colorimetry={null}
        onAuto={onAuto}
        onManual={onManual}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "autoButton" }));
    await userEvent.click(
      screen.getByRole("button", { name: "manualButton" }),
    );
    expect(onAuto).toHaveBeenCalledTimes(1);
    expect(onManual).toHaveBeenCalledTimes(1);
  });
});
