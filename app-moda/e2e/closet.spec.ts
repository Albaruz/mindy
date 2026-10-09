// Closet upload flow E2E with a stubbed analyze endpoint.
// TODO: enable once seeded auth exists (see e2e/auth.setup.ts with
// TEST_USER_EMAIL/TEST_USER_PASSWORD); skipped by default.
import { expect, test } from "@playwright/test";

test.describe("closet upload", () => {
  test.skip(true, "TODO: requires seeded auth bootstrap (e2e/auth.setup.ts)");

  test("stubs bg-removal analysis and shows the garment card", async ({
    page,
  }) => {
    await page.route("**/api/analyze", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          garmentType: "top",
          color: "blue",
          season: "all",
          material: "cotton",
          style: "casual",
          cutLength: "regular",
          extraTags: {},
        }),
      });
    });

    await page.goto("/es/closet");

    // Open the add-garment sheet (stable aria wiring on the FAB).
    await page.locator('button[aria-controls="add-garment-sheet"]').click();
    await expect(page.getByRole("dialog")).toBeVisible();

    // Upload a 1px PNG through the file input.
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64",
    );
    await page
      .locator('input[type="file"][accept="image/*"]')
      .first()
      .setInputFiles({ name: "tee.png", mimeType: "image/png", buffer: png });

    // A garment card appears once the stubbed analysis resolves.
    await expect(page.locator("article").first()).toBeVisible({
      timeout: 30_000,
    });
  });
});
