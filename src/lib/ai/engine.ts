import Groq from "groq-sdk";
import {
  AI_MODEL,
  AI_MODEL_FALLBACK,
  AI_TIMEOUT_MS,
  AI_MAX_ATTEMPTS,
  AI_RETRY_DELAY_MS,
  AI_MAX_RETRY_DELAY_MS,
  AI_TEMPERATURE,
  AI_REASONING_EFFORT,
  AI_MAX_TOKENS,
  AI_REPAIR_MAX_TOKENS,
  AI_RESPONSE_FORMAT,
  AI_STRUCTURED_RESPONSE_FORMAT,
  GROQ_JSON_VALIDATION_ERROR_MARKERS,
} from "@/constants/ai";
import { logger } from "@/lib/logger";

// groq-sdk is already a dependency (see package.json). Install only if
// missing: npm install groq-sdk / pnpm add groq-sdk.

let client: Groq | null = null;

function getClient(): Groq {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured.");
  }
  if (!client) {
    client = new Groq({ apiKey });
  }
  return client;
}

function getModelReasoningOptions(model: string) {
  if (!model.startsWith("openai/gpt-oss-")) {
    return {};
  }

  return {
    reasoning_effort: AI_REASONING_EFFORT,
    include_reasoning: false,
  };
}

function isJsonValidationError(error: unknown): boolean {
  try {
    const body = JSON.stringify(
      error instanceof Groq.BadRequestError
        ? error.error ?? error.message
        : error instanceof Error
          ? error.message
          : error,
    ).toLowerCase();
    return GROQ_JSON_VALIDATION_ERROR_MARKERS.some((marker) =>
      body.includes(marker),
    );
  } catch {
    return false;
  }
}

// Retryable: rate limits, Groq 5xx, connection/timeout failures, empty
// completions, and json_object validation misses. Auth and other 4xx
// fail fast: retrying cannot fix them.
function isRetryable(error: unknown): boolean {
  if (
    error instanceof Groq.RateLimitError ||
    error instanceof Groq.InternalServerError ||
    error instanceof Groq.APIConnectionError ||
    error instanceof Groq.APIConnectionTimeoutError
  ) {
    return true;
  }
  if (error instanceof Error && error.message.includes("empty completion")) {
    return true;
  }
  return isJsonValidationError(error);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Exponential backoff with jitter for retry delays.
// Respects server Retry-After header when present.
function calculateRetryDelay(attempt: number, rateLimitDelayMs: number | null): number {
  // If server provided Retry-After, use it (capped)
  if (rateLimitDelayMs !== null) {
    return Math.min(rateLimitDelayMs, AI_MAX_RETRY_DELAY_MS);
  }
  // Exponential backoff: base * 2^(attempt-1) + jitter (0-30%)
  const baseDelay = AI_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
  const jitter = Math.random() * baseDelay * 0.3;
  return Math.min(baseDelay + jitter, AI_MAX_RETRY_DELAY_MS);
}

// Honor the server-requested wait on 429s (free-tier TPM limits reset on
// a seconds scale, so the fixed 0.5-1s retries always re-hit the limit).
// Reads the Retry-After header first, then Groq's "try again in Ns"
// message hint. Falls back to null (caller uses exponential backoff).
function readRateLimitDelayMs(error: unknown): number | null {
  const headers = (error as { headers?: unknown }).headers;
  const getHeader =
    typeof headers === "object" &&
    headers !== null &&
    typeof (headers as { get?: unknown }).get === "function"
      ? (headers as { get: (name: string) => string | null }).get.bind(headers)
      : null;
  if (getHeader) {
    try {
      const retryAfter = getHeader("retry-after");
      if (retryAfter !== null) {
        const seconds = Number(retryAfter);
        if (Number.isFinite(seconds) && seconds >= 0) {
          return Math.min(seconds * 1000 + 500, AI_MAX_RETRY_DELAY_MS);
        }
      }
    } catch {
      // Fall through to the message hint below.
    }
  }
  if (error instanceof Error) {
    const match = /try again in ([\d.]+)s/.exec(error.message);
    if (match) {
      const seconds = Number(match[1]);
      if (Number.isFinite(seconds) && seconds >= 0) {
        return Math.min(seconds * 1000 + 500, AI_MAX_RETRY_DELAY_MS);
      }
    }
  }
  return null;
}

function getRetryDelayMs(error: unknown, attempt: number): number {
  if (error instanceof Groq.RateLimitError) {
    return calculateRetryDelay(attempt, readRateLimitDelayMs(error));
  }
  return calculateRetryDelay(attempt, null);
}

export function getEngineModel(): string {
  return AI_MODEL;
}

// Internal helper: single completion call with specified model.
async function generateWithModel(
  model: string,
  systemPrompt: string,
  userPayload: unknown,
  maxTokens: number,
  attempt: number,
): Promise<string> {
  const startTime = Date.now();
  const response = await getClient().chat.completions.create(
    {
      model,
      temperature: AI_TEMPERATURE,
      max_completion_tokens: maxTokens,
      ...getModelReasoningOptions(model),
      response_format: AI_RESPONSE_FORMAT,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify(userPayload) },
      ],
    },
    { timeout: AI_TIMEOUT_MS },
  );
  const durationMs = Date.now() - startTime;
  logger.externalCall('groq', 'chat.completions', durationMs, true, { model, attempt });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Groq returned an empty completion.");
  }
  return content;
}

// Single outfit-generation call against Groq with model fallback.
// Tries primary model first, falls back to AI_MODEL_FALLBACK on rate limits.
export async function generateOutfitRecommendation(
  systemPrompt: string,
  userPayload: unknown,
  maxTokens = AI_MAX_TOKENS,
): Promise<string> {
  let lastError: unknown = null;

  // Try primary model with retries
  for (let attempt = 1; attempt <= AI_MAX_ATTEMPTS; attempt += 1) {
    try {
      return await generateWithModel(AI_MODEL, systemPrompt, userPayload, maxTokens, attempt);
    } catch (error) {
      lastError = error;
      // On rate limit, try fallback model once before retrying primary
      if (error instanceof Groq.RateLimitError && attempt === 1) {
        try {
          logger.warn('Primary model rate limited, trying fallback model', { model: AI_MODEL_FALLBACK });
          return await generateWithModel(AI_MODEL_FALLBACK, systemPrompt, userPayload, maxTokens, attempt);
        } catch (fallbackError) {
          lastError = fallbackError;
          // Fallback also failed, will retry primary below
        }
      }
      if (attempt === AI_MAX_ATTEMPTS || !isRetryable(error)) {
        logger.error('Groq call failed after retries', { model: AI_MODEL, attempt, error, maxAttempts: AI_MAX_ATTEMPTS });
        throw error;
      }
      const retryDelay = getRetryDelayMs(error, attempt);
      logger.warn(`Groq call failed, retrying in ${retryDelay}ms`, { model: AI_MODEL, attempt, error, retryDelay });
      await delay(retryDelay);
    }
  }
  throw lastError;
}

function markStreamUpstreamFailure(error: unknown): Error {
  const marked = error instanceof Error ? error : new Error(String(error));
  Object.assign(marked, { __upstreamFailure: true });
  return marked;
}

// Streams JSON completion chunks to the caller while retaining the complete
// response for the same validation path used by non-streaming requests.
export async function generateOutfitRecommendationStream(
  systemPrompt: string,
  userPayload: unknown,
  onContent: (chunk: string) => void,
  signal?: AbortSignal,
  maxTokens = AI_MAX_TOKENS,
): Promise<string> {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= AI_MAX_ATTEMPTS; attempt += 1) {
    let content = "";
    let firstChunkMs: number | null = null;
    const startTime = Date.now();
    try {
      const modelToUse = (attempt === 1) ? AI_MODEL : AI_MODEL; // Use primary for all attempts, fallback handled in non-streaming
      const stream = await getClient().chat.completions.create(
        {
          model: modelToUse,
          temperature: AI_TEMPERATURE,
          max_completion_tokens: maxTokens,
          ...getModelReasoningOptions(modelToUse),
          response_format: AI_RESPONSE_FORMAT,
          stream: true,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: JSON.stringify(userPayload) },
          ],
        },
        { timeout: AI_TIMEOUT_MS, signal },
      );

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (typeof delta !== "string" || delta === "") {
          continue;
        }
        firstChunkMs ??= Date.now() - startTime;
        content += delta;
        onContent(delta);
      }

      if (content === "") {
        throw new Error("Groq returned an empty completion.");
      }

      logger.externalCall("groq", "chat.completions.stream", Date.now() - startTime, true, {
        model: modelToUse,
        attempt,
        firstChunkMs,
      });
      return content;
    } catch (error) {
      lastError = error;
      // Once content was exposed to the caller, do not transparently retry:
      // the caller may already have rendered verified complete options.
      // Groq rejects failed JSON-mode streams before a usable chunk exists.
      // Retrying the identical stream can stall the UI repeatedly; the route
      // switches these errors to its bounded non-streaming recovery instead.
      if (
        content !== "" ||
        isJsonValidationError(error) ||
        attempt === AI_MAX_ATTEMPTS ||
        !isRetryable(error)
      ) {
        logger.error("Groq stream failed", {
          model: AI_MODEL,
          attempt,
          error,
          maxAttempts: AI_MAX_ATTEMPTS,
          streamedContent: content !== "",
        });
        throw markStreamUpstreamFailure(error);
      }

      const retryDelay = getRetryDelayMs(error, attempt);
      logger.warn(`Groq stream failed, retrying in ${retryDelay}ms`, {
        model: AI_MODEL,
        attempt,
        error,
        retryDelay,
      });
      await delay(retryDelay);
    }
  }

  throw lastError;
}

export async function repairOutfitRecommendation(
  userPayload: unknown,
  invalidOptions: unknown,
): Promise<string> {
  return generateOutfitRecommendation(
    `You are a strict outfit repair service. Return STRICT JSON only.\nShape: {"options":[{"garmentIds":["<garment-id>"],"suitabilityRatio":0,"reason":"short sentence"}]}\nRules: use only candidate IDs; preserve every locked garment; never repeat an ID; require top and bottom unless a dress or jumpsuit is present; include outerwear when required; do not explain the repair.`,
    {
      ...((userPayload as Record<string, unknown>) ?? {}),
      invalidOptions,
    },
    AI_REPAIR_MAX_TOKENS,
  );
}

// Structured Outputs with strict JSON Schema (non-streaming only).
// Used as bounded recovery when streaming fails JSON validation.
// Groq does not support strict JSON schemas with streaming.
export async function generateStructuredOutfitRecommendation(
  systemPrompt: string,
  userPayload: unknown,
): Promise<string> {
  const startTime = Date.now();
  try {
    const response = await getClient().chat.completions.create(
      {
        model: AI_MODEL,
        temperature: AI_TEMPERATURE,
        max_completion_tokens: AI_MAX_TOKENS,
        ...getModelReasoningOptions(AI_MODEL),
        response_format: AI_STRUCTURED_RESPONSE_FORMAT,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: JSON.stringify(userPayload) },
        ],
      },
      { timeout: AI_TIMEOUT_MS },
    );
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Groq returned an empty completion.");
    }
    logger.externalCall("groq", "chat.completions.structured", Date.now() - startTime, true, {
      model: AI_MODEL,
    });
    return content;
  } catch (error) {
    logger.error("Groq structured recovery failed", {
      model: AI_MODEL,
      error,
    });
    throw error;
  }
}

