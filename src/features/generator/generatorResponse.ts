/**
 * Shared recommender response handling.
 * Extracts server error messages so toasts show the real cause.
 */
import type { RecommenderResponse } from "./generatorApi";

export async function readRecommenderError(
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

export function formatRecommenderError(
  response: Response,
  errorCode: string | null,
): Error {
  return new Error(
    errorCode !== null
      ? `${errorCode} (status ${response.status})`
      : `The stylist is unavailable right now. (status ${response.status})`,
  );
}

export function validateRecommenderResponse(
  payload: unknown,
): payload is RecommenderResponse {
  return (
    typeof payload === "object" &&
    payload !== null &&
    Array.isArray((payload as RecommenderResponse).options) &&
    (payload as RecommenderResponse).options.length > 0
  );
}