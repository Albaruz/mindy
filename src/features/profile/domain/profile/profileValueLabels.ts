// Profile attribute labels.
//
// `public.profiles` stores morphology, lifestyle, colorimetry and preferred
// fit as stable English tokens (see src/constants/profile.ts and the DB
// CHECK constraints). The UI resolves those tokens through the "Profile"
// dictionaries in messages/*.json, so every locale shows its own copy
// without touching the stored data.

import { useTranslations } from "next-intl";

/** Profile attributes rendered as a single labelled value on the profile page. */
export type ProfileValueKind =
  | "morphology"
  | "lifestyle"
  | "colorimetry"
  | "fit";

// Sub-tree of the "Profile" namespace holding one entry per stored token.
export const PROFILE_VALUE_DICTIONARIES: Record<ProfileValueKind, string> = {
  morphology: "morphologies",
  lifestyle: "lifestyles",
  colorimetry: "colorimetries",
  fit: "fits",
};

// Fallback for tokens missing from the dictionaries (e.g. a value added to
// the database before its copy lands in messages/*.json).
function humanize(value: string): string {
  const spaced = value.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * Resolves a stored profile token to its localized label.
 * Returns null when there is no value, so callers can render their own
 * "not set" copy.
 */
export function useProfileValueLabel() {
  const t = useTranslations("Profile");

  return (kind: ProfileValueKind, value: string | null): string | null => {
    if (value === null || value === "") {
      return null;
    }
    const key = `${PROFILE_VALUE_DICTIONARIES[kind]}.${value}`;
    return t.has(key) ? t(key) : humanize(value);
  };
}
