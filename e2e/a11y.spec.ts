// Accessibility audit E2E with axe on key routes (WCAG 2.2 AA).
// Runs when seeded auth exists (see e2e/auth.setup.ts with
// TEST_USER_EMAIL/TEST_USER_PASSWORD); self-skips at runtime otherwise.
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
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

test.describe("accessibility", () => {
  test.beforeEach(async () => {
    test.skip(!hasSeededAuth(), SEEDED_AUTH_HELP);
  });

  for (const route of ROUTES) {
    for (const theme of THEMES) {
      test(`has no axe violations on ${route} in ${theme} theme`, async ({
        page,
      }) => {
        await page.addInitScript(
          ({ key, mode }) => {
            window.localStorage.setItem(key, mode);
          },
          { key: THEME_STORAGE_KEY, mode: theme },
        );
        await page.goto(route, { waitUntil: "networkidle" });
        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
          .analyze();
        const diagnostics = results.violations.map((violation) => ({
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
        expect(
          diagnostics,
          `axe violations on ${route} (${theme} theme): ${JSON.stringify(diagnostics, null, 2)}`,
        ).toEqual([]);
      });
    }
  }
});
