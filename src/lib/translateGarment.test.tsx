import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";

const { mockLocale, mockHas, mockGet } = vi.hoisted(() => ({
  mockLocale: vi.fn(() => "es"),
  mockHas: vi.fn(() => true),
  mockGet: vi.fn((key: string) => key),
}));

vi.mock("next-intl", () => ({
  useLocale: mockLocale,
  useTranslations: () => Object.assign(mockGet, { has: mockHas }),
}));

import { useGarmentTranslator } from "./translateGarment";
import enMessages from "../../messages/en.json";
import esMessages from "../../messages/es.json";
import { ERROR_CODES } from "@/constants/errors";

function messageKeys(value: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix === "" ? key : `${prefix}.${key}`;
    return typeof child === "object" && child !== null && !Array.isArray(child)
      ? messageKeys(child as Record<string, unknown>, path)
      : [path];
  });
}

describe("useGarmentTranslator", () => {
  it("keeps the English garment catalog in sync with Spanish", () => {
    expect(messageKeys(enMessages.Garments).toSorted()).toEqual(
      messageKeys(esMessages.Garments).toSorted(),
    );
  });

  it("provides localized copy for every stable application error code", () => {
    for (const [locale, messages] of [
      ["en", enMessages],
      ["es", esMessages],
    ] as const) {
      for (const code of Object.values(ERROR_CODES)) {
        expect(
          typeof messages.Notifications.errors[code],
          `${locale}.Notifications.errors.${code}`,
        ).toBe("string");
      }
    }
  });

  it("returns null for empty values", () => {
    const { result } = renderHook(() => useGarmentTranslator());
    expect(result.current.translate(null, "type")).toBeNull();
    expect(result.current.translateDetail("")).toBeNull();
  });

  it("returns raw value outside spanish locale", () => {
    mockLocale.mockReturnValueOnce("en");
    mockHas.mockImplementation((key: string) => key === "types.mid_layer");
    mockGet.mockImplementation((key: string) => `t:${key}`);
    const { result } = renderHook(() => useGarmentTranslator());
    expect(result.current.translate("Top", "type")).toBe("Top");
    expect(result.current.translate("mid_layer", "type")).toBe(
      "t:types.mid_layer",
    );
    expect(result.current.translateDetail("Silk")).toBe("Silk");
  });

  it("resolves spanish keys through dictionaries", () => {
    mockLocale.mockReturnValue("es");
    mockHas.mockReturnValue(true);
    mockGet.mockImplementation((key: string) => `t:${key}`);
    const { result } = renderHook(() => useGarmentTranslator());
    expect(result.current.translate("top", "type")).toBe("t:types.top");
    expect(result.current.translateDetail("sneakers")).toBe(
      "t:specifics.sneakers",
    );
  });
});
