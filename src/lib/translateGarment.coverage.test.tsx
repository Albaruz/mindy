import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";

const { mockLocale, mockHas, mockGet } = vi.hoisted(() => ({
  mockLocale: vi.fn(() => "es"),
  mockHas: vi.fn(() => false),
  mockGet: vi.fn((key: string) => key),
}));

vi.mock("next-intl", () => ({
  useLocale: mockLocale,
  useTranslations: () => Object.assign(mockGet, { has: mockHas }),
}));

import { useGarmentTranslator } from "./translateGarment";

describe("useGarmentTranslator branch coverage", () => {
  it("falls back to the raw value when no dictionary entry matches", () => {
    mockLocale.mockReturnValue("es");
    mockHas.mockReturnValue(false);
    const { result } = renderHook(() => useGarmentTranslator());
    expect(result.current.translate("Top", "type")).toBe("Top");
    expect(result.current.translateDetail("Silk")).toBe("Silk");
  });

  it("falls back to specifics when the kind namespace misses", () => {
    mockLocale.mockReturnValue("es");
    mockHas.mockImplementation((key: string) =>
      key.startsWith("specifics."),
    );
    mockGet.mockImplementation((key: string) => `t:${key}`);
    const { result } = renderHook(() => useGarmentTranslator());
    expect(result.current.translate("top", "type")).toBe("t:specifics.top");
  });

  it("returns null for nullish detail values", () => {
    mockLocale.mockReturnValue("es");
    const { result } = renderHook(() => useGarmentTranslator());
    expect(result.current.translateDetail(null)).toBeNull();
    expect(result.current.translateDetail(undefined)).toBeNull();
  });
});
