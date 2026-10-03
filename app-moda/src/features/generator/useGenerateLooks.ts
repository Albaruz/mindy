import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import type { Garment } from "@/types/garment";
import {
  useGeneratorStore,
  type AiLook,
  type Category,
  type LookStyle,
} from "./useGeneratorStore";
import {
  categorizeGarment,
  isLaundryExemptGarment,
  withoutHiddenBottom,
} from "./categorizeGarments";
import { useNotificationStore } from "@/features/ui/useNotificationStore";
import type { Mood, RecommenderProfile } from "./useGenerateLook";

export const LOOK_STYLE_TO_MOOD: Record<LookStyle, Mood> = {
  casual: "relaxed",
  formal: "professional",
  sport: "active",
  elegant: "elegant",
  streetwear: "relaxed",
  party: "elegant",
};

export interface GenerateLooksInput {
  garments: Garment[];
  profile: RecommenderProfile | null;
  style: LookStyle;
}

interface RecommenderOption {
  garmentIds: string[];
  suitabilityRatio?: number;
  reason?: string;
}

interface RecommenderResponse {
  options: RecommenderOption[];
  _isFallback?: boolean;
}

interface GenerateLooksResult {
  looks: AiLook[];
  isFallback: boolean;
}

// Server error payloads are short user-safe messages: forward them so the
// toast shows the real cause instead of a generic fallback.
async function readResponseErrorCode(response: Response): Promise<string | null> {
  try {
    const payload: unknown = await response.json();
    if (typeof payload === "object" && payload !== null) {
      const message = (payload as Record<string, unknown>).error;
      if (typeof message === "string" && message !== "") {
        return message;
      }
    }
  } catch {
    // Fall through to null below.
  }
  return null;
}

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

interface Climate {
  temperatureC: number;
  condition: string | null;
  dayLow: number | null;
  dayHigh: number | null;
  rainProbability: number | null;
}

const DEFAULT_CLIMATE: Climate = {
  temperatureC: 20,
  condition: null,
  dayLow: null,
  dayHigh: null,
  rainProbability: null,
};

function readOptionalNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

// Shared with the manual "Combinar" flow (useCombineLocked): day-based
// climate resolved once per inference, defaulting to 20C offline.
export async function resolveClimate(): Promise<Climate> {
  try {
    const position = await new Promise<GeolocationPosition>(
      (resolve, reject) => {
        if (!("geolocation" in navigator)) {
          reject(new Error("No geolocation"));
          return;
        }
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 8000,
          maximumAge: 600_000,
        });
      },
    );
    const response = await fetch(
      `/api/weather?lat=${position.coords.latitude}&lon=${position.coords.longitude}`,
    );
    if (!response.ok) {
      return DEFAULT_CLIMATE;
    }
    const payload = (await response.json()) as {
      temperatureC?: unknown;
      condition?: unknown;
      dayLow?: unknown;
      dayHigh?: unknown;
      rainProbability?: unknown;
    };
    return {
      temperatureC:
        typeof payload.temperatureC === "number" &&
        Number.isFinite(payload.temperatureC)
          ? payload.temperatureC
          : DEFAULT_CLIMATE.temperatureC,
      condition:
        typeof payload.condition === "string" ? payload.condition : null,
      dayLow: readOptionalNumber(payload.dayLow),
      dayHigh: readOptionalNumber(payload.dayHigh),
      rainProbability: readOptionalNumber(payload.rainProbability),
    };
  } catch {
    return DEFAULT_CLIMATE;
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
  return useMutation({
    mutationFn: async (input: GenerateLooksInput): Promise<GenerateLooksResult> => {
      const { dismissedIds, getLockedGarments } =
        useGeneratorStore.getState();
      const locked = getLockedGarments();
      const lockedIds = new Set(locked.map((g) => g.garmentId));
      const dismissed = new Set(dismissedIds);

      const candidates = input.garments.filter(
        (garment) =>
          (!dismissed.has(garment.garmentId) &&
            (!garment.isDirty || isLaundryExemptGarment(garment))) ||
          lockedIds.has(garment.garmentId),
      );
      if (candidates.length === 0) {
        throw new Error("Add garments to your closet first.");
      }

      const climate = await resolveClimate();
      const apiGarments = candidates.map((garment) =>
        garment.isDirty && isLaundryExemptGarment(garment)
          ? { ...garment, isDirty: false }
          : garment,
      );
      const response = await fetch("/api/recommender", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          garments: apiGarments,
          temperatureC: climate.temperatureC,
          condition: climate.condition,
          dayLow: climate.dayLow,
          dayHigh: climate.dayHigh,
          rainProbability: climate.rainProbability,
          profile: input.profile,
          mood: LOOK_STYLE_TO_MOOD[input.style],
          style: input.style,
          lockedGarmentIds: [...lockedIds],
          dismissedGarmentIds: [...dismissed],
        }),
      });
      if (!response.ok) {
        const code = await readResponseErrorCode(response);
        if (
          response.status === 422 &&
          code === "INSUFFICIENT_STYLE_GARMENTS"
        ) {
          throw new InsufficientStyleGarmentsError(input.style);
        }
        throw new Error(
          code !== null
            ? `${code} (status ${response.status})`
            : `The stylist is unavailable right now. (status ${response.status})`,
        );
      }
      const payload = (await response.json()) as RecommenderResponse;
      if (!Array.isArray(payload.options) || payload.options.length === 0) {
        throw new Error("The stylist returned no options.");
      }

      const byId = new Map(
        input.garments.map((garment) => [garment.garmentId, garment] as const),
      );
      const looks: AiLook[] = [];
      payload.options.slice(0, 3).forEach((option, index) => {
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
        throw new Error("The stylist returned no usable garments.");
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
      // and announce the trainee stylist instead of the success toast.
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
        error instanceof Error ? error.message : t("stylistUnavailable"),
      );
      useGeneratorStore.getState().setView("auto-select");
    },
  });
}
