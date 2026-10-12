import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Guards the PurgeCSS outcome (backlog #BKL-013): the global
// components/* layer was dead code — every component styles itself via
// CSS Modules. Re-adding those imports would ship unused CSS on every
// page, so this test fails if they come back.
const REMOVED_IMPORTS = [
  "layout/header",
  "layout/main",
  "components/button",
  "components/card",
  "components/dialog",
  "components/form",
  "components/navigation",
  "components/empty-state",
  "components/page-header",
  "components/action-bar",
  "components/notification",
  "components/icon-button",
  "components/avatar",
  "components/badge",
  "components/separator",
  "components/tooltip",
  "components/dropdown",
] as const;

describe("styles manifest", () => {
  it("does not import the removed dead global layers", () => {
    const dir = dirname(fileURLToPath(import.meta.url));
    const manifest = readFileSync(resolve(dir, "main.scss"), "utf-8");
    const reintroduced = REMOVED_IMPORTS.filter((name) =>
      manifest.includes(`@use '${name}'`),
    );
    expect(reintroduced).toEqual([]);
  });
});
