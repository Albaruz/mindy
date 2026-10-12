// Generator flows E2E: auto, manual and wear-today celebration.
// Runs when seeded auth exists (see e2e/auth.setup.ts); self-skips otherwise.
import { expect, test } from "@playwright/test";
import { hasSeededAuth, SEEDED_AUTH_HELP } from "./seeded-auth";

test.describe("generator", () => {
  test.beforeEach(async () => {
    test.skip(!hasSeededAuth(), SEEDED_AUTH_HELP);
  });

  test("auto flow: select style then showcase appears", async ({ page }) => {
    await page.route("**/api/recommender", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          looks: [
            { id: "look-1", garments: [] },
            { id: "look-2", garments: [] },
          ],
        }),
      });
    });

    await page.goto("/es/generator");
    await expect(page.getByTestId("generator-zero-state")).toBeVisible();

    // Enter the auto flow (first action button) and pick a style.
    await page.getByTestId("generator-zero-state").getByRole("button").first().click();
    await expect(page.getByTestId("generator-auto-select")).toBeVisible();
    await page.getByRole("radio", { name: /./ }).first().check();
    await page.getByTestId("generator-auto-select").getByRole("button").first().click();

    await expect(page.getByTestId("generator-showcase")).toBeVisible({
      timeout: 30_000,
    });
  });

  test("manual flow: carousels are visible", async ({ page }) => {
    await page.goto("/es/generator");
    await expect(page.getByTestId("generator-zero-state")).toBeVisible();
    await page.getByTestId("generator-zero-state").getByRole("button").nth(1).click();
    await expect(page.getByTestId("generator-manual")).toBeVisible({
      timeout: 30_000,
    });
  });

  test("wear-today flow asserts the celebration dialog", async ({ page }) => {
    await page.route("**/api/recommender", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ looks: [{ id: "look-1", garments: [] }] }),
      });
    });

    await page.goto("/es/generator");
    await expect(page.getByTestId("generator-zero-state")).toBeVisible();
    await page.getByTestId("generator-zero-state").getByRole("button").first().click();
    await page.getByRole("radio", { name: /./ }).first().check();
    await page.getByTestId("generator-auto-select").getByRole("button").first().click();
    await expect(page.getByTestId("generator-showcase")).toBeVisible({
      timeout: 30_000,
    });

    // Wear the active look and expect the celebration overlay.
    await page.getByTestId("generator-showcase").getByRole("button").first().click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 30_000 });
  });
});
