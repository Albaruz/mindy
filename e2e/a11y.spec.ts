// Accessibility audit E2E with axe on key routes (WCAG 2.2 AA).
// Runs when seeded auth exists (see e2e/auth.setup.ts with
// TEST_USER_EMAIL/TEST_USER_PASSWORD); self-skips at runtime otherwise.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { THEME_STORAGE_KEY } from "../src/constants/storage";
import { hasSeededAuth, SEEDED_AUTH_HELP } from "./seeded-auth";

const ROUTES = [
  "/es/generator",
  "/es/closet",
  "/es/calendar",
  "/es/profile",
  "/es/profile/onboarding",
  "/es/forgot-password",
  "/es/reset-password",
] as const;
const THEMES = ["light", "dark"] as const;
type Theme = (typeof THEMES)[number];

async function applyTheme(page: Page, theme: Theme) {
  await page.addInitScript(
    ({ key, mode }) => {
      window.localStorage.setItem(key, mode);
    },
    { key: THEME_STORAGE_KEY, mode: theme },
  );
}

async function collectAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
    .analyze();

  return results.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    help: violation.help,
    nodes: violation.nodes.slice(0, 10).map((node) => ({
      target: node.target,
      html: node.html,
      failureSummary: node.failureSummary,
    })),
    totalNodes: violation.nodes.length,
  }));
}

async function expectNoAxeViolations(page: Page, context: string) {
  const diagnostics = await collectAxeViolations(page);
  expect(
    diagnostics,
    `axe violations ${context}: ${JSON.stringify(diagnostics, null, 2)}`,
  ).toEqual([]);
}

test.describe("accessibility", () => {
  test.beforeEach(async () => {
    test.skip(!hasSeededAuth(), SEEDED_AUTH_HELP);
  });

  for (const route of ROUTES) {
    for (const theme of THEMES) {
      test(`has no axe violations on ${route} in ${theme} theme`, async ({
        page,
      }) => {
        await applyTheme(page, theme);
        await page.goto(route, { waitUntil: "networkidle" });
        await expectNoAxeViolations(page, `on ${route} (${theme} theme)`);
      });
    }
  }

  for (const theme of THEMES) {
    test(`closet add-garment dialog passes axe and traps keyboard focus in ${theme} theme`, async ({
      page,
    }) => {
      await applyTheme(page, theme);
      await page.goto("/es/closet", { waitUntil: "networkidle" });

      const trigger = page.locator('button[aria-controls="add-garment-sheet"]');
      await trigger.focus();
      await page.keyboard.press("Enter");

      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      const options = dialog.getByRole("button");
      const firstOption = options.first();
      const lastOption = options.last();
      await expect(firstOption).toBeFocused();

      await expectNoAxeViolations(
        page,
        `in closet add-garment dialog (${theme} theme)`,
      );

      await page.keyboard.press("Shift+Tab");
      await expect(lastOption).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(firstOption).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
      await expect(trigger).toBeFocused();
    });

    test(`closet edit and delete dialogs pass axe in ${theme} theme`, async ({
      page,
    }) => {
      await applyTheme(page, theme);
      await page.goto("/es/closet", { waitUntil: "networkidle" });

      const firstGarment = page.locator("article").first();
      const editButton = firstGarment.getByRole("button", {
        name: /editar/i,
      });
      await editButton.click();
      const editDialog = page.getByRole("dialog");
      await expect(editDialog).toBeVisible();
      await expectNoAxeViolations(
        page,
        `in closet edit dialog (${theme} theme)`,
      );
      await page.keyboard.press("Escape");
      await expect(editDialog).toBeHidden();
      await expect(editButton).toBeFocused();

      const deleteButton = firstGarment.getByRole("button", {
        name: /eliminar/i,
      });
      await deleteButton.click();
      const confirmation = page.getByRole("alertdialog");
      await expect(confirmation).toBeVisible();
      await expectNoAxeViolations(
        page,
        `in closet delete confirmation (${theme} theme)`,
      );
      await page.keyboard.press("Escape");
      await expect(confirmation).toBeHidden();
      await expect(deleteButton).toBeFocused();
    });

  }
});
