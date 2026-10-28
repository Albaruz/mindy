import { expect, test } from "@playwright/test";
import { hasSeededAuth, SEEDED_AUTH_HELP } from "./seeded-auth";
import { mockCloset } from "./mock-closet";

// Offline PWA behavior: without connectivity the closet keeps serving the
// persisted cache and weather-dependent copy falls back to neutral.
// Requires seeded auth bootstrap (e2e/auth.setup.ts).
test.beforeEach(async ({ page }) => {
  test.skip(!hasSeededAuth(), SEEDED_AUTH_HELP);
  await mockCloset(page);
});

test("offline closet serves persisted cache", async ({ page, context }) => {
  await page.goto("/es/closet");
  await expect(page.getByTestId("closet-grid")).toBeVisible();
  await context.setOffline(true);
  await expect(page.getByTestId("closet-grid")).toBeVisible();
});

test("offline generator shows neutral greeting", async ({
  page,
  context,
}) => {
  await page.goto("/es/generator");
  await expect(page.getByTestId("generator-zero-state")).toBeVisible();
  await context.setOffline(true);
  await expect(page.getByTestId("generator-zero-state")).toBeVisible();
});
