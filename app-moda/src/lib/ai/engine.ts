import Groq from "groq-sdk";

// groq-sdk is already a dependency (see package.json). Install only if
// missing: npm install groq-sdk / pnpm add groq-sdk.
//
// Llama 3 instruct models were retired from Groq's free/developer tiers
// (verified via /models and the deprecation log), so the default is the
// fastest open-weight chat model available. Pin another id with GROQ_MODEL
// if Llama returns to the catalog.
const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-20b";
const TIMEOUT_MS = 30000;
// The model occasionally returns an empty generation under json_object
// mode (Groq 400 json_validate_failed). Those failures are transient:
// a plain retry almost always succeeds.
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 500;
// Upper bound for a single backoff sleep so a stale Retry-After never
// hangs the request beyond a reasonable interaction.
const MAX_RETRY_DELAY_MS = 15000;

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

function isJsonValidationError(error: unknown): boolean {
  if (!(error instanceof Groq.BadRequestError)) {
    return false;
  }
  try {
    const body = JSON.stringify(error.error ?? error.message);
    return body.includes("json_validate_failed");
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

// Honor the server-requested wait on 429s (free-tier TPM limits reset on
// a seconds scale, so the fixed 0.5-1s retries always re-hit the limit).
// Reads the Retry-After header first, then Groq's "try again in Ns"
// message hint. Falls back to a linear backoff, capped.
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
          return Math.min(seconds * 1000 + 500, MAX_RETRY_DELAY_MS);
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
        return Math.min(seconds * 1000 + 500, MAX_RETRY_DELAY_MS);
      }
    }
  }
  return null;
}

function getRetryDelayMs(error: unknown, attempt: number): number {
  if (error instanceof Groq.RateLimitError) {
    return readRateLimitDelayMs(error) ?? RETRY_DELAY_MS * 4 * attempt;
  }
  return RETRY_DELAY_MS * attempt;
}

export function getEngineModel(): string {
  return MODEL;
}

// Single outfit-generation call against Groq. The caller owns candidate
// filtering and response validation; this function only transports the
// prompt and returns the raw JSON content. Throws on transport errors,
// missing credentials, or empty completions.
export async function generateOutfitRecommendation(
  systemPrompt: string,
  userPayload: unknown,
): Promise<string> {
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await getClient().chat.completions.create(
        {
          model: MODEL,
          temperature: 0.3,
          max_tokens: 1000,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: JSON.stringify(userPayload) },
          ],
        },
        { timeout: TIMEOUT_MS },
      );

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("Groq returned an empty completion.");
      }
      return content;
    } catch (error) {
      lastError = error;
      if (attempt === MAX_ATTEMPTS || !isRetryable(error)) {
        throw error;
      }
      await delay(getRetryDelayMs(error, attempt));
    }
  }
  throw lastError;
}
