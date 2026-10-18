import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Thermometer } from "lucide-react";
import { Button } from "@/components/Button/Button";
import { GREETING_MIN_DISPLAY_MS } from "@/constants/animations";
import { DEFAULT_TEMPERATURE_C } from "@/constants/weather";
import { OUTFIT_DAY_VALUES } from "@/constants/generator";
import { OptionPills } from "@/components/OptionPills/OptionPills";
import type { Colorimetry } from "@/types/user";
import { cn } from "@/lib/utils";
import styles from "./ZeroState.module.scss";
import type { WeatherInfo } from "@/types/weather";
import type { WeatherDaySummary } from "@/types/weather";
import {
  isRainExpected,
  isRainyCondition,
} from "./useWeatherQuery";
import type { OutfitDay } from "./useGeneratorStore";
import {
  WeatherThreadIcon,
  resolveThreadKind,
  seasonAccent,
} from "./WeatherThreadIcon";

interface ZeroStateProps {
  weather: WeatherInfo | null | undefined;
  colorimetry: Colorimetry | null | undefined;
  outfitDay: OutfitDay;
  onOutfitDayChange: (day: OutfitDay) => void;
  onAuto: () => void;
  onManual: () => void;
}

function getSelectedWeather(
  weather: WeatherInfo | null | undefined,
  day: OutfitDay,
): WeatherDaySummary | null {
  if (weather === null || weather === undefined || weather.fallback) {
    return null;
  }
  if (day === "tomorrow") {
    return weather.tomorrow ?? null;
  }
  return weather.today ?? {
    temperatureC: weather.temperatureC,
    condition: weather.condition,
    dayLow: weather.dayLow,
    dayHigh: weather.dayHigh,
    dayCondition: weather.dayCondition,
    rainProbability: weather.rainProbability,
  };
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
  weather: WeatherDaySummary | null | undefined,
  city: string | null | undefined,
): string {
  const t = useTranslations("Generator");
  if (weather === null || weather === undefined) {
    return t("greetingNeutral");
  }
  const place = city ? ` ${t("placePrefix")} ${city}` : "";
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
  outfitDay = "today",
  onOutfitDayChange = () => undefined,
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
  const selectedWeather = getSelectedWeather(weather, outfitDay);
  const tomorrowAvailable =
    weatherReady && weather.tomorrow !== undefined && weather.tomorrow !== null;
  // Narrowed once: non-null from here on, so the icon helpers below
  // typecheck without aliased-condition chains.
  const revealedWeather =
    weatherReady && selectedWeather !== null && minDisplayElapsed
      ? { ...weather, ...selectedWeather }
      : null;
  const message = useWeatherMessage(
    revealedWeather,
    weather?.city,
  );
  const showIcon = revealedWeather !== null;
  const conditionKey =
    revealedWeather !== null &&
    (revealedWeather.condition ?? revealedWeather.dayCondition) !== null &&
    CONDITION_KEYS[revealedWeather.condition ?? revealedWeather.dayCondition ?? ""] !== undefined
      ? CONDITION_KEYS[revealedWeather.condition ?? revealedWeather.dayCondition ?? ""]
      : "other";

  const formatDayOption = (day: OutfitDay) => {
    return t(day === "today" ? "today" : "tomorrow");
  };

  const formatTemperature = (day: OutfitDay) => {
    const dayWeather = getSelectedWeather(weather, day);
    if (dayWeather === null) {
      return weather?.fallback && day === "today"
        ? `${DEFAULT_TEMPERATURE_C}°`
        : t("temperatureUnavailable");
    }
    if (dayWeather.dayLow !== null && dayWeather.dayHigh !== null) {
      return `${dayWeather.dayLow}°–${dayWeather.dayHigh}°`;
    }
    return `${dayWeather.temperatureC}°`;
  };

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
      <div
        className={styles["zero-state__temperatures"]}
        role="status"
        aria-label={formatTemperature(outfitDay)}
      >
        <div
          className={cn(
            styles["zero-state__temperature"],
            styles["zero-state__temperature--selected"],
            outfitDay === "tomorrow" &&
              !tomorrowAvailable &&
              styles["zero-state__temperature--unavailable"],
          )}
        >
          <Thermometer
            aria-hidden="true"
            className={styles["zero-state__temperature-icon"]}
            size={28}
          />
          <strong className={styles["zero-state__temperature-value"]}>
            {formatTemperature(outfitDay)}
          </strong>
        </div>
      </div>
      {weather?.fallback ? (
        <p className={styles["zero-state__forecast-note"]} role="status">
          {t("weatherFallbackNote")}
        </p>
      ) : null}
      <OptionPills
        name="generator-outfit-day"
        label={t("daySelectorLabel")}
        options={OUTFIT_DAY_VALUES}
        value={outfitDay}
        onSelect={onOutfitDayChange}
        formatOption={formatDayOption}
        disabledOptions={tomorrowAvailable ? [] : ["tomorrow"]}
        alignment="center"
      />
      {!tomorrowAvailable ? (
        <p className={styles["zero-state__forecast-note"]}>
          {t("forecastUnavailable")}
        </p>
      ) : null}
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
