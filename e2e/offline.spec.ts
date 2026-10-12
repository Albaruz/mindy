import { expect, test } from "@playwright/test";
import { hasSeededAuth, SEEDED_AUTH_HELP } from "./seeded-auth";

// Offline PWA behavior: without connectivity the closet keeps serving the
// persisted cache and weather-dependent copy falls back to neutral.
// Requires seeded auth bootstrap (e2e/auth.setup.ts).
test.beforeEach(async () => {
  test.skip(!hasSeededAuth(), SEEDED_AUTH_HELP);
});

test("offline closet serves persisted cache", async ({ page, context }) => {
  await page.goto("/es/closet");
  await expect(page.getByTestId("closet-grid")).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByTestId("closet-grid")).toBeVisible();
});

test("offline generator shows neutral greeting", async ({
  page,
  context,
}) => {
  await context.setOffline(true);
  await page.goto("/es/generator");
  await expect(page.getByTestId("generator-zero-state")).toBeVisible();
});
