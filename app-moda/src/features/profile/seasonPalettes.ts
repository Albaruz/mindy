import type { Colorimetry } from "@/types/user";

// Five flat swatches per seasonal palette for the colorimetry bento card.
// Warm seasons lean terracotta/gold, cool seasons lean blue/rose.
export const SEASON_PALETTES: Record<Colorimetry, readonly string[]> = {
  spring: ["#f6d8a8", "#f2b880", "#e88ca0", "#9cbe8f", "#7fb3b0"],
  summer: ["#c9d4e0", "#a8b8c8", "#d8a7b1", "#b5c4b1", "#8fa3bf"],
  autumn: ["#c87966", "#a65a3a", "#d9a441", "#6b7f3e", "#5a3b2e"],
  winter: ["#1f2937", "#b3261e", "#1d4ed8", "#e8e8e8", "#0f766e"],
};
