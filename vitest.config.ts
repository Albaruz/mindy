import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  // Explicit alias: tsconfig excludes test files, so tsconfig-based path
  // resolution would not apply to them (vi.mock("@/...") would miss).
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: ["node_modules", ".next", "playwright-report", "test-results"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/**/*.d.ts",
        "src/**/*.module.scss",
        "**/*.config.{ts,js,mjs}",
        "src/app/layout.tsx",
        // Next.js route segments are thin composition layers covered by
        // Playwright E2E (mobile, es). Unit-testing them adds brittleness
        // without signal; API Route Handlers stay included (see route.test).
        "src/app/**/page.tsx",
        "src/app/**/layout.tsx",
        "src/app/**/loading.tsx",
        "src/app/**/error.tsx",
        "src/app/**/not-found.tsx",
        "src/app/__art-preview/**",
        ".next/**",
      ],
      thresholds: {
        lines: 90,
        branches: 90,
        functions: 90,
        statements: 90,
      },
    },
  },
});
