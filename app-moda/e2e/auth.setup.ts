// Auth bootstrap for seeded E2E runs.
// Stores an authenticated storageState via email/password so specs can
// run against a seeded user. Requires env:
// TEST_USER_EMAIL and TEST_USER_PASSWORD.
// Wired as the "setup" project in playwright.config.ts; the "mobile"
// project depends on it and consumes STORAGE_STATE_PATH.
// Run once with:
// TEST_USER_EMAIL=... TEST_USER_PASSWORD=... pnpm exec playwright test --project=setup e2e/auth.setup.ts
import { test as setup } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { STORAGE_STATE_PATH } from "./seeded-auth";

function writeEmptyState(): void {
  mkdirSync(path.dirname(STORAGE_STATE_PATH), { recursive: true });
  writeFileSync(
    STORAGE_STATE_PATH,
    JSON.stringify({ cookies: [], origins: [] }),
  );
}

setup("authenticate with seeded user", async ({ page }) => {
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;
  const missingCredentials =
    email === undefined ||
    email.trim() === "" ||
    password === undefined ||
    password === "";
  if (missingCredentials) {
    // Always leave a (empty) state file so dependent projects do not fail
    // on a missing file; specs self-skip at runtime via hasSeededAuth().
    writeEmptyState();
    setup.skip(
      true,
      "set TEST_USER_EMAIL and TEST_USER_PASSWORD for seeded auth",
    );
    return;
  }

  await page.goto("/es");
  const form = page.locator("form").first();
  await form.locator('input[type="email"]').fill(email);
  await form.locator('input[type="password"]').fill(password);
  await form.locator('button[type="submit"]').click();

  const authError = page.getByRole("alert");
  const outcome = await Promise.race([
    page
      .waitForURL(/\/es\/(generator|profile\/onboarding)/, { timeout: 30_000 })
      .then(() => "redirect" as const),
    authError
      .waitFor({ state: "visible", timeout: 30_000 })
      .then(() => "error" as const),
  ]);
  if (outcome === "error") {
    throw new Error(`Seeded E2E login failed: ${await authError.innerText()}`);
  }

  await page.context().storageState({ path: STORAGE_STATE_PATH });
});
