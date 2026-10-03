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
};

module.exports = withPWA(withNextIntl(nextConfig));
