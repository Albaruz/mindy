// Shared seeded-auth helper for E2E specs. Specs skip locally without an
// authenticated storageState; CI fails instead of reporting skipped coverage.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export const STORAGE_STATE_PATH = path.join(__dirname, ".auth", "user.json");

export const SEEDED_AUTH_HELP =
  "requires seeded auth: run e2e/auth.setup.ts with test credentials and Supabase configuration";

export function hasSeededAuth(): boolean {
  try {
    if (!existsSync(STORAGE_STATE_PATH)) return false;
    const raw = readFileSync(STORAGE_STATE_PATH, "utf-8");
    if (raw.length < 32) return false;
    const state = JSON.parse(raw) as {
      cookies?: unknown[];
      origins?: unknown[];
    };
    const hasAuth = (
      (Array.isArray(state.cookies) && state.cookies.length > 0) ||
      (Array.isArray(state.origins) && state.origins.length > 0)
    );
    if (process.env.CI && !hasAuth) {
      throw new Error("Seeded E2E authentication is required in CI.");
    }
    return hasAuth;
  } catch (error) {
    if (process.env.CI) {
      throw error;
    }
    return false;
  }
}
