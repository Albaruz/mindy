// Accessibility audit E2E with axe on key routes.
// TODO: enable once seeded auth exists (see e2e/auth.setup.ts with
// TEST_USER_EMAIL/TEST_USER_PASSWORD); skipped by default.
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const ROUTES = [
  "/es/generator",
  "/es/closet",
  "/es/profile/onboarding",
] as const;

test.describe("accessibility", () => {
  test.skip(true, "TODO: requires seeded auth bootstrap (e2e/auth.setup.ts)");

  for (const route of ROUTES) {
    test(`has no serious/critical axe violations on ${route}`, async ({
      page,
    }) => {
      await page.goto(route);
      const results = await new AxeBuilder({ page }).analyze();
      const blocking = results.violations.filter(
        (violation) =>
          violation.impact === "serious" || violation.impact === "critical",
      );
      expect(
        blocking.map((violation) => violation.id),
        `axe violations on ${route}`,
      ).toEqual([]);
    });
  }
});
