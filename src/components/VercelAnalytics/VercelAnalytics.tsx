"use client";

import dynamic from "next/dynamic";

const Analytics = dynamic(
  () => import("@vercel/analytics/next").then((module) => module.Analytics),
  { ssr: false },
);

export function VercelAnalytics() {
  // The SDK injects a remote debug script in development. Analytics is only
  // useful on production deployments, and the production script is same-origin.
  if (process.env.NODE_ENV !== "production") {
    return null;
  }
  return <Analytics />;
}
