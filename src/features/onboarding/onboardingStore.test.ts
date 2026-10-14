import { beforeEach, describe, expect, it, vi } from "vitest";
import { useOnboardingStore } from "./onboardingStore";
import type { UserProfile } from "@/types/user";

function buildProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    userId: "u1",
    skinTone: "light",
    eyeColor: "brown",
    hairColor: "black",
    chestMeasurementCm: 92,
    waistMeasurementCm: 76,
    hipMeasurementCm: 98,
    colorimetry: null,
    morphology: null,
    preferredFit: "slim",
    lifestyle: null,
    extraPreferences: {},
    createdAt: "",
    ...overrides,
  };
}

describe("onboardingStore", () => {
  beforeEach(() => {
    useOnboardingStore.getState().reset();
  });

  it("sets primitive answers", () => {
    const store = useOnboardingStore.getState();
    store.setDisplayName("Ada");
    store.setSection("women");
    store.setStyle("minimalist");
    store.setFit("fitted");
    store.setSkinTone("light");
    store.setEyeColor("brown");
    store.setJewelry("gold");
    const state = useOnboardingStore.getState();
    expect(state.displayName).toBe("Ada");
    expect(state.section).toBe("women");
    expect(state.style).toBe("minimalist");
    expect(state.fit).toBe("fitted");
    expect(state.jewelry).toBe("gold");
  });

  it("clamps measurements and thermal values", () => {
    const store = useOnboardingStore.getState();
    store.setMeasurement("chestCm", 500);
    store.setThermal(99);
    expect(useOnboardingStore.getState().chestCm).toBeLessThanOrEqual(140);
    expect(useOnboardingStore.getState().thermal).toBeLessThanOrEqual(5);
  });

  it("toggles forbidden colors on and off", () => {
    const store = useOnboardingStore.getState();
    store.toggleForbiddenColor("#1a1a1a");
    expect(useOnboardingStore.getState().forbiddenColors).toContain("#1a1a1a");
    useOnboardingStore.getState().toggleForbiddenColor("#1a1a1a");
    expect(useOnboardingStore.getState().forbiddenColors).not.toContain(
      "#1a1a1a",
    );
  });

  it("resets to defaults", () => {
    useOnboardingStore.getState().setDisplayName("Ada");
    useOnboardingStore.getState().reset();
    expect(useOnboardingStore.getState().displayName).toBe("");
    expect(useOnboardingStore.getState().forbiddenColors).toEqual([]);
  });

  it("prefills reversible answers from a profile", () => {
    useOnboardingStore.getState().prefillFromProfile(
      buildProfile({
        extraPreferences: {
          displayName: "Ada",
          section: "women",
          style: "minimalist",
          thermostat: 2,
          forbiddenColors: ["#1a1a1a", "not-a-color", 42],
        },
      }),
    );
    const state = useOnboardingStore.getState();
    expect(state.displayName).toBe("Ada");
    expect(state.section).toBe("women");
    expect(state.fit).toBe("fitted");
    expect(state.thermal).toBe(2);
    expect(state.forbiddenColors).toEqual(["#1a1a1a"]);
    expect(state.jewelry).toBe("");
  });

  it("ignores invalid prefill values", () => {
    useOnboardingStore.getState().prefillFromProfile(
      buildProfile({
        preferredFit: null,
        extraPreferences: { section: "invalid", style: "invalid" },
      }),
    );
    const state = useOnboardingStore.getState();
    expect(state.section).toBe("");
    expect(state.style).toBe("");
    expect(state.fit).toBe("");
  });

  it("notifies subscribers on change", () => {
    const listener = vi.fn();
    const unsubscribe = useOnboardingStore.subscribe(listener);
    useOnboardingStore.getState().setDisplayName("Ada");
    expect(listener).toHaveBeenCalled();
    unsubscribe();
  });
});
