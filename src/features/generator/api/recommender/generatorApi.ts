import type { Garment } from "@/types/garment";
import { isLaundryExemptGarment } from "@/lib/garment/categorizeGarments";
import { API_ROUTES } from "@/constants/api";
import type { RecommenderProfile, Mood } from "../../domain/recommendations/generatorTypes";
import type { LookStyle } from "../../state/generator-store/useGeneratorStore";

export interface RecommenderGarment extends Garment {
  // For API: dirty exempt garments (footwear, outerwear) are sent as clean
  // so the server never filters them out.
  isDirty: boolean;
}

export interface RecommenderRequest {
  garments: RecommenderGarment[];
  temperatureC: number;
  condition: string | null;
  dayLow: number | null;
  dayHigh: number | null;
  rainProbability: number | null;
  profile: RecommenderProfile | null;
  mood: Mood | null;
  style: LookStyle | null;
  locale: string;
  lockedGarmentIds: string[];
  dismissedGarmentIds: string[];
  // Wizard alias for hard constraints (manual flow).
  fixed_garments?: string[];
  // Auto-select: force-include these favorite garment IDs in the generated look.
  forcedFavoritesIds?: string[];
  // Optional favorites eligible for probabilistic inclusion by the server.
  suggestedFavoriteIds?: string[];
}

export interface RecommenderOption {
  garmentIds: string[];
  suitabilityRatio?: number;
  reason?: string;
}

export interface RecommenderResponse {
  options: RecommenderOption[];
  _isFallback?: boolean;
  fallbackReason?: string | null;
}

function isRecommenderOption(value: unknown): value is RecommenderOption {
  if (typeof value !== "object" || value === null) return false;
  const option = value as Record<string, unknown>;
  return (
    Array.isArray(option.garmentIds) &&
    option.garmentIds.every((id) => typeof id === "string") &&
    (option.suitabilityRatio === undefined ||
      typeof option.suitabilityRatio === "number") &&
    (option.reason === undefined || typeof option.reason === "string")
  );
}

function isRecommenderResponse(value: unknown): value is RecommenderResponse {
  if (typeof value !== "object" || value === null) return false;
  const response = value as Record<string, unknown>;
  return (
    Array.isArray(response.options) &&
    response.options.every(isRecommenderOption) &&
    (response._isFallback === undefined || typeof response._isFallback === "boolean") &&
    (response.fallbackReason === undefined ||
      response.fallbackReason === null ||
      typeof response.fallbackReason === "string")
  );
}

export async function callRecommender(
  request: RecommenderRequest,
): Promise<Response> {
  return fetch(API_ROUTES.recommender, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
}

export async function callRecommenderStream(
  request: RecommenderRequest,
  onOption: (option: RecommenderOption) => void,
  onReset: () => void,
): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(API_ROUTES.recommender, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify(request),
    });
  } catch {
    return Response.json({ error: "STYLIST_UNAVAILABLE" }, { status: 502 });
  }

  if (!response.ok || !response.body) {
    return response;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const streamState: {
    completed: RecommenderResponse | null;
    error: { error: string; status?: number } | null;
  } = { completed: null, error: null };

  const handleFrame = (frame: string) => {
    const data = frame
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n");
    if (data === "") return;

    let event: unknown;
    try {
      event = JSON.parse(data);
    } catch {
      throw new Error("Invalid recommender stream event.");
    }
    if (typeof event !== "object" || event === null) return;

    const record = event as Record<string, unknown>;
    if (record.type === "preview" && isRecommenderOption(record.option)) {
      onOption(record.option);
    } else if (record.type === "reset") {
      onReset();
    } else if (record.type === "complete") {
      if (isRecommenderResponse(record.payload)) {
        streamState.completed = record.payload;
      }
    } else if (record.type === "error") {
      streamState.error = {
        error: typeof record.error === "string" ? record.error : "STYLIST_UNAVAILABLE",
        status: typeof record.status === "number" ? record.status : 502,
      };
    }
  };

  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer = `${buffer}${decoder.decode(value, { stream: !done })}`.replace(
        /\r\n/g,
        "\n",
      );

      let frameEnd = buffer.indexOf("\n\n");
      while (frameEnd >= 0) {
        handleFrame(buffer.slice(0, frameEnd));
        buffer = buffer.slice(frameEnd + 2);
        frameEnd = buffer.indexOf("\n\n");
      }

      if (done) break;
    }
    if (buffer.trim() !== "") handleFrame(buffer);
  } catch {
    onReset();
    return Response.json({ error: "STYLIST_UNAVAILABLE" }, { status: 502 });
  } finally {
    reader.releaseLock();
  }

  if (streamState.error) {
    return Response.json(
      { error: streamState.error.error },
      { status: streamState.error.status ?? 502 },
    );
  }
  if (!streamState.completed) {
    onReset();
    return Response.json({ error: "STYLIST_UNAVAILABLE" }, { status: 502 });
  }

  const headers = new Headers(response.headers);
  headers.set("Content-Type", "application/json");
  return new Response(JSON.stringify(streamState.completed), { status: 200, headers });
}

export function buildRecommenderGarments(
  candidates: Garment[],
): RecommenderGarment[] {
  return candidates.map((garment) =>
    garment.isDirty && isLaundryExemptGarment(garment)
      ? { ...garment, isDirty: false }
      : garment,
  );
}
