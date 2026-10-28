// Visual regression coverage for stable product entry points and the closet
// add-garment dialog. Baselines are intentionally mobile-first (Pixel 7).
import { expect, test, type Page } from "@playwright/test";
import { THEME_STORAGE_KEY } from "../src/constants/storage";
import { hasSeededAuth, SEEDED_AUTH_HELP } from "./seeded-auth";
import { mockCloset } from "./mock-closet";

const THEMES = ["light", "dark"] as const;
const PAGE_CASES = [
  { name: "generator", route: "/es/generator" },
  { name: "closet", route: "/es/closet" },
  { name: "profile", route: "/es/profile" },
] as const;

async function applyTheme(page: Page, theme: (typeof THEMES)[number]) {
  await page.addInitScript(
    ({ key, mode }) => window.localStorage.setItem(key, mode),
    { key: THEME_STORAGE_KEY, mode: theme },
  );
}

async function expectPageReady(page: Page, name: (typeof PAGE_CASES)[number]["name"]) {
  await expect(
    page.getByRole("navigation", { name: "Navegación principal" }),
  ).toBeVisible();

  if (name === "generator") {
    await expect(page.getByTestId("generator-zero-state")).toBeVisible();
  } else if (name === "closet") {
    await expect(
      page.locator('button[aria-controls="add-garment-sheet"]'),
    ).toBeVisible();
  } else {
    await expect(page.locator("main").getByRole("heading", { level: 1 })).toBeVisible();
  }
}

test.describe("visual regression", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!hasSeededAuth(), SEEDED_AUTH_HELP);
    await mockCloset(page);
  });

  for (const { name, route } of PAGE_CASES) {
    for (const theme of THEMES) {
      test(`${name} matches the ${theme} baseline`, async ({ page }) => {
        await applyTheme(page, theme);
        await page.goto(route, { waitUntil: "networkidle" });
        await expectPageReady(page, name);

        await expect(page).toHaveScreenshot(`${name}-${theme}.png`, {
          fullPage: true,
        });
      });
    }
  }

  for (const theme of THEMES) {
    test(`closet add-garment dialog matches the ${theme} baseline`, async ({
      page,
    }) => {
      await applyTheme(page, theme);
      await page.goto("/es/closet", { waitUntil: "networkidle" });

      const trigger = page.locator('button[aria-controls="add-garment-sheet"]');
      await expect(trigger).toBeVisible();
      await trigger.click();
      await expect(page.getByRole("dialog")).toBeVisible();

      await expect(page).toHaveScreenshot(`closet-add-dialog-${theme}.png`, {
        fullPage: true,
      });
    });
  }
});
