import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Layering (see docs/ARCHITECTURE.md): features are isolated business
// domains. Shared code lives in lib/, stores/, constants/ and types/. The only
// cross-feature imports allowed are the data hooks below, which other
// domains legitimately read or trigger (closet data, profile, laundry).
const FEATURES = ["closet", "generator", "history", "onboarding", "profile", "settings"];
const SHARED_DATA_HOOKS = [
  "@/features/closet/useClosetQuery",
  "@/features/profile/useProfileQuery",
  "@/features/profile/useDoLaundry",
];

const featureIsolation = FEATURES.map((feature) => ({
  files: [`src/features/${feature}/**/*.{ts,tsx}`],
  ignores: ["**/*.test.{ts,tsx}"],
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: [
              ...FEATURES.filter((other) => other !== feature).map(
                (other) => `@/features/${other}/*`,
              ),
              ...SHARED_DATA_HOOKS.map((hook) => `!${hook}`),
            ],
            message:
              "Features must not import other features. Move shared code to lib/, stores/, constants/ or types/.",
          },
        ],
      },
    ],
  },
}));

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  ...featureIsolation,
  {
    files: ["src/components/**/*.{ts,tsx}", "src/lib/**/*.{ts,tsx}", "src/stores/**/*.{ts,tsx}"],
    ignores: ["**/*.test.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/features/*"],
              message: "components/, lib/ and stores/ are feature-agnostic.",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Artefactos generados por next-pwa (código minificado de terceros):
    "public/sw.js",
    "public/workbox-*.js",
  ]),
]);

export default eslintConfig;
