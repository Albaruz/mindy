// AI Engine Configuration
// Centralized constants for the Groq/LLM integration.
// Override via environment variables where noted.

/** Model identifier for Groq API. Default: openai/gpt-oss-20b */
export const AI_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-20b";

/** Request timeout in milliseconds. Default: 30s */
export const AI_TIMEOUT_MS = 30_000;

/** Maximum retry attempts for transient failures (rate limits, json_validate_failed, empty completion). Default: 3 */
export const AI_MAX_ATTEMPTS = 3;

/** Base retry delay in milliseconds (linear backoff: delay * attempt). Default: 500ms */
export const AI_RETRY_DELAY_MS = 500;

/** Maximum single retry delay cap (prevents hanging on stale Retry-After). Default: 15s */
export const AI_MAX_RETRY_DELAY_MS = 15_000;

/** Temperature for outfit generation (0.0 - 1.0). Lower = more deterministic. */
export const AI_TEMPERATURE = 0.3;

/** Maximum tokens for outfit generation response. */
export const AI_MAX_TOKENS = 1000;

/** Response format for structured output. */
export const AI_RESPONSE_FORMAT = { type: "json_object" } as const;

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

/** Vision response cap: the tag JSON is tiny. */
export const VISION_MAX_TOKENS = 300;