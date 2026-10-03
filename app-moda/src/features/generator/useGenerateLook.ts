/**
 * REFERENCE ONLY (not used in any flow).
 *
 * Legacy single-look generation: applies only the best LLM option to the
 * canvas and resolves instant (not day-based) climate. Superseded by
 * `useGenerateLooks.ts` (multi-option showcase + day-based climate).
 * Kept for documentation. Its `Mood` / `RecommenderProfile` types are
 * still imported by `useGenerateLooks.ts` and `Home.tsx`.
 */
import { useMutation } from "@tanstack/react-query";
import type { Garment } from "@/types/garment";
import { useGeneratorStore, type Category } from "./useGeneratorStore";
import { categorizeGarment, isLaundryExemptGarment } from "./categorizeGarments";
import { useNotificationStore } from "@/features/ui/useNotificationStore";

export const MOODS = [
  "relaxed",
  "cheerful",
  "professional",
  "active",
  "elegant",
] as const;

export type Mood = (typeof MOODS)[number];

export interface RecommenderProfile {
  colorimetry: string | null;
  morphology: string | null;
  preferredFit: string | null;
  lifestyle: string | null;
}

export interface GenerateLookInput {
  // Every known garment (used to resolve AI-returned IDs, dirty or not).
  garments: Garment[];
  profile: RecommenderProfile | null;
  mood: Mood;
}

const GEOLOCATION_TIMEOUT_MS = 8000;

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Geolocation is not available."));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      timeout: GEOLOCATION_TIMEOUT_MS,
      maximumAge: 600_000,
    });
  });
}

// The weather endpoint serves a 20C default on any failure, so temperature
// resolution never throws: worst case the heat rule runs on the default.
async function resolveTemperatureCelsius(): Promise<number> {
  try {
    const position = await getCurrentPosition();
    const response = await fetch(
      `/api/weather?lat=${position.coords.latitude}&lon=${position.coords.longitude}`,
    );
    if (!response.ok) {
      return 20;
    }
    const payload: unknown = await response.json();
    if (typeof payload !== "object" || payload === null) {
      return 20;
    }
    const temperature = (payload as Record<string, unknown>).temperatureC;
    return typeof temperature === "number" && Number.isFinite(temperature)
      ? temperature
      : 20;
  } catch {
    return 20;
  }
}

interface RecommenderResponse {
  options: { garmentIds: string[] }[];
}

// Server error payloads are short user-safe messages: forward them so the
// toast shows the real cause instead of a generic fallback.
async function readServerError(response: Response): Promise<string> {
  try {
    const payload: unknown = await response.json();
    if (typeof payload === "object" && payload !== null) {
      const message = (payload as Record<string, unknown>).error;
      if (typeof message === "string" && message !== "") {
        return message;
      }
    }
  } catch {
    // Fall through to the generic message below.
  }
  return "The stylist is unavailable right now.";
}

// Sends clean garments plus locked ones to /api/recommender and applies the
// best option to the canvas via setFullLook (locked slots are preserved by
// the store itself).
export function useGenerateLook() {
  return useMutation({
    mutationFn: async (input: GenerateLookInput): Promise<void> => {
      const { setFullLook, getLockedGarments, dismissedIds } =
        useGeneratorStore.getState();
      const lockedGarments = getLockedGarments();
      const lockedIds = new Set(
        lockedGarments.map((garment) => garment.garmentId),
      );
      const dismissed = new Set(dismissedIds);

      // Dirty tops and bottoms are skipped, but reusable garments (footwear,
      // outerwear) stay eligible even when flagged dirty (legacy rows).
      const candidates = input.garments.filter(
        (garment) =>
          (!dismissed.has(garment.garmentId) &&
            (!garment.isDirty || isLaundryExemptGarment(garment))) ||
          lockedIds.has(garment.garmentId),
      );
      if (candidates.length === 0) {
        throw new Error("Add garments to your closet first.");
      }

      const temperatureC = await resolveTemperatureCelsius();

      // The API drops dirty candidates: report exempt garments as clean so
      // reusable footwear and outerwear are never filtered server-side.
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
          temperatureC,
          profile: input.profile,
          mood: input.mood,
          lockedGarmentIds: [...lockedIds],
          dismissedGarmentIds: [...dismissed],
        }),
      });
      if (!response.ok) {
        throw new Error(await readServerError(response));
      }

      const payload = (await response.json()) as unknown as
        | RecommenderResponse
        | null;
      const bestOption =
        typeof payload === "object" && payload !== null
          ? payload.options[0]
          : undefined;
      if (!bestOption) {
        throw new Error("The stylist returned no options.");
      }

      const byId = new Map(
        input.garments.map((garment) => [garment.garmentId, garment] as const),
      );
      const look: Partial<Record<Category, Garment>> = {};
      for (const id of bestOption.garmentIds) {
        const garment = byId.get(id);
        if (!garment) {
          continue;
        }
        const category = categorizeGarment(garment);
        if (category !== null && look[category] === undefined) {
          look[category] = garment;
        }
      }
      if (Object.keys(look).length === 0) {
        throw new Error("The stylist returned no usable garments.");
      }
      setFullLook(look);
    },
    onSuccess: () => {
      useNotificationStore
        .getState()
        .addNotification(
          "success",
          "New look generated. Locked garments were preserved.",
        );
    },
    onError: (error) => {
      useNotificationStore.getState().addNotification(
        "error",
        error instanceof Error
          ? error.message
          : "The stylist is unavailable right now. Try again.",
      );
    },
  });
}
