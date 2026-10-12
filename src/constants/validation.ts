// Validation Rules
// Single source of truth for input validation limits (client + server).
// Names are semantic per field even when values coincide today, so each
// rule can evolve independently.

/** Minimum password length (Supabase Auth default). */
export const PASSWORD_MIN_LENGTH = 6;

/** Pragmatic email shape check (server does not verify deliverability). */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Display name bounds (onboarding wizard + profile validator). */
export const DISPLAY_NAME_MIN_LENGTH = 2;
export const DISPLAY_NAME_MAX_LENGTH = 40;

/** Free-form extra tag bounds (closet editor + database CHECK). */
export const TAG_KEY_MAX_LENGTH = 40;
export const TAG_VALUE_MAX_LENGTH = 80;

/** Body measurement bounds accepted by the profile validator (cm). */
export const MEASUREMENT_MIN_CM = 20;
export const MEASUREMENT_MAX_CM = 300;

/** Maximum image data-URL length accepted by the vision endpoint. */
export const MAX_IMAGE_DATA_CHARS = 7_000_000;

/** Cap expensive client-side image processing while preserving garment detail. */
export const MAX_IMAGE_PROCESSING_DIMENSION_PX = 1024;

/** Required data-URL prefix for uploaded images. */
export const IMAGE_DATA_URL_PREFIX = "data:image/";
