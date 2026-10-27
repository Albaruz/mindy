import { readString } from "@/lib/readers";
import { MAX_LOOK_OPTIONS } from "@/constants/generator";
import {
  GROQ_JSON_VALIDATION_ERROR_MARKERS,
  type AiFallbackReason,
} from "@/constants/ai";
import { readIdList } from "./request";
import type { OutfitOption } from "./types";
import {
  categorizeGarment,
  isOnePieceGarment,
} from "@/lib/garment/categorizeGarments";
import { toClassifiableGarment } from "./request";
import type { CandidateGarment } from "./types";
// Upstream hiccups (Groq HTTP errors, empty completions, unusable model
// output) degrade to the local fallback: 502 only when the fallback
// itself cannot build a look. Anything else is a server bug: 500.
export function isUpstreamFailure(error: unknown): boolean {
  if (error === null || error === undefined) {
    return false;
  }
  if (
    typeof error === "object" &&
    error !== null &&
    (error as { __upstreamFailure?: unknown }).__upstreamFailure === true
  ) {
    return true;
  }
  const status = (error as { status?: unknown }).status;
  if (typeof status === "number") {
    return true;
  }
  const name = (error as { name?: unknown }).name;
  if (
    name === "APIError" ||
    name === "GroqError" ||
    name === "APIConnectionError" ||
    name === "APIConnectionTimeoutError" ||
    name === "InternalServerError" ||
    name === "RateLimitError" ||
    name === "BadRequestError"
  ) {
    return true;
  }
  return (
    error instanceof Error &&
    /not configured|empty completion|LLM response|LLM options|Groq|upstream|network|fetch failed|timeout|rate limit/i.test(
      error.message,
    )
  );
}

// Normalized telemetry reasons deliberately omit provider payloads, candidate
// IDs, and profile data. They make fallbacks measurable without exposing data.
export function classifyAiFallbackReason(
  error: unknown,
  repairAttempted: boolean,
): AiFallbackReason {
  const status = (error as { status?: unknown }).status;
  const name = (error as { name?: unknown }).name;
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  if (GROQ_JSON_VALIDATION_ERROR_MARKERS.some((marker) => message.includes(marker))) {
    return "stream_json_validation_failed";
  }
  if (status === 429 || name === "RateLimitError" || message.includes("rate limit")) {
    return "groq_rate_limited";
  }
  if (name === "APIConnectionTimeoutError" || message.includes("timeout")) {
    return "groq_timeout";
  }
  if (name === "APIConnectionError" || /network|fetch failed|connection/.test(message)) {
    return "groq_connection";
  }
  if (typeof status === "number" && status >= 500) {
    return "groq_server_error";
  }
  if (message.includes("empty completion")) {
    return "empty_completion";
  }
  if (message.includes("invalid json") || message.includes("not a json object")) {
    return repairAttempted ? "repair_failed" : "invalid_json";
  }
  if (message.includes("has no outfit options")) {
    return repairAttempted ? "repair_failed" : "missing_options";
  }
  if (message.includes("reference no known garment ids")) {
    return repairAttempted ? "repair_failed" : "unknown_garment_ids";
  }
  if (message.includes("violate outfit constraints")) {
    return repairAttempted ? "repair_failed" : "constraint_rejection";
  }
  return "upstream_unknown";
}

function clampRatio(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }
  return Math.min(100, Math.max(0, Math.round(value)));
}

function parseOption(value: unknown, knownIds: Set<string>): OutfitOption | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const garmentIds = readIdList(record.garmentIds).filter((id) =>
    knownIds.has(id),
  );
  if (garmentIds.length === 0) {
    return null;
  }
  return {
    garmentIds,
    suitabilityRatio: clampRatio(record.suitabilityRatio),
    reason: readString(record.reason) ?? "",
  };
}

/** Extract complete top-level option objects from an incomplete JSON stream. */
export function extractCompletedOptionObjects(content: string): string[] {
  const optionsMatch = /"options"\s*:\s*\[/.exec(content);
  if (!optionsMatch) {
    return [];
  }

  const objects: string[] = [];
  const arrayStart = optionsMatch.index + optionsMatch[0].length;
  let objectStart = -1;
  let objectDepth = 0;
  let inString = false;
  let escaped = false;

  for (let index = arrayStart; index < content.length; index += 1) {
    const character = content[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === '"') {
        inString = false;
      }
      continue;
    }

    if (character === '"') {
      inString = true;
    } else if (character === "{") {
      if (objectDepth === 0) {
        objectStart = index;
      }
      objectDepth += 1;
    } else if (character === "}" && objectDepth > 0) {
      objectDepth -= 1;
      if (objectDepth === 0 && objectStart >= 0) {
        objects.push(content.slice(objectStart, index + 1));
        objectStart = -1;
      }
    } else if (character === "]" && objectDepth === 0) {
      break;
    }
  }

  return objects;
}

export function parseCompletedOption(
  content: string,
  knownIds: Set<string>,
): OutfitOption | null {
  try {
    return parseOption(JSON.parse(content), knownIds);
  } catch {
    return null;
  }
}

export function parseOptions(content: string, knownIds: Set<string>): OutfitOption[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("LLM response is invalid JSON");
  }
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("LLM response is not a JSON object");
  }
  const options = (parsed as Record<string, unknown>).options;
  if (!Array.isArray(options) || options.length === 0) {
    throw new Error("LLM response has no outfit options");
  }

  const valid: OutfitOption[] = [];
  for (const entry of options.slice(0, MAX_LOOK_OPTIONS)) {
    const option = parseOption(entry, knownIds);
    if (option !== null) valid.push(option);
  }

  if (valid.length === 0) {
    throw new Error("LLM options reference no known garment IDs");
  }
  return valid;
}

/** Removes syntactically valid options that violate server-side constraints. */
export function filterValidOutfitOptions(
  options: OutfitOption[],
  candidates: CandidateGarment[],
  lockedIds: Set<string>,
  requireOuterwear: boolean,
): OutfitOption[] {
  const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  return options.filter((option) => {
    if (new Set(option.garmentIds).size !== option.garmentIds.length) {
      return false;
    }
    if (![...lockedIds].every((id) => option.garmentIds.includes(id))) {
      return false;
    }
    const selected = option.garmentIds
      .map((id) => byId.get(id))
      .filter((candidate): candidate is CandidateGarment => candidate !== undefined);
    const selectedCategories = selected.map((candidate) =>
      categorizeGarment(toClassifiableGarment(candidate)),
    );
    const categories = new Set(
      selectedCategories,
    );
    if (
      selectedCategories.filter((category) => category === "mid_layer").length > 1 ||
      selectedCategories.filter((category) => category === "outerwear").length > 1
    ) {
      return false;
    }
    const hasOnePiece = selected.some((candidate) =>
      isOnePieceGarment(toClassifiableGarment(candidate)),
    );
    if (hasOnePiece && categories.has("bottom")) {
      return false;
    }
    if (!hasOnePiece && (!categories.has("top") || !categories.has("bottom"))) {
      return false;
    }
    return !requireOuterwear || categories.has("outerwear");
  });
}

/**
 * Filters options to ensure variety across them:
 * - No repeated tops across options
 * - No repeated bottoms across options
 * - Locked garments are exempt (must appear in all options)
 * - Footwear, mid-layers and outerwear may repeat
 * Keeps the highest-suitability option when conflicts occur.
 */
export function enforceVarietyAcrossOptions(
  options: OutfitOption[],
  candidates: CandidateGarment[],
  lockedIds: Set<string>,
): OutfitOption[] {
  const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const usedTops = new Set<string>();
  const usedBottoms = new Set<string>();

  // Sort by suitability descending so we keep best options
  const sorted = [...options].sort(
    (a, b) => b.suitabilityRatio - a.suitabilityRatio,
  );

  return sorted.filter((option) => {
    const selected = option.garmentIds
      .map((id) => byId.get(id))
      .filter((candidate): candidate is CandidateGarment => candidate !== undefined);

    for (const garment of selected) {
      const category = categorizeGarment(toClassifiableGarment(garment));
      if (lockedIds.has(garment.id)) continue; // locked always allowed
      if (category === "top" && usedTops.has(garment.id)) return false;
      if (category === "bottom" && usedBottoms.has(garment.id)) return false;
    }

    // Mark as used for subsequent options
    for (const garment of selected) {
      const category = categorizeGarment(toClassifiableGarment(garment));
      if (lockedIds.has(garment.id)) continue;
      if (category === "top") usedTops.add(garment.id);
      if (category === "bottom") usedBottoms.add(garment.id);
    }
    return true;
  });
}
