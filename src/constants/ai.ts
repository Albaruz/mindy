import { MAX_GARMENTS_PER_OPTION, MIN_GARMENTS_PER_OPTION } from "@/constants/generator";

// AI Engine Configuration
// Centralized constants for the Groq/LLM integration.
// Override via environment variables where noted.

/** Primary model identifier for Groq API. Default: openai/gpt-oss-20b */
export const AI_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-20b";

/** Fallback model with higher TPM limits for rate limit recovery. */
export const AI_MODEL_FALLBACK = "llama-3.1-8b-instant";

/** Request timeout in milliseconds. Default: 15s. */
export const AI_TIMEOUT_MS = 15_000;

/** Maximum retry attempts for transient failures (rate limits, json_validate_failed, empty completion). Default: 3 */
export const AI_MAX_ATTEMPTS = 3;

/** Base retry delay in milliseconds (linear backoff: delay * attempt). Default: 500ms */
export const AI_RETRY_DELAY_MS = 500;

/** Maximum single retry delay cap (prevents hanging on stale Retry-After). Default: 15s */
export const AI_MAX_RETRY_DELAY_MS = 15_000;

/** Temperature for outfit generation (0.0 - 1.0). Lower = more deterministic. */
export const AI_TEMPERATURE = 0.3;

/** Keep GPT-OSS reasoning bounded so it leaves room for the required JSON output. */
export const AI_REASONING_EFFORT = "low" as const;

/** Maximum completion tokens, including GPT-OSS reasoning tokens. */
export const AI_MAX_TOKENS = 4096;

/** Smaller response budget reserved for repairing invalid outfit options. */
export const AI_REPAIR_MAX_TOKENS = 500;

/** Response format for structured output. */
export const AI_RESPONSE_FORMAT = { type: "json_object" } as const;

/** Strict JSON Schema for Structured Outputs (non-streaming recovery). */
export const AI_STRUCTURED_RESPONSE_FORMAT = {
  type: "json_schema",
  json_schema: {
    name: "outfit_options",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["options"],
      properties: {
        options: {
          type: "array",
          minItems: 1,
          maxItems: 3,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["garmentIds", "suitabilityRatio", "reason"],
            properties: {
              garmentIds: {
                type: "array",
                minItems: MIN_GARMENTS_PER_OPTION,
                maxItems: MAX_GARMENTS_PER_OPTION,
                items: { type: "string" }
              },
              suitabilityRatio: { type: "integer", minimum: 0, maximum: 100 },
              reason: { type: "string", maxLength: 200 }
            }
          }
        }
      }
    }
  }
} as const;


/** Safe, aggregate-only classifications for recommender fallback telemetry. */
export const AI_FALLBACK_REASONS = [
  "stream_json_validation_failed",
  "groq_rate_limited",
  "groq_timeout",
  "groq_connection",
  "groq_server_error",
  "empty_completion",
  "invalid_json",
  "missing_options",
  "unknown_garment_ids",
  "constraint_rejection",
  "repair_failed",
  "upstream_unknown",
] as const;

export type AiFallbackReason = (typeof AI_FALLBACK_REASONS)[number];

/** Provider messages which identify a failed JSON-mode stream generation. */
export const GROQ_JSON_VALIDATION_ERROR_MARKERS = [
  "failed_generation",
  "failed to validate json",
  "json_validate_failed",
] as const;

// ---------------------------------------------------------------------------
// Vision (garment tagging)
// ---------------------------------------------------------------------------

/** Vision model identifier. Override with GROQ_VISION_MODEL. */
export const AI_VISION_MODEL =
  process.env.GROQ_VISION_MODEL || "qwen/qwen3.8-27b";

/** Vision request timeout in milliseconds. Default: 30s */
export const VISION_TIMEOUT_MS = 30_000;

/** Vision temperature: 0 for deterministic tagging. */
export const VISION_TEMPERATURE = 0;

/** Vision response cap for tags, quality assessment, and garment description. */
export const VISION_MAX_TOKENS = 700;

/** Maximum length of Vision's user-facing photo-quality explanation. */
export const VISION_QUALITY_NOTE_MAX_LENGTH = 140;

/** Maximum length of the garment-only description retained for later use. */
export const VISION_VISUAL_DESCRIPTION_MAX_LENGTH = 400;


// ---------------------------------------------------------------------------
// Outfit reason localization
// ---------------------------------------------------------------------------

/** Display names for the outfit "reason" language, keyed by app locale. */
export const AI_REASON_LANGUAGES = {
  en: "English",
  es: "Spanish",
} as const;
