import { create } from "zustand";
import type { UserProfile } from "@/types/user";

// Wizard answers for the 5-step immersive onboarding (Stories style).
// Identity and fine-tuning answers have no dedicated profile columns, so
// they travel inside extra_preferences (see onboardingInference).
export type ShopSection = "women" | "men" | "unisex";
export type StyleTribe = "minimalist" | "streetwear" | "classic" | "boho";
export type FitChoice = "oversized" | "regular" | "fitted";
export type JewelryPick = "gold" | "silver";

export const SHOP_SECTIONS: readonly ShopSection[] = [
  "women",
  "men",
  "unisex",
];

export const STYLE_TRIBES: readonly StyleTribe[] = [
  "minimalist",
  "streetwear",
  "classic",
  "boho",
];

export const FIT_CHOICES: readonly FitChoice[] = [
  "oversized",
  "regular",
  "fitted",
];

export const MEASURE_MIN_CM = 70;
export const MEASURE_MAX_CM = 140;

export const THERMAL_MIN = 1;
export const THERMAL_MAX = 5;

// Vetoable wardrobe colors (basic circles). Hexes are the contract with
// the server validator, so keep both lists in sync.
export const FORBIDDEN_COLOR_OPTIONS: readonly string[] = [
  "#1a1a1a",
  "#ffffff",
  "#6b4423",
  "#d9c7a7",
  "#b3261e",
  "#2f5d3a",
  "#2b4bd3",
  "#e3b505",
];

interface OnboardingState {
  displayName: string;
  section: ShopSection | "";
  style: StyleTribe | "";
  chestCm: number;
  waistCm: number;
  hipCm: number;
  fit: FitChoice | "";
  skinTone: string;
  eyeColor: string;
  jewelry: JewelryPick | "";
  thermal: number;
  forbiddenColors: string[];
  setDisplayName: (value: string) => void;
  setSection: (value: ShopSection) => void;
  setStyle: (value: StyleTribe) => void;
  setMeasurement: (field: "chestCm" | "waistCm" | "hipCm", value: number) => void;
  setFit: (value: FitChoice) => void;
  setSkinTone: (value: string) => void;
  setEyeColor: (value: string) => void;
  setJewelry: (value: JewelryPick) => void;
  setThermal: (value: number) => void;
  toggleForbiddenColor: (hex: string) => void;
  reset: () => void;
  prefillFromProfile: (profile: UserProfile) => void;
}

const INITIAL_STATE = {
  displayName: "",
  section: "" as ShopSection | "",
  style: "" as StyleTribe | "",
  chestCm: 92,
  waistCm: 76,
  hipCm: 98,
  fit: "" as FitChoice | "",
  skinTone: "",
  eyeColor: "",
  jewelry: "" as JewelryPick | "",
  thermal: 3,
  forbiddenColors: [] as string[],
};

function clampMeasurement(value: number): number {
  if (Number.isNaN(value)) {
    return MEASURE_MIN_CM;
  }
  return Math.min(MEASURE_MAX_CM, Math.max(MEASURE_MIN_CM, Math.round(value)));
}

function readExtra(profile: UserProfile): Record<string, unknown> {
  return profile.extraPreferences ?? {};
}

export const useOnboardingStore = create<OnboardingState>()((set) => ({
  ...INITIAL_STATE,

  setDisplayName: (value) => set({ displayName: value }),
  setSection: (section) => set({ section }),
  setStyle: (style) => set({ style }),

  setMeasurement: (field, value) =>
    set({ [field]: clampMeasurement(value) } as Partial<OnboardingState>),

  setFit: (fit) => set({ fit }),
  setSkinTone: (skinTone) => set({ skinTone }),
  setEyeColor: (eyeColor) => set({ eyeColor }),
  setJewelry: (jewelry) => set({ jewelry }),

  setThermal: (value) =>
    set({
      thermal: Math.min(
        THERMAL_MAX,
        Math.max(THERMAL_MIN, Math.round(value)),
      ),
    }),

  toggleForbiddenColor: (hex) =>
    set((current) => ({
      forbiddenColors: current.forbiddenColors.includes(hex)
        ? current.forbiddenColors.filter((item) => item !== hex)
        : [...current.forbiddenColors, hex],
    })),

  reset: () => set({ ...INITIAL_STATE, forbiddenColors: [] }),

  // Reopen with previous answers where the mapping is reversible.
  // Jewelry cannot be derived back from a colorimetry season, so the
  // user re-answers it from scratch.
  prefillFromProfile: (profile) =>
    set(() => {
      const extra = readExtra(profile);
      const fit =
        profile.preferredFit === "slim"
          ? "fitted"
          : profile.preferredFit === "oversized"
            ? "oversized"
            : profile.preferredFit === "regular"
              ? "regular"
              : "";
      return {
        displayName:
          typeof extra.displayName === "string" ? extra.displayName : "",
        section: SHOP_SECTIONS.includes(extra.section as ShopSection)
          ? (extra.section as ShopSection)
          : "",
        style: STYLE_TRIBES.includes(extra.style as StyleTribe)
          ? (extra.style as StyleTribe)
          : "",
        chestCm:
          profile.chestMeasurementCm ?? INITIAL_STATE.chestCm,
        waistCm: profile.waistMeasurementCm ?? INITIAL_STATE.waistCm,
        hipCm: profile.hipMeasurementCm ?? INITIAL_STATE.hipCm,
        fit: FIT_CHOICES.includes(fit as FitChoice)
          ? (fit as FitChoice | "")
          : "",
        skinTone: profile.skinTone ?? "",
        eyeColor: profile.eyeColor ?? "",
        jewelry: "",
        thermal:
          typeof extra.thermostat === "number" &&
          extra.thermostat >= THERMAL_MIN &&
          extra.thermostat <= THERMAL_MAX
            ? Math.round(extra.thermostat)
            : INITIAL_STATE.thermal,
        forbiddenColors: Array.isArray(extra.forbiddenColors)
          ? (extra.forbiddenColors as unknown[]).filter(
              (item): item is string =>
                typeof item === "string" &&
                FORBIDDEN_COLOR_OPTIONS.includes(item),
            )
          : [],
      };
    }),
}));
