// Shared seeded-auth helper for E2E specs.
// Specs skip at runtime (not collection time) when no authenticated
// storageState exists, so the "setup" project can create it first in CI.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export const STORAGE_STATE_PATH = path.join(__dirname, ".auth", "user.json");

export const SEEDED_AUTH_HELP =
  "requires seeded auth: run e2e/auth.setup.ts with TEST_USER_EMAIL/TEST_USER_PASSWORD";

export function hasSeededAuth(): boolean {
  try {
    if (!existsSync(STORAGE_STATE_PATH)) return false;
    const raw = readFileSync(STORAGE_STATE_PATH, "utf-8");
    if (raw.length < 32) return false;
    const state = JSON.parse(raw) as {
      cookies?: unknown[];
      origins?: unknown[];
    };
    return (
      (Array.isArray(state.cookies) && state.cookies.length > 0) ||
      (Array.isArray(state.origins) && state.origins.length > 0)
    );
  } catch {
    return false;
  }
}
