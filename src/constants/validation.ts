// Validation Rules
// Single source of truth for input validation limits (client + server).
// Names are semantic per field even when values coincide today, so each
// rule can evolve independently.

/** Minimum password length (Supabase Auth default, sign-in + reset flows). */
export const PASSWORD_MIN_LENGTH = 6;

/** Minimum length for new passwords created at sign-up (ASVS 6.2.1: >= 8). */
export const SIGNUP_PASSWORD_MIN_LENGTH = 8;

/** Character classes required for sign-up passwords (diversity, not blocklist). */
export const PASSWORD_UPPERCASE_PATTERN = /[A-Z]/;
export const PASSWORD_LOWERCASE_PATTERN = /[a-z]/;
export const PASSWORD_DIGIT_PATTERN = /[0-9]/;
export const PASSWORD_SYMBOL_PATTERN = /[^A-Za-z0-9]/;

/**
 * Returns true when a password meets the sign-up policy: minimum length
 * plus one uppercase, one lowercase, one digit and one symbol.
 */
export function meetsSignupPasswordPolicy(password: string): boolean {
  return (
    password.length >= SIGNUP_PASSWORD_MIN_LENGTH &&
    PASSWORD_UPPERCASE_PATTERN.test(password) &&
    PASSWORD_LOWERCASE_PATTERN.test(password) &&
    PASSWORD_DIGIT_PATTERN.test(password) &&
    PASSWORD_SYMBOL_PATTERN.test(password)
  );
}

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

/** Maximum upload payload accepted by the closet flow (10 MB). */
export const MAX_UPLOAD_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/** Storage width for uploaded garment photos (light files, sharp cards). */
export const GARMENT_UPLOAD_WIDTH_PX = 300;

/** Vision analysis request timeout (slow networks still get an answer). */
export const ANALYZE_TIMEOUT_MS = 30_000;

/** Required data-URL prefix for uploaded images. */
export const IMAGE_DATA_URL_PREFIX = "data:image/";
