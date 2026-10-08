import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import type { Garment } from "@/types/garment";
import {
  useGeneratorStore,
  type Category,
} from "./useGeneratorStore";
import {
  categorizeGarment,
  isLaundryExemptGarment,
  isOnePieceGarment,
} from "./categorizeGarments";
import { useNotificationStore } from "@/features/ui/useNotificationStore";
import { MAX_LOOK_OPTIONS } from "@/constants/generator";
import { API_ROUTES } from "@/constants/api";
import type { RecommenderProfile } from "./useGenerateLook";
import { resolveClimate } from "./useGenerateLooks";

export interface CombineLockedInput {
  garments: Garment[];
  profile: RecommenderProfile | null;
}

interface CombineLockedResult {
  // Ordered suggestion IDs per unlocked category (best option first).
  suggestions: Partial<Record<Category, string[]>>;
  // Top suggestion per unlocked category, centered after combining.
  firstLook: Partial<Record<Category, Garment>>;
  isFallback: boolean;
  // Every suggested ID when the local fallback answered (amnesia set).
  fallbackIds: string[];
}

interface RecommenderOption {
  garmentIds: string[];
}

interface RecommenderResponse {
  options: RecommenderOption[];
  _isFallback?: boolean;
}

// Server error payloads are short user-safe messages: forward them so the
// toast shows the real cause instead of a generic fallback.
async function readResponseErrorCode(
  response: Response,
): Promise<string | null> {
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

// Manual "Bloquear y Generar" (wizard) inference. Unlike the auto flow,
// it never leaves the manual view: locked carousels stay static while the
// mutation runs, and on success unlocked carousels reload with the AI
// suggestions ranked first. Locked IDs travel as both lockedGarmentIds
// and the wizard alias fixed_garments (hard constraints).
export function useCombineLocked() {
  const t = useTranslations("Notifications");

  return useMutation({
    mutationFn: async (
      input: CombineLockedInput,
    ): Promise<CombineLockedResult> => {
      const { dismissedIds, getLockedGarments } =
        useGeneratorStore.getState();
      const locked = getLockedGarments();
      const lockedIds = new Set(locked.map((g) => g.garmentId));
      // Locks are optional constraints, not a requirement: without pins
      // this is a plain style-free generation over the clean closet.
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
      const response = await fetch(API_ROUTES.recommender, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          garments: candidates,
          temperatureC: climate.temperatureC,
          condition: climate.condition,
          dayLow: climate.dayLow,
          dayHigh: climate.dayHigh,
          rainProbability: climate.rainProbability,
          profile: input.profile,
          // No style pre-selection in manual mode: the user combines
          // arbitrary pinned garments, so strict style filtering must
          // not apply (it would 422 on mixed-style closets).
          mood: null,
          style: null,
          lockedGarmentIds: [...lockedIds],
          fixed_garments: [...lockedIds],
          dismissedGarmentIds: [...dismissed],
        }),
      });
      if (!response.ok) {
        const code = await readResponseErrorCode(response);
        throw new Error(
          code !== null
            ? `${code} (status ${response.status})`
            : `The stylist is unavailable right now. (status ${response.status})`,
        );
      }
      const payload = (await response.json()) as RecommenderResponse;
      if (!Array.isArray(payload.options) || payload.options.length === 0) {
        throw new Error(t("stylistUnavailable"));
      }

      const byId = new Map(
        input.garments.map((garment) => [garment.garmentId, garment] as const),
      );
      // Rank unlocked suggestions per category across the 2-3 returned
      // options (option order = best first), deduplicated.
      const suggestions: Partial<Record<Category, string[]>> = {};
      for (const option of payload.options.slice(0, MAX_LOOK_OPTIONS)) {
        if (!Array.isArray(option.garmentIds)) {
          continue;
        }
        for (const id of option.garmentIds) {
          if (lockedIds.has(id)) {
            continue;
          }
          const garment = byId.get(id);
          if (!garment) {
            continue;
          }
          const category = categorizeGarment(garment);
          if (category === null) {
            continue;
          }
          const list = suggestions[category] ?? [];
          if (!list.includes(id)) {
            list.push(id);
            suggestions[category] = list;
          }
        }
      }
      const firstLook: Partial<Record<Category, Garment>> = {};
      for (const category of Object.keys(suggestions) as Category[]) {
        const firstId = suggestions[category]?.[0];
        const garment =
          firstId === undefined ? undefined : byId.get(firstId);
        if (garment !== undefined) {
          firstLook[category] = garment;
        }
      }
      // A dress/mono top never recenters a stale bottom alongside it.
      if (
        firstLook.top !== undefined &&
        isOnePieceGarment(firstLook.top)
      ) {
        delete firstLook.bottom;
      }
      const isFallback = payload._isFallback === true;
      const fallbackIds = isFallback
        ? [...new Set(payload.options.flatMap((option) => Array.isArray(option.garmentIds) ? option.garmentIds : []))]
        : [];
      return { suggestions, firstLook, isFallback, fallbackIds };
    },
    onSuccess: ({ suggestions, firstLook, isFallback, fallbackIds }) => {
      const { setCombineSuggestions, setFullLook, setFallbackGarmentIds } =
        useGeneratorStore.getState();
      setCombineSuggestions(suggestions);
      // Center each unlocked carousel on its best suggestion. Locked
      // slots are preserved by setFullLook.
      setFullLook(firstLook);
      if (isFallback) {
        setFallbackGarmentIds(fallbackIds);
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
      useNotificationStore.getState().addNotification(
        "error",
        error instanceof Error ? error.message : t("stylistUnavailable"),
      );
    },
  });
}
