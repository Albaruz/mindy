import Groq from "groq-sdk";
import { NextResponse } from "next/server";
import { buildAnalysisPrompt } from "@/lib/ai/prompts";
import { getGroqClient } from "@/lib/ai/engine";
import {
  AI_VISION_MODEL,
  VISION_COLOR_DETAIL_MAX_LENGTH,
  VISION_MAX_TOKENS,
  VISION_PRINT_MAX_LENGTH,
  VISION_QUALITY_NOTE_MAX_LENGTH,
  VISION_SECONDARY_COLOR_MAX_LENGTH,
  VISION_TAG_DETAIL_MAX_LENGTH,
  VISION_TEMPERATURE,
  VISION_TIMEOUT_MS,
  VISION_VISUAL_DESCRIPTION_MAX_LENGTH,
} from "@/constants/ai";
import {
  MAX_IMAGE_DATA_BYTES,
  MAX_IMAGE_DATA_CHARS,
} from "@/constants/validation";
import {
  GARMENT_COLOR_VALUES,
  GARMENT_CUT_VALUES,
  GARMENT_MATERIAL_VALUES,
  GARMENT_SEASON_VALUES,
  GARMENT_STYLE_VALUES,
  GARMENT_TYPE_VALUES,
  CUTOUT_DIFFICULTY_VALUES,
} from "@/constants/garment";
import { logger, generateRequestId } from "@/lib/logger";
import {
  isRecord,
  readAllowedString,
  readAllowedStringList,
} from "@/lib/readers";
import { readLocale } from "@/lib/recommender/request";
import {
  isGuardResponse,
  rateLimitResponse,
  readJsonObject,
  requireRouteUser,
} from "@/lib/api/routeGuards";

function readText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed === "" || trimmed.length > maxLength) {
    return null;
  }
  return trimmed;
}

function isValidImageDataUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > MAX_IMAGE_DATA_CHARS) {
    return false;
  }
  const match =
    /^data:(image\/(?:jpeg|png|webp));base64,((?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?)$/.exec(
      value,
    );
  if (!match) {
    return false;
  }

  const mimeType = match[1];
  const bytes = Buffer.from(match[2], "base64");
  if (bytes.length === 0 || bytes.length > MAX_IMAGE_DATA_BYTES) {
    return false;
  }

  if (mimeType === "image/png") {
    return bytes.length >= 8 &&
      bytes.subarray(0, 8).equals(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      );
  }
  if (mimeType === "image/jpeg") {
    return bytes.length >= 3 &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff;
  }
  return (
    bytes.length >= 12 &&
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  );
}

// POST /api/analyze — Body: { imageBase64: "data:image/png;base64,..." }
// Without GROQ_API_KEY the client falls back to manual tagging.
export async function POST(req: Request) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  // Paid upstream (Groq vision): require an authenticated session before
  // any parsing or billing-relevant work.
  const auth = await requireRouteUser("analyze", requestId, startTime);
  if (isGuardResponse(auth)) {
    return auth.response;
  }
  const { user, supabase } = auth;

  // Vision calls are billed per image: cap uploads per user.
  const limited = await rateLimitResponse("analyze", user.id, requestId, supabase);
  if (limited) {
    return limited;
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    logger.error('GROQ_API_KEY not configured', { route: 'analyze', requestId });
    return NextResponse.json(
      { skipped: true, category: null, garmentType: null, color: null },
      { status: 503 },
    );
  }

  const parsed = await readJsonObject(req);
  if (isGuardResponse(parsed)) {
    return parsed.response;
  }
  const requestBody = parsed.body;
  const imageBase64 = requestBody.imageBase64;
  if (!isValidImageDataUrl(imageBase64)) {
    return NextResponse.json(
      { error: "Provide a valid imageBase64 data URL." },
      { status: 400 },
    );
  }

  try {
    const groq = getGroqClient();
    const locale = readLocale(requestBody.locale, req);
    const { systemPrompt } = buildAnalysisPrompt(locale);
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
    const visionOutput: unknown = JSON.parse(content);
    if (!isRecord(visionOutput)) {
      logger.error('Groq returned invalid JSON', { route: 'analyze', requestId, userId: user.id });
      return NextResponse.json(
        { error: "Vision processing failed." },
        { status: 502 },
      );
    }
    const record = visionOutput;
    const durationMs = Date.now() - startTime;
    logger.requestComplete('analyze', requestId, 200, durationMs, { userId: user.id, model: AI_VISION_MODEL });
    return NextResponse.json({
      skipped: false,
      category: readAllowedString(record.category, GARMENT_TYPE_VALUES),
      garmentType: readAllowedString(
        record.garmentType ?? record.type,
        GARMENT_TYPE_VALUES,
      ),
      // Free-text shade passthrough: the client normalizer maps it to the
      // closed base + extra_tags.colorShade (turquoise -> blue).
      colorDetail: readText(
        record.colorDetail ?? record.shade,
        VISION_COLOR_DETAIL_MAX_LENGTH,
      ),
      color: readAllowedString(
        record.color,
        GARMENT_COLOR_VALUES,
        VISION_COLOR_DETAIL_MAX_LENGTH,
      ),
      secondaryColor: readText(
        record.secondaryColor,
        VISION_SECONDARY_COLOR_MAX_LENGTH,
      ),
      print: readText(record.print, VISION_PRINT_MAX_LENGTH),
      season: readAllowedString(record.season, GARMENT_SEASON_VALUES),
      style: readAllowedString(record.style, GARMENT_STYLE_VALUES),
      styles: readAllowedStringList(record.styles, GARMENT_STYLE_VALUES),
      material: readAllowedString(record.material, GARMENT_MATERIAL_VALUES),
      cutLength: readAllowedString(record.cutLength, GARMENT_CUT_VALUES),
      cuts: readAllowedStringList(record.cuts, GARMENT_CUT_VALUES),
      typeDetail: readText(
        record.typeDetail ?? record.specificType,
        VISION_TAG_DETAIL_MAX_LENGTH,
      ),
      cutoutDifficulty: readAllowedString(
        record.cutoutDifficulty,
        CUTOUT_DIFFICULTY_VALUES,
      ),
      qualityNote: readText(
        record.qualityNote,
        VISION_QUALITY_NOTE_MAX_LENGTH,
      ),
      visualDescription: readText(
        record.visualDescription,
        VISION_VISUAL_DESCRIPTION_MAX_LENGTH,
      ),
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    logger.error('Vision processing failed', { route: 'analyze', requestId, userId: user.id, error, durationMs });
    const isRateLimited =
      typeof Groq.RateLimitError === "function" &&
      error instanceof Groq.RateLimitError;
    const isTimedOut =
      typeof Groq.APIConnectionTimeoutError === "function" &&
      error instanceof Groq.APIConnectionTimeoutError;
    const headers =
      typeof error === "object" && error !== null && "headers" in error
        ? (error as { headers?: Headers }).headers
        : undefined;
    const retryAfter = isRateLimited ? headers?.get("retry-after") ?? null : null;
    const status = isRateLimited ? 503 : isTimedOut ? 504 : 502;
    return NextResponse.json(
      { error: "Vision processing failed." },
      {
        status,
        ...(retryAfter === null ? {} : { headers: { "Retry-After": retryAfter } }),
      },
    );
  }
}
