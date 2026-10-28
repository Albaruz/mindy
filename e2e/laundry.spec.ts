// Laundry flow E2E: wear a garment, open the basket, do the laundry.
// Runs when seeded auth exists (see e2e/auth.setup.ts); self-skips otherwise.
import { expect, test } from "@playwright/test";
import { hasSeededAuth, SEEDED_AUTH_HELP } from "./seeded-auth";
import { mockCloset } from "./mock-closet";

test.describe("laundry", () => {
  test.beforeEach(async () => {
    test.skip(!hasSeededAuth(), SEEDED_AUTH_HELP);
  });

  test("washing fixture garments empties the laundry basket", async ({ page }) => {
    await mockCloset(page, true);
    await page.goto("/es/closet");
    await page.getByRole("button", { name: /cesto \(sucia\)/i }).click();
    await expect(page.locator("article").first()).toBeVisible({
      timeout: 15_000,
    });

    // Wash everything and expect the empty-basket state.
    await page.getByRole("button", { name: /lavar todo el cesto/i }).click();
    await expect(
      page.getByText("Huele a rosas por aquí. Tu cesto está inmaculado."),
    ).toBeVisible({ timeout: 30_000 });
  });
});
