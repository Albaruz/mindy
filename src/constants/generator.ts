// Generator Business Rules
// Single source of truth for look-generation caps shared by the client
// hooks and mirrored by the server route.

// Maximum outfit options returned per generation. The server caps its
// response identically; the client re-caps defensively.
export const MAX_LOOK_OPTIONS = 3;

// Auto-mode rejection budget: at most 4 left-swipes per generation
// before the limit empty state takes over.
export const MAX_DISCARD_COUNT = 4;

// Infinite carousel loop needs at least 3 slides to duplicate cleanly.
export const CAROUSEL_LOOP_MIN_SLIDES = 3;

// Auto-generated looks need the three core outfit categories. A dress or
// jumpsuit may cover both top and bottom; outerwear remains optional.
export const REQUIRED_GENERATOR_CATEGORIES = ["top", "bottom", "footwear"] as const;

// Closed vocabulary for the weather context used by both generator modes.
export const OUTFIT_DAY_VALUES = ["today", "tomorrow"] as const;

// Recommender server limits (src/lib/recommender).
// Token-budget cap for the garments sent to the LLM, with a soft cap per
// category so one family cannot eat the whole budget.
export const RECOMMENDER_MAX_GARMENTS = 60;
export const RECOMMENDER_MAX_PER_CATEGORY = 15;

// Hard request-size guard: more garments than this is a 413.
export const RECOMMENDER_MAX_REQUEST_GARMENTS = 200;

// Suitability ratios of the local fallback options, best first.
export const RECOMMENDER_FALLBACK_RATIOS = [60, 55, 50] as const;
