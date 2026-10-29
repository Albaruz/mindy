// Onboarding wizard E2E: identity -> measurements -> preferences -> success.
// Runs when seeded auth exists (see e2e/auth.setup.ts); self-skips otherwise.
import { expect, test } from "@playwright/test";
import { hasSeededAuth, SEEDED_AUTH_HELP } from "./seeded-auth";

test.describe("onboarding wizard", () => {
  test.beforeEach(async () => {
    test.skip(!hasSeededAuth(), SEEDED_AUTH_HELP);
  });

  test("walks the 6 steps and reaches the success screen", async ({
    page,
  }) => {
    // The seeded account may already have completed onboarding. Explicitly
    // reopen the wizard so this flow is stable for both new and existing users.
    await page.goto("/es/profile/onboarding?edit=true");

    // Step 1: display name (only free-text input in the wizard).
    await expect(page.getByRole("progressbar")).toBeVisible();
    await page.locator("#displayName").fill("E2E Tester");
    await page.getByRole("button").last().click();

    // Step 2: identity (section + style tribe).
    await expect(page.getByRole("radiogroup").first()).toBeVisible();
    await page
      .getByRole("radiogroup")
      .first()
      .getByRole("radio")
      .first()
      .check({ force: true });
    const styleLabels = page.locator('label:has(input[name="style"])');
    await styleLabels.first().click();
    await page.getByRole("button").last().click();

    // Step 3: lifestyle.
    await expect(page.getByRole("radiogroup").first()).toBeVisible();
    const lifestyleLabels = page.locator('label:has(input[name="lifestyle"])');
    await lifestyleLabels.first().click();
    await page.getByRole("button").last().click();

    // Step 4: measurements + fit picker.
    await expect(page.locator("#chestCm")).toBeVisible();
    await page.locator('label:has(input[name="fit"])').first().click();
    await page.getByRole("button").last().click();

    // Step 5: colorimetry swatches (skin, eyes, jewelry).
    await expect(page.getByRole("radiogroup").first()).toBeVisible();
    for (const group of await page.getByRole("radiogroup").all()) {
      await group.getByRole("radio").first().check();
    }
    await page.getByRole("button").last().click();

    // Step 6: fine tuning, then save (armed after a short delay).
    await expect(page.locator("#thermal")).toBeVisible();
    const saveButton = page.getByRole("button", { name: /./ }).last();
    await expect
      .poll(async () => saveButton.isEnabled(), { timeout: 10_000 })
      .toBe(true);
    await saveButton.click();

    // Success celebration with a CTA into the closet.
    const closetButton = page.getByRole("button", { name: "Ver mi armario" });
    await expect(closetButton).toBeVisible({ timeout: 15_000 });
    await closetButton.click();
    await expect(page).toHaveURL(/\/es\/closet/);
  });
});
