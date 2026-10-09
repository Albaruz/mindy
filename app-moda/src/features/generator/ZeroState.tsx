import { useTranslations } from "next-intl";
import { Button } from "@/components/Button/Button";
import type { Colorimetry } from "@/types/user";
import styles from "./ZeroState.module.scss";
import type { WeatherInfo } from "./useWeatherQuery";
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
  const message = useWeatherMessage(weather);
  const showIcon =
    weather !== null && weather !== undefined && !weather.fallback;
  const conditionKey =
    showIcon &&
    weather.condition !== null &&
    CONDITION_KEYS[weather.condition] !== undefined
      ? CONDITION_KEYS[weather.condition]
      : "other";

  return (
    <div className={styles.zeroState} data-testid="generator-zero-state">
      {showIcon ? (
        <div
          role="img"
          aria-label={t(`conditions.${conditionKey}`)}
          className={styles["zeroState__weatherIcon"]}
        >
          <WeatherThreadIcon
            kind={resolveThreadKind(weather)}
            accent={seasonAccent(colorimetry ?? null)}
          />
        </div>
      ) : null}
      <p aria-live="polite" className={styles["zeroState__greeting"]}>
        {message}
      </p>
      <div className={styles["zeroState__actions"]}>
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
