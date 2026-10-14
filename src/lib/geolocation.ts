import { GEOLOCATION_MAX_AGE_MS, GEOLOCATION_TIMEOUT_MS } from "@/constants/geo";

/** Promise wrapper over the browser Geolocation API (rejects when unavailable or denied). */
export function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Geolocation is not available."));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      timeout: GEOLOCATION_TIMEOUT_MS,
      maximumAge: GEOLOCATION_MAX_AGE_MS,
    });
  });
}