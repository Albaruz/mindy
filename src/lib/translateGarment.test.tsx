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

describe("useGarmentTranslator", () => {
  it("returns null for empty values", () => {
    const { result } = renderHook(() => useGarmentTranslator());
    expect(result.current.translate(null, "type")).toBeNull();
    expect(result.current.translateDetail("")).toBeNull();
  });

  it("returns raw value outside spanish locale", () => {
    mockLocale.mockReturnValueOnce("en");
    const { result } = renderHook(() => useGarmentTranslator());
    expect(result.current.translate("Top", "type")).toBe("Top");
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
