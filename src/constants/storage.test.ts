// Unit tests for storage identifiers and persistence keys.
import { describe, expect, it } from "vitest";
import {
  PERSISTED_CACHE_KEY,
  STORAGE_BUCKETS,
  SUPABASE_ANON_FALLBACK,
  SUPABASE_URL_FALLBACK,
  TABLES,
  THEME_STORAGE_KEY,
  USER_ID_COLUMN,
} from "./storage";

describe("storage constants", () => {
  it("exposes table names", () => {
    expect(TABLES).toEqual({
      profiles: "profiles",
      garments: "garments",
      outfitHistory: "outfit_history",
      garmentFeedback: "garment_feedback",
    });
  });

  it("exposes the owner column", () => {
    expect(USER_ID_COLUMN).toBe("user_id");
  });

  it("exposes storage buckets", () => {
    expect(STORAGE_BUCKETS).toEqual({ garments: "garments" });
  });

  it("exposes local fallbacks and persistence keys", () => {
    expect(SUPABASE_URL_FALLBACK).toBe("http://localhost:54321");
    expect(SUPABASE_ANON_FALLBACK).toBe("anon-placeholder");
    expect(THEME_STORAGE_KEY).toBe("mindy-theme-mode");
    expect(PERSISTED_CACHE_KEY).toBe("mindy-query-cache");
  });
});
