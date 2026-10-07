// eslint-disable-next-line @typescript-eslint/no-require-imports
const createNextIntlPlugin = require("next-intl/plugin");
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// eslint-disable-next-line @typescript-eslint/no-require-imports
const withPWA = require("next-pwa")({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
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

/** @type {import('next').NextConfig} */
const nextConfig = {
  // next-pwa only contributes `webpack` config (production builds run
  // `next build --webpack`). Declaring `turbopack` avoids errors in
  // `next dev`, which runs on Turbopack and needs no service worker.
  turbopack: {},
  poweredByHeader: false,
  // Defense-in-depth headers (audit H-Headers). CSP keeps 'unsafe-inline'
  // for scripts/styles: Next.js flight data and the theme bootstrap script
  // are inline by design. Remote surface is still pinned: images only from
  // self/data/blob/Supabase storage, API calls same-origin + Supabase.
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
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              // Garment photos can live on third-party hosts (external
              // catalog imports), so images allow any HTTPS origin.
              // <img> sends no credentials cross-origin by default.
              "img-src 'self' data: blob: https:",
              "connect-src 'self' https://*.supabase.co",
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

module.exports = withPWA(withNextIntl(nextConfig));
