// @vitest-environment node
// Unit tests for the locale request config: valid locales pass through,
// unknown or missing locales fall back to the default.
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl/server", () => ({
  getRequestConfig: vi.fn((handler: unknown) => handler),
}));

import requestConfig from "./request";
import enMessages from "../../messages/en.json";
import esMessages from "../../messages/es.json";

type RequestConfig = (args: {
  requestLocale?: Promise<string | undefined> | string | undefined;
}) => Promise<{ locale: string; messages: unknown }>;

const loadConfig = requestConfig as unknown as RequestConfig;

describe("locale request config", () => {
  it("resolves the English locale with its messages", async () => {
    const config = await loadConfig({ requestLocale: Promise.resolve("en") });
    expect(config.locale).toBe("en");
    expect(config.messages).toEqual(enMessages);
  });

  it("resolves the Spanish locale with its messages", async () => {
    const config = await loadConfig({ requestLocale: Promise.resolve("es") });
    expect(config.locale).toBe("es");
    expect(config.messages).toEqual(esMessages);
  });

  it("falls back to the default locale for an unknown locale", async () => {
    const config = await loadConfig({ requestLocale: Promise.resolve("fr") });
    expect(config.locale).toBe("en");
    expect(config.messages).toEqual(enMessages);
  });

  it("falls back to the default locale when none is requested", async () => {
    const config = await loadConfig({ requestLocale: Promise.resolve(undefined) });
    expect(config.locale).toBe("en");
    expect(config.messages).toEqual(enMessages);
  });
});
