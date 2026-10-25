import type { Garment } from "@/types/garment";
import type { UserProfile } from "@/types/user";
import type { Category } from "@/types/garment";
import type { AiLook, LookStyle } from "../../state/generator-store/useGeneratorStore";

// Generator domain types shared by the recommender hooks and views.
// Category, LookStyle and AiLook keep a single definition in
// useGeneratorStore; this module only composes them.

export const MOODS = [
  "relaxed",
  "cheerful",
  "professional",
  "active",
  "elegant",
] as const;

export type Mood = (typeof MOODS)[number];

// Minimized profile sent to the recommender (no body or contact data).
export type RecommenderProfile = Pick<
  UserProfile,
  "colorimetry" | "morphology" | "preferredFit" | "lifestyle"
>;

export interface GenerateLooksInput {
  garments: Garment[];
  profile: RecommenderProfile | null;
  style: LookStyle;
  forcedFavoritesIds?: string[];
  suggestedFavoriteIds?: string[];
}

export interface GenerateLooksResult {
  looks: AiLook[];
  isFallback: boolean;
}

export interface CombineLockedInput {
  garments: Garment[];
  profile: RecommenderProfile | null;
}

export interface CombineLockedResult {
  suggestions: Partial<Record<Category, string[]>>;
  firstLook: Partial<Record<Category, Garment>>;
  isFallback: boolean;
  fallbackIds: string[];
}
