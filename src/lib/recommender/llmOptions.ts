import { readString } from "@/lib/readers";
import { readIdList } from "./request";
import type { OutfitOption } from "./types";
// Upstream hiccups (Groq HTTP errors, empty completions, unusable model
// output) degrade to the local fallback: 502 only when the fallback
// itself cannot build a look. Anything else is a server bug: 500.
export function isUpstreamFailure(error: unknown): boolean {
  const status = (error as { status?: unknown }).status;
  if (typeof status === "number") {
    return true;
  }
  return (
    error instanceof Error &&
    /not configured|empty completion|LLM response|LLM options/.test(
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

export function parseOptions(content: string, knownIds: Set<string>): OutfitOption[] {
  const parsed: unknown = JSON.parse(content);
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("LLM response is not a JSON object");
  }
  const options = (parsed as Record<string, unknown>).options;
  if (!Array.isArray(options) || options.length === 0) {
    throw new Error("LLM response has no outfit options");
  }

  const valid: OutfitOption[] = [];
  for (const entry of options.slice(0, 3)) {
    if (typeof entry !== "object" || entry === null) {
      continue;
    }
    const record = entry as Record<string, unknown>;
    const garmentIds = readIdList(record.garmentIds).filter((id) =>
      knownIds.has(id),
    );
    if (garmentIds.length === 0) {
      continue;
    }
    valid.push({
      garmentIds,
      suitabilityRatio: clampRatio(record.suitabilityRatio),
      reason: readString(record.reason) ?? "",
    });
  }

  if (valid.length === 0) {
    throw new Error("LLM options reference no known garment IDs");
  }
  return valid;
}
