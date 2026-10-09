import Groq from "groq-sdk";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { RATE_LIMITS, RETRY_AFTER_HEADER } from "@/constants/api";
import { buildAnalysisPrompt } from "@/lib/ai/prompts";
import {
  AI_VISION_MODEL,
  VISION_MAX_TOKENS,
  VISION_TEMPERATURE,
  VISION_TIMEOUT_MS,
} from "@/constants/ai";
import {
  IMAGE_DATA_URL_PREFIX,
  MAX_IMAGE_DATA_CHARS,
} from "@/constants/validation";
import {
  GARMENT_COLOR_VALUES,
  GARMENT_CUT_VALUES,
  GARMENT_MATERIAL_VALUES,
  GARMENT_SEASON_VALUES,
  GARMENT_STYLE_VALUES,
  GARMENT_TYPE_VALUES,
} from "@/types/garment";
import { logger, generateRequestId } from "@/lib/logger";

function readClosedText(
  value: unknown,
  allowed: readonly string[],
  maxLength = 60,
): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim().toLowerCase();
  if (trimmed === "" || trimmed.length > maxLength) {
    return null;
  }
  return (allowed as readonly string[]).includes(trimmed) ? trimmed : null;
}

function readText(value: unknown, maxLength = 60): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed === "" || trimmed.length > maxLength) {
    return null;
  }
  return trimmed;
}

// POST /api/analyze — Body: { imageBase64: "data:image/png;base64,..." }
// Without GROQ_API_KEY the client falls back to manual tagging.
export async function POST(req: Request) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  // Paid upstream (Groq vision): require an authenticated session before
  // any parsing or billing-relevant work.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    logger.requestComplete('analyze', requestId, 401, Date.now() - startTime);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  logger.requestStart('analyze', requestId, user.id);

  // Vision calls are billed per image: cap uploads per user.
  const { key, limit, windowMs } = RATE_LIMITS.analyze;
  const quota = checkRateLimit(`${key}:${user.id}`, limit, windowMs);
  if (quota.limited) {
    logger.warn('Rate limit exceeded', { route: 'analyze', requestId, userId: user.id, retryAfterSec: quota.retryAfterSec });
    return NextResponse.json(
      { error: "Too many requests. Try again later." },
      {
        status: 429,
        headers: { [RETRY_AFTER_HEADER]: String(quota.retryAfterSec) },
      },
    );
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    logger.error('GROQ_API_KEY not configured', { route: 'analyze', requestId });
    return NextResponse.json(
      { skipped: true, category: null, garmentType: null, color: null },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }
  const imageBase64 =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>).imageBase64
      : null;
  if (
    typeof imageBase64 !== "string" ||
    !imageBase64.startsWith(IMAGE_DATA_URL_PREFIX) ||
    imageBase64.length > MAX_IMAGE_DATA_CHARS
  ) {
    return NextResponse.json(
      { error: "Provide a valid imageBase64 data URL." },
      { status: 400 },
    );
  }

  try {
    const groq = new Groq({ apiKey });
    const { systemPrompt } = buildAnalysisPrompt();
    const groqStart = Date.now();
    const response = await groq.chat.completions.create(
      {
        model: AI_VISION_MODEL,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: systemPrompt },
              { type: "image_url", image_url: { url: imageBase64 } },
            ],
          },
        ],
        response_format: { type: "json_object" },
        temperature: VISION_TEMPERATURE,
        max_tokens: VISION_MAX_TOKENS,
      },
      { timeout: VISION_TIMEOUT_MS },
    );
    logger.externalCall('groq', 'vision', Date.now() - groqStart, true, { route: 'analyze', requestId, userId: user.id, model: AI_VISION_MODEL });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      logger.error('Groq returned empty content', { route: 'analyze', requestId, userId: user.id });
      return NextResponse.json(
        { error: "Vision processing failed." },
        { status: 502 },
      );
    }
    const parsed: unknown = JSON.parse(content);
    if (typeof parsed !== "object" || parsed === null) {
      logger.error('Groq returned invalid JSON', { route: 'analyze', requestId, userId: user.id });
      return NextResponse.json(
        { error: "Vision processing failed." },
        { status: 502 },
      );
    }
    const record = parsed as Record<string, unknown>;
    const durationMs = Date.now() - startTime;
    logger.requestComplete('analyze', requestId, 200, durationMs, { userId: user.id, model: AI_VISION_MODEL });
    return NextResponse.json({
      skipped: false,
      category: readClosedText(record.category, GARMENT_TYPE_VALUES),
      garmentType: readClosedText(
        record.garmentType ?? record.type,
        GARMENT_TYPE_VALUES,
      ),
      // Free-text shade passthrough: the client normalizer maps it to the
      // closed base + extra_tags.colorShade (turquoise -> blue).
      colorDetail: readText(record.colorDetail ?? record.shade, 40),
      color: readClosedText(record.color, GARMENT_COLOR_VALUES, 40),
      season: readClosedText(record.season, GARMENT_SEASON_VALUES),
      style: readClosedText(record.style, GARMENT_STYLE_VALUES),
      material: readClosedText(record.material, GARMENT_MATERIAL_VALUES),
      cutLength: readClosedText(record.cutLength, GARMENT_CUT_VALUES),
      typeDetail: readText(record.typeDetail ?? record.specificType, 60),
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    logger.error('Vision processing failed', { route: 'analyze', requestId, userId: user.id, error, durationMs });
    return NextResponse.json(
      { error: "Vision processing failed." },
      { status: 502 },
    );
  }
}
