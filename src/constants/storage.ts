// Storage & Supabase Identifiers
// Single source of truth for table and bucket names, local Supabase
// fallbacks, and browser persistence keys.
//
// Two intentional exceptions (do not "fix"):
// - SQL migrations pin their own copies: renaming a table or bucket
//   requires a matching migration.
// - NEXT_PUBLIC_* env names stay literal at call sites: Next.js only
//   inlines statically analyzable process.env.X access, so dynamic
//   process.env[KEY] lookups would break client-side config. Only the
//   fallback strings are centralized here.

// Supabase tables (see supabase/migrations).
export const TABLES = {
  profiles: "profiles",
  garments: "garments",
  outfitHistory: "outfit_history",
  garmentFeedback: "garment_feedback",
} as const;

/** Owner column used by RLS policies and every user-scoped query. */
export const USER_ID_COLUMN = "user_id";

// Supabase Storage buckets.
export const STORAGE_BUCKETS = {
  garments: "garments",
} as const;

// Local Supabase (supabase start) fallbacks for missing env config.
export const SUPABASE_URL_FALLBACK = "http://localhost:54321";
export const SUPABASE_ANON_FALLBACK = "anon-placeholder";

// Browser persistence keys.
export const THEME_STORAGE_KEY = "mindy-theme-mode";
export const PERSISTED_CACHE_KEY = "mindy-query-cache";