// Generator flows E2E: auto, manual and wear-today celebration.
// Runs when seeded auth exists (see e2e/auth.setup.ts); self-skips otherwise.
import { expect, test, type Page } from "@playwright/test";
import { hasSeededAuth, SEEDED_AUTH_HELP } from "./seeded-auth";
import { mockCloset } from "./mock-closet";

async function mockRecommender(page: Page, optionCount: number) {
  await page.route("**/api/recommender", async (route) => {
    const payload = route.request().postDataJSON() as {
      garments?: { garmentId?: unknown }[];
    };
    const garmentIds = (payload.garments ?? []).flatMap(({ garmentId }) =>
      typeof garmentId === "string" ? [garmentId] : [],
    );

    const options = Array.from({ length: optionCount }, (_, index) => ({
      garmentIds,
      reason: `Test look ${index + 1}`,
      suitabilityRatio: 1,
    }));
    const stream = [
      ...options.map((option) => ({ type: "preview", option })),
      { type: "complete", payload: { options } },
    ]
      .map((event) => `data: ${JSON.stringify(event)}\n\n`)
      .join("");
    await route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body: stream,
    });
  });
}

test.describe("generator", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!hasSeededAuth(), SEEDED_AUTH_HELP);
    await mockCloset(page);
  });

  test("auto flow: select style then showcase appears", async ({ page }) => {
    await mockRecommender(page, 2);

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
    await mockRecommender(page, 1);

    await page.goto("/es/generator");
    await expect(page.getByTestId("generator-zero-state")).toBeVisible();
    await page.getByTestId("generator-zero-state").getByRole("button").first().click();
    await page.getByRole("radio", { name: /./ }).first().check();
    await page.getByTestId("generator-auto-select").getByRole("button").first().click();
    await expect(page.getByTestId("generator-showcase")).toBeVisible({
      timeout: 30_000,
    });

    // Wear the active look and expect the celebration overlay.
    await page
      .getByRole("button", { name: /me lo pongo hoy/i })
      .click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 30_000 });
  });
});
