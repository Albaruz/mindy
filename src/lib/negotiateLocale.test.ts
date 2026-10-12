import { describe, expect, it } from "vitest";
import {
  negotiateLocaleFromAcceptLanguage,
  resolvePreferredLocale,
} from "./negotiateLocale";

describe("negotiateLocaleFromAcceptLanguage", () => {
  it("matches the base subtag of a regional range", () => {
    expect(negotiateLocaleFromAcceptLanguage("es-ES,es;q=0.9")).toBe("es");
  });

  it("honors quality weights over header order", () => {
    expect(negotiateLocaleFromAcceptLanguage("en;q=0.5,es;q=0.9")).toBe("es");
  });

  it("returns null for unsupported languages", () => {
    expect(negotiateLocaleFromAcceptLanguage("fr-FR,fr;q=0.9")).toBeNull();
  });

  it("returns null for empty headers", () => {
    expect(negotiateLocaleFromAcceptLanguage(null)).toBeNull();
    expect(negotiateLocaleFromAcceptLanguage("")).toBeNull();
  });
});

describe("resolvePreferredLocale", () => {
  it("prefers an explicit cookie over the system language", () => {
    expect(
      resolvePreferredLocale({
        cookieValue: "en",
        acceptLanguage: "es-ES,es;q=0.9",
      }),
    ).toBe("en");
  });

  it("uses the system language when no cookie is set", () => {
    expect(
      resolvePreferredLocale({
        cookieValue: undefined,
        acceptLanguage: "es-ES,es;q=0.9",
      }),
    ).toBe("es");
  });

  it("falls back to the default when nothing matches", () => {
    expect(
      resolvePreferredLocale({
        cookieValue: "fr",
        acceptLanguage: "fr-FR,fr;q=0.9",
      }),
    ).toBe("en");
  });
});
