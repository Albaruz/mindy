/**
 * Shared recommender response handling.
 * Extracts server error messages so toasts show the real cause.
 */
import type { RecommenderResponse } from "./generatorApi";
import { ERROR_CODES } from "@/constants/errors";
import { AppError } from "@/lib/errors";

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
  // Never expose an upstream message or code directly to the user.
  return new AppError(
    errorCode === "INSUFFICIENT_STYLE_GARMENTS"
      ? ERROR_CODES.NO_OPTIONS
      : ERROR_CODES.STYLIST_UNAVAILABLE,
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
