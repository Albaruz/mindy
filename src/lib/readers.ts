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

/** Reads a trimmed, lowercased string only when it belongs to a closed set. */
export function readAllowedString(
  value: unknown,
  allowed: readonly string[],
  maxLength = READ_STRING_MAX_LENGTH,
): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (
    normalized === "" ||
    normalized.length > maxLength ||
    !allowed.includes(normalized)
  ) {
    return null;
  }
  return normalized;
}

/** Keeps only exact values from a closed set in an untrusted array. */
export function readAllowedStringList(
  value: unknown,
  allowed: readonly string[],
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(
    (item): item is string =>
      typeof item === "string" && allowed.includes(item),
  );
}
