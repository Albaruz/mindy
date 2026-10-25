import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useGarmentCardContent } from "./useGarmentCardContent";
import type { Garment } from "@/types/garment";

const { mockTranslate, mockTranslateDetail } = vi.hoisted(() => ({
  mockTranslate: vi.fn(),
  mockTranslateDetail: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) =>
    key === "garmentFallback" ? "Garment" : key,
}));

vi.mock("@/lib/translateGarment", () => ({
  useGarmentTranslator: () => ({
    translate: mockTranslate,
    translateDetail: mockTranslateDetail,
  }),
}));

function buildGarment(overrides: Partial<Garment> = {}): Garment {
  return {
    garmentId: "g1",
    userId: "u1",
    imageUrl: "https://example.com/g1.png",
    garmentType: "top",
    style: "casual",
    cutLength: null,
    color: "black",
    material: "cotton",
    season: "all",
    isDirty: false,
    lastWornDate: null,
    isExternalGarment: false,
    extraTags: { specificType: "tee" },
    createdAt: "",
    styles: ["casual"],
    cuts: [],
    isFavorite: false,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useGarmentCardContent", () => {
  it("resolves translated title, subtitle and alt", () => {
    mockTranslate.mockImplementation(
      (value: string | null, kind: string) => {
        if (kind === "type" && value === "top") return "Top";
        if (kind === "color" && value === "black") return "Black";
        if (kind === "season" && value === "all") return "All seasons";
        return value;
      },
    );
    mockTranslateDetail.mockReturnValue(null);

    const { result } = renderHook(() =>
      useGarmentCardContent(buildGarment()),
    );

    expect(result.current).toEqual({
      title: "Top",
      subtitle: "Black · All seasons",
      imageAlt: "Top (Black · All seasons)",
    });
  });

  it("falls back to the AI specific type", () => {
    mockTranslate.mockReturnValue(null);
    mockTranslateDetail.mockReturnValue("tee");

    const { result } = renderHook(() =>
      useGarmentCardContent(buildGarment()),
    );

    expect(result.current.title).toBe("tee");
  });

  it("falls back to the dictionary label when nothing translates", () => {
    mockTranslate.mockReturnValue(null);
    mockTranslateDetail.mockReturnValue(null);

    const { result } = renderHook(() =>
      useGarmentCardContent(buildGarment()),
    );

    expect(result.current.title).toBe("Garment");
  });

  it("uses the bare title as alt when there are no subtitle traits", () => {
    mockTranslate.mockImplementation((value: string | null) =>
      value === "top" ? "Top" : null,
    );
    mockTranslateDetail.mockReturnValue(null);

    const { result } = renderHook(() =>
      useGarmentCardContent(buildGarment({ color: null, season: null })),
    );

    expect(result.current).toEqual({
      title: "Top",
      subtitle: "",
      imageAlt: "Top",
    });
  });

  it("ignores a non-string specific type", () => {
    mockTranslate.mockReturnValue(null);
    mockTranslateDetail.mockReturnValue(null);

    const { result } = renderHook(() =>
      useGarmentCardContent(
        buildGarment({ extraTags: { specificType: 42 } }),
      ),
    );

    expect(mockTranslateDetail).toHaveBeenCalledWith(null);
    expect(result.current.title).toBe("Garment");
  });
});
