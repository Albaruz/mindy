import { routing, type AppLocale } from "@/i18n/routing";

// Picks the best supported locale from an Accept-Language header value.
// Matches base subtags case-insensitively ("es-ES" -> "es") and honors
// q-weights. Returns null when nothing matches so callers can fall back
// to the cookie or the configured default.
export function negotiateLocaleFromAcceptLanguage(
  headerValue: string | null | undefined,
): AppLocale | null {
  if (headerValue === null || headerValue === undefined || headerValue === "") {
    return null;
  }
  const candidates = headerValue
    .split(",")
    .map((part) => {
      const [range, ...params] = part.trim().split(";");
      const base = range.trim().split("-")[0]?.split("_")[0]?.toLowerCase();
      let quality = 1;
      for (const param of params) {
        const match = param.trim().match(/^q=([0-9.]+)$/);
        if (match !== null) {
          quality = Number.parseFloat(match[1]);
        }
      }
      return { base, quality };
    })
    .filter(
      (entry): entry is { base: string; quality: number } =>
        entry.base !== undefined &&
        entry.base !== "" &&
        !Number.isNaN(entry.quality) &&
        entry.quality > 0,
    )
    .sort((a, b) => b.quality - a.quality);

  for (const { base } of candidates) {
    const match = routing.locales.find(
      (locale) => locale.toLowerCase() === base,
    );
    if (match !== undefined) {
      return match;
    }
  }
  return null;
}

// Priority: explicit NEXT_LOCALE cookie first, then the system/browser
// language from Accept-Language, then the configured default. An explicit
// user choice always wins; the system language is the default.
export function resolvePreferredLocale(options: {
  cookieValue?: string | null;
  acceptLanguage?: string | null;
}): AppLocale {
  const { cookieValue, acceptLanguage } = options;
  if (
    cookieValue !== undefined &&
    cookieValue !== null &&
    routing.locales.includes(cookieValue as AppLocale)
  ) {
    return cookieValue as AppLocale;
  }
  const negotiated = negotiateLocaleFromAcceptLanguage(acceptLanguage);
  if (negotiated !== null) {
    return negotiated;
  }
  return routing.defaultLocale;
}
