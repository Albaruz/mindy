import { beforeEach, describe, expect, it } from "vitest";
import { useOnboardingStore } from "./onboardingStore";
import type { UserProfile } from "@/types/user";

function buildProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    userId: "user-one",
    skinTone: "light",
    eyeColor: "brown",
    hairColor: "black",
    chestMeasurementCm: 92,
    waistMeasurementCm: 76,
    hipMeasurementCm: 98,
    colorimetry: null,
    morphology: null,
    preferredFit: "regular",
    lifestyle: null,
    extraPreferences: {},
    createdAt: "",
    ...overrides,
  };
}

describe("onboardingStore branch coverage", () => {
  beforeEach(() => {
    useOnboardingStore.getState().reset();
  });

  it("maps oversized fit on prefill", () => {
    useOnboardingStore.getState().prefillFromProfile(buildProfile({ preferredFit: "oversized" }));
    expect(useOnboardingStore.getState().fit).toBe("oversized");
  });

  it("maps regular fit on prefill", () => {
    useOnboardingStore.getState().prefillFromProfile(buildProfile({ preferredFit: "regular" }));
    expect(useOnboardingStore.getState().fit).toBe("regular");
  });

  it("prefills silver jewelry", () => {
    useOnboardingStore.getState().prefillFromProfile(
      buildProfile({ extraPreferences: { jewelry: "silver" } }),
    );
    expect(useOnboardingStore.getState().jewelry).toBe("silver");
  });

  it("prefills gold jewelry", () => {
    useOnboardingStore.getState().prefillFromProfile(
      buildProfile({ extraPreferences: { jewelry: "gold" } }),
    );
    expect(useOnboardingStore.getState().jewelry).toBe("gold");
  });

  it("rejects non-string jewelry values", () => {
    useOnboardingStore.getState().prefillFromProfile(
      buildProfile({ extraPreferences: { jewelry: 42 } }),
    );
    expect(useOnboardingStore.getState().jewelry).toBe("");
  });

  it("falls back to defaults for out-of-range thermostat", () => {
    useOnboardingStore.getState().prefillFromProfile(
      buildProfile({ extraPreferences: { thermostat: 99 } }),
    );
    expect(useOnboardingStore.getState().thermal).toBe(3);
  });

  it("falls back to defaults for missing measurements", () => {
    useOnboardingStore.getState().prefillFromProfile(
      buildProfile({ chestMeasurementCm: null, waistMeasurementCm: null, hipMeasurementCm: null }),
    );
    const state = useOnboardingStore.getState();
    expect(state.chestCm).toBeGreaterThan(0);
    expect(state.waistCm).toBeGreaterThan(0);
    expect(state.hipCm).toBeGreaterThan(0);
  });

  it("ignores non-string display names", () => {
    useOnboardingStore.getState().prefillFromProfile(
      buildProfile({ extraPreferences: { displayName: 42 } }),
    );
    expect(useOnboardingStore.getState().displayName).toBe("");
  });

  it("keeps only valid forbidden colors", () => {
    useOnboardingStore.getState().prefillFromProfile(
      buildProfile({ extraPreferences: { forbiddenColors: ["#1a1a1a", 42] } }),
    );
    expect(useOnboardingStore.getState().forbiddenColors).toEqual(["#1a1a1a"]);
  });
});
