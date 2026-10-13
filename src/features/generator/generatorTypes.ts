/**
 * Shared generator types.
 * Extracted from the legacy `useGenerateLook.ts` so the active flow
 * (`useGenerateLooks.ts`, `useCombineLocked.ts`, `Home.tsx`, `ManualCarousels.tsx`)
 * can depend on a stable, minimal module without pulling in the old implementation.
 */

export const MOODS = [
  "relaxed",
  "cheerful",
  "professional",
  "active",
  "elegant",
] as const;

export type Mood = (typeof MOODS)[number];

export interface RecommenderProfile {
  colorimetry: string | null;
  morphology: string | null;
  preferredFit: string | null;
  lifestyle: string | null;
}

// Input/output types for generator mutations (using string for Category/LookStyle
// to avoid circular deps with useGeneratorStore)
export type Category = "top" | "bottom" | "footwear" | "outerwear";
export type LookStyle = "casual" | "formal" | "sport" | "elegant" | "streetwear" | "party";

export interface GenerateLooksInput {
  garments: import("@/types/garment").Garment[];
  profile: RecommenderProfile | null;
  style: LookStyle;
}

export interface GenerateLooksResult {
  looks: import("./useGeneratorStore").AiLook[];
  isFallback: boolean;
}

export interface CombineLockedInput {
  garments: import("@/types/garment").Garment[];
  profile: RecommenderProfile | null;
}

export interface CombineLockedResult {
  suggestions: Partial<Record<Category, string[]>>;
  firstLook: Partial<Record<Category, import("@/types/garment").Garment>>;
  isFallback: boolean;
  fallbackIds: string[];
}