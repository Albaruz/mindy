// Onboarding wizard E2E: identity -> measurements -> preferences -> success.
// TODO: enable once seeded auth exists (see e2e/auth.setup.ts with
// TEST_USER_EMAIL/TEST_USER_PASSWORD); skipped by default.
import { expect, test } from "@playwright/test";

test.describe("onboarding wizard", () => {
  test.skip(true, "TODO: requires seeded auth bootstrap (e2e/auth.setup.ts)");

  test("walks the 5 steps and reaches the success screen", async ({
    page,
  }) => {
    await page.goto("/es/profile/onboarding");

    // Step 1: display name (only free-text input in the wizard).
    await expect(page.getByRole("progressbar")).toBeVisible();
    await page.locator("#displayName").fill("E2E Tester");
    await page.getByRole("button").last().click();

    // Step 2: identity (section + style tribe radios).
    await expect(page.getByRole("radiogroup").first()).toBeVisible();
    await page.getByRole("radio", { name: /./ }).first().check();
    await page.getByRole("radio", { name: /./ }).nth(3).check();
    await page.getByRole("button").last().click();

    // Step 3: measurements + fit picker.
    await expect(page.locator("#chestCm")).toBeVisible();
    await page.getByRole("radio", { name: /./ }).first().check();
    await page.getByRole("button").last().click();

    // Step 4: colorimetry swatches (skin, eyes, jewelry).
    await expect(page.getByRole("radiogroup").first()).toBeVisible();
    for (const group of await page.getByRole("radiogroup").all()) {
      await group.getByRole("radio").first().check();
    }
    await page.getByRole("button").last().click();

    // Step 5: fine tuning, then save (armed after a short delay).
    await expect(page.locator("#thermal")).toBeVisible();
    const saveButton = page.getByRole("button", { name: /./ }).last();
    await expect
      .poll(async () => saveButton.isEnabled(), { timeout: 10_000 })
      .toBe(true);
    await saveButton.click();

    // Success celebration with a CTA into the closet.
    await expect(page.getByRole("img")).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button").last().click();
    await expect(page).toHaveURL(/\/es\/closet/);
  });
});
