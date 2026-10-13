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