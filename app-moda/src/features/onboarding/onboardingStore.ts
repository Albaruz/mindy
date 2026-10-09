import { create } from "zustand";
import type { UserProfile } from "@/types/user";
import {
  type ShopSection,
  type StyleTribe,
  type FitChoice,
  type JewelryPick,
  SHOP_SECTIONS,
  STYLE_TRIBES,
  FIT_CHOICES,
  MEASURE_MIN_CM,
  MEASURE_MAX_CM,
  THERMAL_MIN,
  THERMAL_MAX,
  FORBIDDEN_COLOR_OPTIONS,
  ONBOARDING_DEFAULTS,
  clampMeasurement,
  clampThermal,
} from "@/constants/ui-config";

// Wizard answers for the 5-step immersive onboarding (Stories style).
// Identity and fine-tuning answers have no dedicated profile columns, so
// they travel inside extra_preferences (see onboardingInference).
// Types and constants re-exported from centralized config for backward compatibility.

export type {
  ShopSection,
  StyleTribe,
  FitChoice,
  JewelryPick,
};
export {
  SHOP_SECTIONS,
  STYLE_TRIBES,
  FIT_CHOICES,
  MEASURE_MIN_CM,
  MEASURE_MAX_CM,
  THERMAL_MIN,
  THERMAL_MAX,
  FORBIDDEN_COLOR_OPTIONS,
};

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

function readExtra(profile: UserProfile): Record<string, unknown> {
  return profile.extraPreferences ?? {};
}

export const useOnboardingStore = create<OnboardingState>()((set) => ({
  ...ONBOARDING_DEFAULTS,

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
    set({ thermal: clampThermal(value) }),

  toggleForbiddenColor: (hex) =>
    set((current) => ({
      forbiddenColors: current.forbiddenColors.includes(hex)
        ? current.forbiddenColors.filter((item) => item !== hex)
        : [...current.forbiddenColors, hex],
    })),

  reset: () => set({ ...ONBOARDING_DEFAULTS, forbiddenColors: [] }),

  // Reopen with previous answers where the mapping is reversible.
  // Jewelry is now stored in extra_preferences, so it can be prefilled.
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
          profile.chestMeasurementCm ?? ONBOARDING_DEFAULTS.chestCm,
        waistCm: profile.waistMeasurementCm ?? ONBOARDING_DEFAULTS.waistCm,
        hipCm: profile.hipMeasurementCm ?? ONBOARDING_DEFAULTS.hipCm,
        fit: FIT_CHOICES.includes(fit as FitChoice)
          ? (fit as FitChoice | "")
          : "",
        skinTone: profile.skinTone ?? "",
        eyeColor: profile.eyeColor ?? "",
        jewelry:
          typeof extra.jewelry === "string" &&
          (extra.jewelry === "gold" || extra.jewelry === "silver")
            ? (extra.jewelry as JewelryPick)
            : "",
        thermal:
          typeof extra.thermostat === "number" &&
          extra.thermostat >= THERMAL_MIN &&
          extra.thermostat <= THERMAL_MAX
            ? Math.round(extra.thermostat)
            : ONBOARDING_DEFAULTS.thermal,
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
