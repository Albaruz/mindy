import Groq from "groq-sdk";
import { NextResponse } from "next/server";
import {
  GARMENT_COLOR_VALUES,
  GARMENT_CUT_VALUES,
  GARMENT_MATERIAL_VALUES,
  GARMENT_SEASON_VALUES,
  GARMENT_STYLE_VALUES,
  GARMENT_TYPE_VALUES,
} from "@/types/garment";

// Garment tagging via Groq native vision. Override the model with
// GROQ_VISION_MODEL if the catalog changes.
const VISION_MODEL =
  process.env.GROQ_VISION_MODEL || "qwen/qwen3.8-27b";
const GROQ_TIMEOUT_MS = 30000;
const MAX_IMAGE_CHARS = 7_000_000;

// Closed vocabularies: the model must pick from these lists only.
// garmentType uses macro categories; the specific name (sneakers,
// turquoise, ...) is derived server-side into extra_tags by the client
// normalizer. Prompt lists stay in sync with types/garment.ts.
const SYSTEM_PROMPT = `You are a fashion cataloging assistant. Analyze the garment photo (background already removed) and return STRICT JSON only: no markdown, no prose.

Shape:
{"category":"${GARMENT_TYPE_VALUES.join("|")}","garmentType":"${GARMENT_TYPE_VALUES.join("|")}","color":"${GARMENT_COLOR_VALUES.join("|")}","season":"${GARMENT_SEASON_VALUES.join("|")}","style":"${GARMENT_STYLE_VALUES.join("|")}","material":"${GARMENT_MATERIAL_VALUES.join("|")}","cutLength":"${GARMENT_CUT_VALUES.join("|")}"}

Rules:
- "category" and "garmentType" are the macro zone: top, bottom, dress, outerwear or footwear. Example: sneakers -> "footwear", jeans -> "bottom", t-shirt -> "top".
- "color" is the base spectrum only (turquoise -> "blue", burgundy -> "red", terracotta -> "orange").
- "season" is your best guess from fabric and weight; use "all" when unsure.
- Omit nothing: use null for anything you cannot determine.`;

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
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
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
    !imageBase64.startsWith("data:image/") ||
    imageBase64.length > MAX_IMAGE_CHARS
  ) {
    return NextResponse.json(
      { error: "Provide a valid imageBase64 data URL." },
      { status: 400 },
    );
  }

  try {
    const groq = new Groq({ apiKey });
    const response = await groq.chat.completions.create(
      {
        model: VISION_MODEL,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: SYSTEM_PROMPT },
              { type: "image_url", image_url: { url: imageBase64 } },
            ],
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0,
        max_tokens: 300,
      },
      { timeout: GROQ_TIMEOUT_MS },
    );

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: "Vision processing failed." },
        { status: 502 },
      );
    }
    const parsed: unknown = JSON.parse(content);
    if (typeof parsed !== "object" || parsed === null) {
      return NextResponse.json(
        { error: "Vision processing failed." },
        { status: 502 },
      );
    }
    const record = parsed as Record<string, unknown>;
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
  } catch {
    return NextResponse.json(
      { error: "Vision processing failed." },
      { status: 502 },
    );
  }
}
