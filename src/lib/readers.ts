import { READ_STRING_MAX_LENGTH } from "@/constants/validation";

// Narrowing helpers for untrusted payloads (request bodies, API responses).

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Non-empty string, truncated to maxLength; null for anything else. */
export function readString(
  value: unknown,
  maxLength = READ_STRING_MAX_LENGTH,
): string | null {
  if (typeof value !== "string" || value === "") {
    return null;
  }
  return value.slice(0, maxLength);
}

/** Finite number; null for NaN, Infinity and non-numbers. */
export function readFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}