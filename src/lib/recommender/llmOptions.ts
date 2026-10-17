import { readString } from "@/lib/readers";
import { MAX_LOOK_OPTIONS } from "@/constants/generator";
import { readIdList } from "./request";
import type { OutfitOption } from "./types";
// Upstream hiccups (Groq HTTP errors, empty completions, unusable model
// output) degrade to the local fallback: 502 only when the fallback
// itself cannot build a look. Anything else is a server bug: 500.
export function isUpstreamFailure(error: unknown): boolean {
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
