// Interaction-level a11y checks: touch target size (WCAG 2.5.8) and
// reduced-motion behavior. Runs when seeded auth exists; self-skips
// otherwise (same pattern as e2e/a11y.spec.ts).
import { expect, test, type Page } from "@playwright/test";
import { THEME_STORAGE_KEY } from "../src/constants/storage";
import { hasSeededAuth, SEEDED_AUTH_HELP } from "./seeded-auth";

const ROUTES = [
  "/es/generator",
  "/es/closet",
  "/es/calendar",
  "/es/profile",
  "/es/profile/onboarding",
] as const;

// WCAG 2.5.8 (AA): interactive targets must be at least 24x24 CSS px,
// with documented exceptions (inline, essential, user-agent default,
// or sufficient spacing). This test reports raw undersized targets so
// exceptions can be reviewed explicitly.
const MIN_TARGET_PX = 24;

const INTERACTIVE_SELECTOR = [
  "button",
  "a[href]",
  "input",
  "select",
  "textarea",
  '[role="button"]',
  '[role="link"]',
  '[role="tab"]',
  '[role="radio"]',
  '[role="checkbox"]',
  '[role="switch"]',
  '[role="option"]',
].join(", ");

interface UndersizedTarget {
  role: string | null;
  name: string | null;
  width: number;
  height: number;
  html: string;
}

async function collectUndersizedTargets(page: Page): Promise<{
  checked: number;
  undersized: UndersizedTarget[];
}> {
  return page.evaluate(
    ({ selector, min }) => {
      const round = (value: number) => Math.round(value * 10) / 10;
      const undersized: UndersizedTarget[] = [];
      let checked = 0;
      const candidates = Array.from(
        document.querySelectorAll<HTMLElement>(selector),
      );
      for (const element of candidates) {
        if (element.hasAttribute("disabled")) continue;
        if (element.getAttribute("aria-disabled") === "true") continue;
        if (element.getAttribute("aria-hidden") === "true") continue;
        const rect = element.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        // Skip offscreen elements (carousels, hidden sheets).
        if (rect.bottom < 0 || rect.top > window.innerHeight) continue;
        if (rect.right < 0 || rect.left > window.innerWidth) continue;
        checked += 1;
        if (rect.width < min || rect.height < min) {
          const clone = element.cloneNode(false) as HTMLElement;
          clone.removeAttribute("style");
          undersized.push({
            role: element.getAttribute("role"),
            name:
              element.getAttribute("aria-label") ??
              element.textContent?.trim().slice(0, 60) ??
              null,
            width: round(rect.width),
            height: round(rect.height),
            html: clone.outerHTML.slice(0, 200),
          });
        }
      }
      return { checked, undersized: undersized.slice(0, 15) };
    },
    { selector: INTERACTIVE_SELECTOR, min: MIN_TARGET_PX },
  );
}

interface MotionOffender {
  tag: string;
  animation: string;
  animationDuration: string;
  transitionDuration: string;
  html: string;
}

// With prefers-reduced-motion emulated, CSS animations/transitions
// should collapse to ~0 via the global fallback in
// src/styles/base/_reset.scss. Anything still animating above 50ms is
// reported. JS-driven motion (framer-motion) is covered separately by
// MotionConfig reducedMotion="user" and is not visible here.
async function collectMotionOffenders(page: Page): Promise<{
  checked: number;
  offenders: MotionOffender[];
}> {
  return page.evaluate(() => {
    const parseSeconds = (value: string): number[] =>
      value.split(",").map((part) => {
        const trimmed = part.trim();
        if (trimmed.endsWith("ms")) return parseFloat(trimmed) / 1000;
        return parseFloat(trimmed);
      });
    const offenders: MotionOffender[] = [];
    const elements = Array.from(document.querySelectorAll("*"));
    for (const element of elements) {
      const style = getComputedStyle(element);
      const names = style.animationName.split(",").map((part) => part.trim());
      const durations = parseSeconds(style.animationDuration);
      const transitionDurations = parseSeconds(style.transitionDuration);
      const maxTransition = Math.max(0, ...transitionDurations);
      const animated = names.some(
        (name, index) =>
          name !== "none" &&
          (durations[Math.min(index, durations.length - 1)] ?? 0) > 0.05,
      );
      // Only flag transitions when an animation is also running: plain
      // hover/focus transitions are transient and out of scope here.
      if (animated || (names.some((name) => name !== "none") && maxTransition > 0.05)) {
        const html = (element as HTMLElement).outerHTML.slice(0, 160);
        offenders.push({
          tag: element.tagName.toLowerCase(),
          animation: style.animationName.slice(0, 80),
          animationDuration: style.animationDuration.slice(0, 40),
          transitionDuration: style.transitionDuration.slice(0, 40),
          html,
        });
        if (offenders.length >= 15) break;
      }
    }
    return { checked: elements.length, offenders };
  });
}

test.describe("interaction accessibility", () => {
  test.beforeEach(async () => {
    test.skip(!hasSeededAuth(), SEEDED_AUTH_HELP);
  });

  for (const route of ROUTES) {
    test(`touch targets on ${route} meet 24px minimum`, async ({ page }) => {
      await page.addInitScript(
        ({ key, mode }) => {
          window.localStorage.setItem(key, mode);
        },
        { key: THEME_STORAGE_KEY, mode: "light" },
      );
      await page.goto(route, { waitUntil: "networkidle" });
      const { checked, undersized } = await collectUndersizedTargets(page);
      expect(
        undersized,
        `undersized targets on ${route} (${checked} checked): ${JSON.stringify(undersized, null, 2)}`,
      ).toEqual([]);
    });
  }

  for (const route of ROUTES) {
    test(`reduced motion collapses CSS animation on ${route}`, async ({
      page,
    }) => {
      await page.addInitScript(
        ({ key, mode }) => {
          window.localStorage.setItem(key, mode);
        },
        { key: THEME_STORAGE_KEY, mode: "light" },
      );
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(route, { waitUntil: "networkidle" });
      const { checked, offenders } = await collectMotionOffenders(page);
      expect(
        offenders,
        `animations surviving reduced-motion on ${route} (${checked} elements): ${JSON.stringify(offenders, null, 2)}`,
      ).toEqual([]);
    });
  }
});
