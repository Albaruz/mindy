import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/Button/Button";
import { GREETING_MIN_DISPLAY_MS } from "@/constants/animations";
import type { Colorimetry } from "@/types/user";
import styles from "./ZeroState.module.scss";
import type { WeatherInfo } from "@/types/weather";
import { isRainExpected, isRainyCondition } from "./useWeatherQuery";
import {
  WeatherThreadIcon,
  resolveThreadKind,
  seasonAccent,
} from "./WeatherThreadIcon";

interface ZeroStateProps {
  weather: WeatherInfo | null | undefined;
  colorimetry: Colorimetry | null | undefined;
  onAuto: () => void;
  onManual: () => void;
}

// OpenWeather condition -> dictionary key for Generator.conditions.
const CONDITION_KEYS: Record<string, string> = {
  Clear: "clear",
  Clouds: "clouds",
  Rain: "rain",
  Drizzle: "drizzle",
  Thunderstorm: "storm",
  Snow: "snow",
  Mist: "fog",
  Fog: "fog",
  Haze: "fog",
};

// Dynamic greeting driven by the day forecast, not just the current
// moment: rain takes precedence, then the day's low (a cold evening
// counts even on a mild morning) and the day's high for heat.
function useWeatherMessage(
  weather: WeatherInfo | null | undefined,
): string {
  const t = useTranslations("Generator");
  if (weather === null || weather === undefined || weather.fallback) {
    return t("greetingNeutral");
  }
  const place = weather.city ? ` ${t("placePrefix")} ${weather.city}` : "";
  if (
    isRainyCondition(weather.condition) ||
    isRainyCondition(weather.dayCondition) ||
    isRainExpected(weather.rainProbability)
  ) {
    return isRainyCondition(weather.condition)
      ? t("greetingRaining", { place })
      : t("greetingRainExpected", { place });
  }
  const low = weather.dayLow ?? weather.temperatureC;
  if (low < 10) {
    return t("greetingCold", { place });
  }
  if (low < 18) {
    return t("greetingCool", { place });
  }
  const high = weather.dayHigh ?? weather.temperatureC;
  if (high >= 26) {
    return t("greetingHot", { place });
  }
  return t("greetingFair", { place });
}

// Home zero state: the animated single-thread weather icon stands alone
// (no info card). The greeting below already narrates the conditions, and
// the icon exposes the condition label to screen readers.
export function ZeroState({
  weather,
  colorimetry,
  onAuto,
  onManual,
}: ZeroStateProps) {
  const t = useTranslations("Generator");
  // The neutral hello owns the screen for a minimum display time: even a
  // fast forecast fetch never swaps the copy mid-read. Weather arriving
  // later than the window reveals immediately.
  const [minDisplayElapsed, setMinDisplayElapsed] = useState(false);
  useEffect(() => {
    const timer = setTimeout(
      () => setMinDisplayElapsed(true),
      GREETING_MIN_DISPLAY_MS,
    );
    return () => clearTimeout(timer);
  }, []);
  const weatherReady =
    weather !== null && weather !== undefined && !weather.fallback;
  // Narrowed once: non-null from here on, so the icon helpers below
  // typecheck without aliased-condition chains.
  const revealedWeather =
    weatherReady && minDisplayElapsed ? weather : null;
  const message = useWeatherMessage(revealedWeather);
  const showIcon = revealedWeather !== null;
  const conditionKey =
    revealedWeather !== null &&
    revealedWeather.condition !== null &&
    CONDITION_KEYS[revealedWeather.condition] !== undefined
      ? CONDITION_KEYS[revealedWeather.condition]
      : "other";

  return (
    <div className={styles["zero-state"]} data-testid="generator-zero-state">
      {/* The icon slot is always rendered so the weather icon fades in
      without shoving the greeting down when the forecast resolves. */}
      <div
        className={styles["zero-state__weather-icon"]}
        aria-hidden={!showIcon}
      >
        {revealedWeather !== null ? (
          <div
            role="img"
            aria-label={t(`conditions.${conditionKey}`)}
            key={conditionKey}
            className={styles["zero-state__weather-icon-art"]}
          >
            <WeatherThreadIcon
              kind={resolveThreadKind(revealedWeather)}
              accent={seasonAccent(colorimetry ?? null)}
            />
          </div>
        ) : null}
      </div>
      {/* The live region stays mounted so screen readers keep announcing;
      only the inner copy remounts (key) to replay the crossfade. */}
      <p aria-live="polite" className={styles["zero-state__greeting"]}>
        <span
          key={message}
          className={styles["zero-state__greeting-text"]}
        >
          {message}
        </span>
      </p>
      <div className={styles["zero-state__actions"]}>
        <Button type="button" onClick={onAuto}>
          {t("autoButton")}
        </Button>
        <Button type="button" variant="secondary" onClick={onManual}>
          {t("manualButton")}
        </Button>
      </div>
    </div>
  );
}
