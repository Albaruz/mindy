// Laundry flow E2E: wear a garment, open the basket, do the laundry.
// TODO: enable once seeded auth exists (see e2e/auth.setup.ts with
// TEST_USER_EMAIL/TEST_USER_PASSWORD); skipped by default.
import { expect, test } from "@playwright/test";

test.describe("laundry", () => {
  test.skip(true, "TODO: requires seeded auth bootstrap (e2e/auth.setup.ts)");

  test("wear then basket then do-laundry empties the basket", async ({
    page,
  }) => {
    await page.goto("/es/generator");

    // Wear the active look when a showcase is present.
    await expect(page.getByTestId("generator-zero-state")).toBeVisible();
    await page.getByTestId("generator-zero-state").getByRole("button").first().click();
    await expect(page.getByTestId("generator-auto-select")).toBeVisible();
    await page.getByRole("radio", { name: /./ }).first().check();
    await page.getByTestId("generator-auto-select").getByRole("button").first().click();
    await expect(page.getByTestId("generator-showcase")).toBeVisible({
      timeout: 30_000,
    });
    await page.getByTestId("generator-showcase").getByRole("button").first().click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 30_000 });
    await page.keyboard.press("Escape");

    // Open the laundry basket (dirty inventory view) in the closet.
    await page.goto("/es/closet");
    const basketTab = page.getByRole("radio", { name: /./ }).nth(1);
    await basketTab.check();
    await expect(page.locator("article").first()).toBeVisible({
      timeout: 15_000,
    });

    // Wash everything and expect the empty-basket state.
    await page.getByRole("button", { name: /./ }).last().click();
    await expect(page.getByText(/./).first()).toBeVisible({ timeout: 30_000 });
  });
});
