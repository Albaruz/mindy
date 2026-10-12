import { describe, expect, it } from "vitest";
import {
  hasCompletedOnboarding,
  localizePath,
  postAuthDestination,
} from "./onboarding";

function buildClient(data: unknown, error: unknown = null) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data, error }),
        }),
      }),
    }),
  } as never;
}

const COMPLETE_ROW = {
  colorimetry: "warm",
  morphology: "rectangular",
  preferred_fit: "regular",
  lifestyle: "casual",
};

describe("postAuthDestination", () => {
  it("routes completed users to the generator", () => {
    expect(postAuthDestination(true)).toBe("/generator");
  });

  it("routes incomplete users to onboarding", () => {
    expect(postAuthDestination(false)).toBe("/profile/onboarding");
  });
});

describe("localizePath", () => {
  it("prefixes a leading-slash path with the locale", () => {
    expect(localizePath("/generator", "es")).toBe("/es/generator");
  });

  it("prefixes a bare path with the locale", () => {
    expect(localizePath("generator", "en")).toBe("/en/generator");
  });
});

describe("hasCompletedOnboarding", () => {
  it("returns true when all wizard fields are filled", async () => {
    await expect(
      hasCompletedOnboarding(buildClient(COMPLETE_ROW), "user-1"),
    ).resolves.toBe(true);
  });

  it("returns false when a field is empty", async () => {
    await expect(
      hasCompletedOnboarding(
        buildClient({ ...COMPLETE_ROW, lifestyle: "" }),
        "user-1",
      ),
    ).resolves.toBe(false);
  });

  it("returns false when the row is missing", async () => {
    await expect(
      hasCompletedOnboarding(buildClient(null), "user-1"),
    ).resolves.toBe(false);
  });

  it("returns false on query error", async () => {
    await expect(
      hasCompletedOnboarding(buildClient(null, new Error("db down")), "user-1"),
    ).resolves.toBe(false);
  });
});
