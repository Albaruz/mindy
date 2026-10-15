"use client";

import { useEffect } from "react";
import { logger } from "@/lib/logger";
import { FeatureError } from "@/components/FeatureError/FeatureError";

interface RouteErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

// Per-feature crash boundary: logs with its route name so Vercel Logs can
// attribute the failure, then offers retry + escape to the generator.
function makeRouteError(route: string) {
  function RouteError({ error, reset }: RouteErrorProps) {
    useEffect(() => {
      logger.error("Route boundary caught render failure", { route, error });
    }, [error]);
    return <FeatureError onRetry={reset} />;
  }
  RouteError.displayName = `${route[0]?.toUpperCase()}${route.slice(1)}Error`;
  return RouteError;
}

export const GeneratorError = makeRouteError("generator");
export const ClosetError = makeRouteError("closet");
export const CalendarError = makeRouteError("calendar");
export const ProfileError = makeRouteError("profile");
export const SettingsError = makeRouteError("settings");
export const LocaleError = makeRouteError("locale");
