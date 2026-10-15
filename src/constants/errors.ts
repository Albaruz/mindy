/** Stable application error codes. Translate these codes at the UI boundary. */
export const ERROR_CODES = {
  NO_GARMENTS: "NO_GARMENTS",
  STYLIST_UNAVAILABLE: "STYLIST_UNAVAILABLE",
  NO_OPTIONS: "NO_OPTIONS",
  NO_USABLE_GARMENTS: "NO_USABLE_GARMENTS",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
