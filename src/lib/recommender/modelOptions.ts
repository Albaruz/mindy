import type { OutfitOption, CandidateGarment } from "./types";
import {
  filterValidOutfitOptions,
  parseOptions,
} from "./llmOptions";
import { filterColdWeatherOutfitOptions } from "./weatherRules";
import { repairOutfitRecommendation } from "@/lib/ai/engine";

export interface ModelOptionsContext {
  knownIds: Set<string>;
  candidates: CandidateGarment[];
  lockedIds: Set<string>;
  outerwearRequired: boolean;
  coldWeather: boolean;
}

export function readValidModelOptions(
  content: string,
  context: ModelOptionsContext,
): OutfitOption[] {
  const valid = filterValidOutfitOptions(
    parseOptions(content, context.knownIds),
    context.candidates,
    context.lockedIds,
    context.outerwearRequired,
  );
  return filterColdWeatherOutfitOptions(
    valid,
    context.candidates,
    context.lockedIds,
    context.coldWeather,
  );
}

export async function repairModelOptionsIfNeeded(
  userPayload: unknown,
  content: string,
  context: ModelOptionsContext,
  signal?: AbortSignal,
): Promise<{ options: OutfitOption[]; attempted: boolean }> {
  const options = readValidModelOptions(content, context);
  if (options.length > 0) {
    return { options, attempted: false };
  }

  const repairedContent = await repairOutfitRecommendation(
    userPayload,
    content,
    signal,
  );
  return {
    options: readValidModelOptions(repairedContent, context),
    attempted: true,
  };
}
