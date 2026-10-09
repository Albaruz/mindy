// Auth bootstrap for seeded E2E runs (skipped by default).
// Stores an authenticated storageState via email/password so specs can
// run against a seeded user. Requires env:
// TEST_USER_EMAIL and TEST_USER_PASSWORD.
// Referenced by specs in comments only; no project consumes it yet.
// Run once with:
// TEST_USER_EMAIL=... TEST_USER_PASSWORD=... pnpm exec playwright test --project=setup e2e/auth.setup.ts
import { test as setup } from "@playwright/test";
import path from "node:path";

const STORAGE_STATE_PATH = path.join(__dirname, ".auth", "user.json");

// TODO: wire a "setup" project in playwright.config.ts using this file as
// testMatch and consuming STORAGE_STATE_PATH via use.storageState.
setup("authenticate with seeded user", async ({ page }) => {
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;
  setup.skip(
    email === undefined || password === undefined,
    "TODO: set TEST_USER_EMAIL and TEST_USER_PASSWORD for seeded auth",
  );

  await page.goto("/es");
  await page.locator('input[type="email"]').fill(email as string);
  await page.locator('input[type="password"]').first().fill(password as string);
  await page.getByRole("button", { name: /./ }).last().click();
  await page.waitForURL(/\/es\/(generator|profile\/onboarding)/, {
    timeout: 30_000,
  });
  await page.context().storageState({ path: STORAGE_STATE_PATH });
});
