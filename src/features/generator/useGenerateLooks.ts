import { useMutation } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { getCurrentPosition } from "@/lib/geolocation";
import type { Category, Garment } from "@/types/garment";
import {
  useGeneratorStore,
  type AiLook,
  type LookStyle,
  type OutfitDay,
} from "./useGeneratorStore";
import {
  categorizeGarment,
  withoutHiddenBottom,
} from "@/lib/garment/categorizeGarments";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { MAX_LOOK_OPTIONS } from "@/constants/generator";
import { getSeasonalFallbackWeather } from "@/constants/weather";
import { buildWeatherUrl } from "@/constants/api";
import type { WeatherInfo } from "@/types/weather";
import {
  getWeatherForDay,
  parseWeatherPayload,
  useWeatherQuery,
} from "./useWeatherQuery";
import type { Mood, GenerateLooksInput, GenerateLooksResult } from "./generatorTypes";
import { buildCandidates } from "./generatorCandidates";
import {
  callRecommenderStream,
  buildRecommenderGarments,
  type RecommenderRequest,
} from "./generatorApi";
import { readRecommenderError, formatRecommenderError, validateRecommenderResponse } from "./generatorResponse";
import type { RecommenderResponse } from "./generatorApi";
import { ERROR_CODES } from "@/constants/errors";
import { AppError, isAppError } from "@/lib/errors";

export const LOOK_STYLE_TO_MOOD: Record<LookStyle, Mood> = {
  casual: "relaxed",
  formal: "professional",
  sport: "active",
  elegant: "elegant",
  streetwear: "relaxed",
  party: "elegant",
};

// Typed rejection for strict style filtering: the server answered 422
// because no buildable look exists in the requested style.
export class InsufficientStyleGarmentsError extends Error {
  readonly style: LookStyle;

  constructor(style: LookStyle) {
    super("INSUFFICIENT_STYLE_GARMENTS");
    this.name = "InsufficientStyleGarmentsError";
    this.style = style;
  }
}

type Climate = Pick<
  WeatherInfo,
  "temperatureC" | "condition" | "dayLow" | "dayHigh" | "rainProbability"
>;

function getDefaultClimate(): Climate {
  const fallback = getSeasonalFallbackWeather();
  return {
    temperatureC: fallback.temperatureC,
    condition: fallback.condition,
    dayLow: fallback.dayLow,
    dayHigh: fallback.dayHigh,
    rainProbability: fallback.rainProbability,
  };
}

// Auto generation must not wait for a fresh GPS fix. The page already owns a
// cached weather query; when it is still loading, the seasonal fallback keeps
// the primary action responsive and the server applies its normal safeguards.
export function resolveCachedClimate(
  weather: WeatherInfo | null | undefined,
  outfitDay: OutfitDay,
): Climate {
  const selectedWeather = getWeatherForDay(weather, outfitDay);
  if (selectedWeather === null) {
    return getDefaultClimate();
  }
  return {
    temperatureC: selectedWeather.temperatureC,
    condition: selectedWeather.condition,
    dayLow: selectedWeather.dayLow,
    dayHigh: selectedWeather.dayHigh,
    rainProbability: selectedWeather.rainProbability,
  };
}

// Shared with the manual "Combinar" flow (useCombineLocked): day-based
// climate resolved once per inference, defaulting to the Spanish seasonal
// average when location or the weather service is unavailable.
export async function resolveClimate(
  outfitDay: OutfitDay = useGeneratorStore.getState().outfitDay,
): Promise<Climate> {
  try {
    const position = await getCurrentPosition();
    const response = await fetch(
      buildWeatherUrl(position.coords.latitude, position.coords.longitude),
    );
    if (!response.ok) {
      return getDefaultClimate();
    }
    const weather = parseWeatherPayload(await response.json());
    const selectedWeather = getWeatherForDay(weather, outfitDay);
    if (selectedWeather === null) {
      return getDefaultClimate();
    }
    return {
      temperatureC: selectedWeather.temperatureC,
      condition: selectedWeather.condition,
      dayLow: selectedWeather.dayLow,
      dayHigh: selectedWeather.dayHigh,
      rainProbability: selectedWeather.rainProbability,
    };
  } catch {
    return getDefaultClimate();
  }
}

function resolveLook(
  ids: string[],
  byId: Map<string, Garment>,
  index: number,
  reason: string | null,
  suitability: number,
): AiLook | null {
  const garments: Garment[] = [];
  const seen = new Set<Category>();
  for (const id of ids) {
    const garment = byId.get(id);
    if (!garment) {
      continue;
    }
    const category = categorizeGarment(garment);
    if (category !== null && !seen.has(category)) {
      seen.add(category);
      garments.push(garment);
    }
  }
  if (garments.length === 0) {
    return null;
  }
  // Guard against model drift: a dress/mono option never carries a bottom.
  const sanitized = withoutHiddenBottom(garments);
  if (sanitized.length === 0) {
    return null;
  }
  return {
    id: `ai-look-${index}`,
    garments: sanitized,
    reason,
    suitability,
  };
}

// Multi-option generation: resolves every LLM option into an AiLook and
// pushes the array to the store, which flips the view to showcase.
export function useGenerateLooks() {
  const t = useTranslations("Notifications");
  const locale = useLocale();
  const { data: weather } = useWeatherQuery();
  return useMutation({
    mutationFn: async (input: GenerateLooksInput): Promise<GenerateLooksResult> => {
      const { dismissedIds, getLockedGarments } =
        useGeneratorStore.getState();
      const locked = getLockedGarments();
      const lockedIds = new Set(locked.map((g) => g.garmentId));
      const dismissed = new Set(dismissedIds);

      const forcedFavoriteIds = new Set(input.forcedFavoritesIds ?? []);
      const candidates = buildCandidates(
        input.garments,
        lockedIds,
        dismissed,
        forcedFavoriteIds,
      );
      if (candidates.length === 0) {
        throw new AppError(ERROR_CODES.NO_GARMENTS);
      }

      const climate = resolveCachedClimate(
        weather,
        useGeneratorStore.getState().outfitDay,
      );
      const apiGarments = buildRecommenderGarments(candidates);
      const request: RecommenderRequest = {
        garments: apiGarments,
        temperatureC: climate.temperatureC,
        condition: climate.condition,
        dayLow: climate.dayLow,
        dayHigh: climate.dayHigh,
        rainProbability: climate.rainProbability,
        profile: input.profile,
        mood: LOOK_STYLE_TO_MOOD[input.style],
        style: input.style,
        locale,
        lockedGarmentIds: [...lockedIds],
        dismissedGarmentIds: [...dismissed],
        forcedFavoritesIds: input.forcedFavoritesIds ?? [],
      };
      const byId = new Map(
        input.garments.map((garment) => [garment.garmentId, garment] as const),
      );
      const response = await callRecommenderStream(
        request,
        (option) => {
          const currentLooks = useGeneratorStore.getState().streamedLooks;
          const look = resolveLook(
            option.garmentIds,
            byId,
            currentLooks.length,
            typeof option.reason === "string" ? option.reason : null,
            typeof option.suitabilityRatio === "number"
              ? option.suitabilityRatio
              : 0,
          );
          if (look !== null) {
            useGeneratorStore
              .getState()
              .setStreamedLooks([...currentLooks, look]);
          }
        },
        () => useGeneratorStore.getState().setStreamedLooks([]),
      );
      if (!response.ok) {
        const code = await readRecommenderError(response);
        if (
          response.status === 422 &&
          code === "INSUFFICIENT_STYLE_GARMENTS"
        ) {
          throw new InsufficientStyleGarmentsError(input.style);
        }
        throw formatRecommenderError(response, code);
      }
      const payload = (await response.json()) as RecommenderResponse;
      if (!validateRecommenderResponse(payload)) {
        throw new AppError(ERROR_CODES.NO_OPTIONS);
      }

      const looks: AiLook[] = [];
      payload.options.slice(0, MAX_LOOK_OPTIONS).forEach((option, index) => {
        const look = resolveLook(
          Array.isArray(option.garmentIds) ? option.garmentIds : [],
          byId,
          index,
          typeof option.reason === "string" ? option.reason : null,
          typeof option.suitabilityRatio === "number"
            ? option.suitabilityRatio
            : 0,
        );
        if (look !== null) {
          looks.push(look);
        }
      });
      if (looks.length === 0) {
        throw new AppError(ERROR_CODES.NO_USABLE_GARMENTS);
      }
      return { looks, isFallback: payload._isFallback === true };
    },
    onSuccess: ({ looks, isFallback }) => {
      const { setAiLooks, setFullLook, setFallbackGarmentIds } =
        useGeneratorStore.getState();
      const first = looks[0];
      if (first) {
        const slots: Partial<Record<Category, Garment>> = {};
        for (const garment of first.garments) {
          const category = categorizeGarment(garment);
          if (category !== null && slots[category] === undefined) {
            slots[category] = garment;
          }
        }
        setFullLook(slots);
      }
      setAiLooks(looks);
      // Fallback looks skip AI training: record their IDs for amnesia
      // and announce the fallback stylist instead of the success toast.
      if (isFallback) {
        setFallbackGarmentIds(
          looks.flatMap((look) =>
            look.garments.map((garment) => garment.garmentId),
          ),
        );
        useNotificationStore
          .getState()
          .addNotification("success", t("fallbackStylist"));
        return;
      }
      setFallbackGarmentIds([]);
      useNotificationStore
        .getState()
        .addNotification("success", t("lookGenerated"));
    },
    onError: (error) => {
      // Strict-filter rejection: land on the showcase with the dedicated
      // empty state (skeletons stop via the view transition + settled
      // mutation). No error toast: the empty state carries the message.
      if (error instanceof InsufficientStyleGarmentsError) {
        useGeneratorStore.getState().failStrictStyleFilter(error.style);
        return;
      }
      useNotificationStore.getState().addNotification(
        "error",
        isAppError(error) ? t(`errors.${error.code}`) : t("errors.STYLIST_UNAVAILABLE"),
      );
      useGeneratorStore.getState().setView("auto-select");
    },
  });
}
