import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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

describe("ZeroState", () => {
  it("renders neutral greeting without weather", () => {
    render(
      <ZeroState weather={null} colorimetry={null} onAuto={() => {}} onManual={() => {}} />,
    );
    expect(screen.getByTestId("generator-zero-state")).toBeInTheDocument();
    expect(screen.getByText("greetingNeutral")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("renders rain greeting with icon", () => {
    render(
      <ZeroState
        weather={{
          temperatureC: 18,
          condition: "Rain",
          city: "Madrid",
          dayLow: 15,
          dayHigh: 20,
          dayCondition: "Rain",
          rainProbability: 80,
          fallback: false,
        }}
        colorimetry="summer"
        onAuto={() => {}}
        onManual={() => {}}
      />,
    );
    expect(screen.getByTestId("thread-icon")).toBeInTheDocument();
    expect(screen.getByRole("img")).toBeInTheDocument();
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
