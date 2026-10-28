// eslint-disable-next-line @typescript-eslint/no-require-imports
const createNextIntlPlugin = require("next-intl/plugin");
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// eslint-disable-next-line @typescript-eslint/no-require-imports
const withPWA = require("next-pwa")({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  // The ONNX background-removal WASM (~24 MB) is fetched on demand at
  // runtime, never precached: bundling it into the install payload would
  // stall the PWA install for an optional feature. Excluding it here just
  // silences workbox's oversize-asset warning; behavior is unchanged.
  buildExcludes: [/ort-wasm-.*\.wasm$/],
  runtimeCaching: [
    {
      // Processed garment photos: usable offline once seen.
      urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "garment-images",
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 30 * 24 * 60 * 60,
        },
      },
    },
  ],
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

// This identifier is public client metadata, not a credential. Prefer the
// hosting platform's immutable commit SHA; local builds receive a fresh ID.
const buildVersion =
  process.env.NEXT_PUBLIC_BUILD_VERSION ??
  process.env.VERCEL_GIT_COMMIT_SHA ??
  process.env.GITHUB_SHA ??
  `local-${Date.now()}`;

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_VERSION: buildVersion,
  },
  // next-pwa only contributes `webpack` config (production builds run
  // `next build --webpack`). Declaring `turbopack` avoids errors in
  // `next dev`, which runs on Turbopack and needs no service worker.
  turbopack: {},
  poweredByHeader: false,
  // Keep test files available to Vitest's tsconfig path resolver, while
  // excluding them from Next's production type-check build.
  typescript: {
    tsconfigPath: "tsconfig.build.json",
  },
  // Defense-in-depth headers (audit H-Headers). CSP keeps 'unsafe-inline'
  // for scripts/styles: Next.js flight data and the theme bootstrap script
  // are inline by design. Remote surface is still pinned: images only from
  // self/data/blob/Supabase storage, API calls same-origin + Supabase.
  // The client-side ONNX background-removal model requires both eval sources.
  // This weakens CSP's eval protection, so keep script origins allowlisted.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' https://cdn.jsdelivr.net blob:",
              "worker-src 'self' blob:",
              "style-src 'self' 'unsafe-inline'",
              // Garment photos can live on third-party hosts (external
              // catalog imports), so images allow any HTTPS origin.
              // <img> sends no credentials cross-origin by default.
              "img-src 'self' data: blob: https:",
              "connect-src 'self' https://*.supabase.co https://cdn.jsdelivr.net https://staticimgly.com blob:",
              "font-src 'self' data:",
              "object-src 'none'",
              "base-uri 'self'",
              "frame-ancestors 'none'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

module.exports = withPWA(withNextIntl(withBundleAnalyzer(nextConfig)));
