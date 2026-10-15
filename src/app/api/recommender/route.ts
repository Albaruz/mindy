import { NextResponse } from "next/server";
import { logger, generateRequestId } from "@/lib/logger";
import { readFiniteNumber, readString } from "@/lib/readers";
import {
  isGuardResponse,
  rateLimitResponse,
  readJsonBody,
  requireRouteUser,
} from "@/lib/api/routeGuards";
import {
  MAX_LOOK_OPTIONS,
  RECOMMENDER_MAX_REQUEST_GARMENTS,
} from "@/constants/generator";
import { COLD_THRESHOLD_C } from "@/constants/weather";
import { buildOutfitPrompt } from "@/lib/ai/prompts";
import {
  generateOutfitRecommendation,
  generateOutfitRecommendationStream,
  getEngineModel,
} from "@/lib/ai/engine";
import { generateFallbackLook } from "@/lib/recommender/fallback";
import {
  extractCompletedOptionObjects,
  isUpstreamFailure,
  parseCompletedOption,
  parseOptions,
} from "@/lib/recommender/llmOptions";
import { canBuildLook, capBalancedPool } from "@/lib/recommender/pool";
import {
  readIdList,
  readLocale,
  readOptionalProbability,
  readStylistProfile,
  readTemperatureCelsius,
  toCandidate,
} from "@/lib/recommender/request";
import {
  STYLE_PROMPT_LABELS,
  matchesRequestedStyle,
  readRequestedStyle,
} from "@/lib/recommender/styleFilter";
import type { CandidateGarment, OutfitOption } from "@/lib/recommender/types";
import {
  applyHeatRule,
  applyRainMaterialRule,
  isRainyWeather,
  poolHasOuterwear,
} from "@/lib/recommender/weatherRules";

interface RecommenderStreamContext {
  request: Request;
  requestId: string;
  startTime: number;
  userId: string;
  systemPrompt: string;
  userPayload: unknown;
  knownIds: Set<string>;
  cappedPool: CandidateGarment[];
  lockedIds: Set<string>;
  temperatureC: number;
  outerwearRequired: boolean;
  excludedWinterCount: number;
  excludedRainCount: number;
  excludedDismissedCount: number;
}

function createRecommenderStream({
  request,
  requestId,
  startTime,
  userId,
  systemPrompt,
  userPayload,
  knownIds,
  cappedPool,
  lockedIds,
  temperatureC,
  outerwearRequired,
  excludedWinterCount,
  excludedRainCount,
  excludedDismissedCount,
}: RecommenderStreamContext): Response {
  const encoder = new TextEncoder();
  const abortController = new AbortController();
  let streamController: ReadableStreamDefaultController<Uint8Array> | null = null;
  let closed = false;
  const previews: OutfitOption[] = [];

  const send = (event: Record<string, unknown>) => {
    if (!closed && streamController) {
      streamController.enqueue(
        encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
      );
    }
  };

  const completeResponse = (options: OutfitOption[], isFallback: boolean) => {
    const model = isFallback ? "local-fallback" : getEngineModel();
    logger.requestComplete("recommender", requestId, 200, Date.now() - startTime, {
      userId,
      isFallback,
      optionsCount: options.length,
      model,
      streamed: true,
      excludedWinterGarments: excludedWinterCount,
      excludedRainMaterials: excludedRainCount,
      excludedDismissedGarments: excludedDismissedCount,
    });
    send({
      type: "complete",
      payload: {
        options,
        temperatureC,
        requiredOuterwear: outerwearRequired,
        _isFallback: isFallback,
        excludedWinterGarments: excludedWinterCount,
        excludedRainMaterials: excludedRainCount,
        excludedDismissedGarments: excludedDismissedCount,
        model,
      },
    });
  };

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      streamController = controller;
      request.signal.addEventListener(
        "abort",
        () => abortController.abort(request.signal.reason),
        { once: true },
      );
      send({ type: "progress", stage: "generating" });

      void (async () => {
        let content = "";
        let scannedObjectCount = 0;
        try {
          content = await generateOutfitRecommendationStream(
            systemPrompt,
            userPayload,
            (chunk) => {
              content += chunk;
              const objects = extractCompletedOptionObjects(content);
              while (
                scannedObjectCount < objects.length &&
                previews.length < MAX_LOOK_OPTIONS
              ) {
                const option = parseCompletedOption(
                  objects[scannedObjectCount],
                  knownIds,
                );
                scannedObjectCount += 1;
                if (option !== null) {
                  previews.push(option);
                  send({ type: "preview", option });
                }
              }
            },
            abortController.signal,
          );

          const options = parseOptions(content, knownIds);
          completeResponse(options, false);
        } catch (error) {
          if (abortController.signal.aborted || closed) {
            return;
          }

          const message = error instanceof Error ? error.message : String(error);
          const status = (error as { status?: unknown }).status;
          const statusSuffix = typeof status === "number" ? ` (status ${status})` : "";
          if (!isUpstreamFailure(error)) {
            logger.error(`Stream request failed: ${message}${statusSuffix}`, {
              route: "recommender",
              requestId,
              userId,
              error,
              status,
              streamed: true,
            });
            send({ type: "reset" });
            send({ type: "error", error: "Unexpected recommender error.", status: 500 });
            return;
          }

          logger.warn(`LLM stream failed, using local fallback: ${message}${statusSuffix}`, {
            route: "recommender",
            requestId,
            userId,
            error,
            status,
            streamed: true,
          });
          send({ type: "reset" });
          try {
            const fallbackOptions = generateFallbackLook(
              cappedPool,
              lockedIds,
              temperatureC,
              outerwearRequired,
            );
            completeResponse(fallbackOptions, true);
          } catch (fallbackError) {
            logger.error("Local fallback failed for streamed request", {
              route: "recommender",
              requestId,
              userId,
              error: fallbackError,
            });
            send({
              type: "error",
              error: "AI service request failed. Try again.",
              status: 502,
            });
          }
        } finally {
          if (!closed) {
            closed = true;
            controller.close();
          }
        }
      })();
    },
    cancel(reason) {
      closed = true;
      abortController.abort(reason);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      "x-request-id": requestId,
    },
  });
}

// POST /api/recommender
// Body: { garments: Garment[], temperatureC?: number, condition?: string,
//         dayLow?: number, dayHigh?: number, rainProbability?: number,
//         profile?: {...}, mood?: string, style?: GarmentStyle
//         ("casual" | "formal" | "sport" | "elegant" | "streetwear" | "party"),
//         lockedGarmentIds?: string[], dismissedGarmentIds?: string[] }
// lockedGarmentIds also accepts the wizard alias fixed_garments /
// fixedGarments: pinned IDs always survive filtering as hard constraints.
// Thin controller: validates input, builds the prompt via prompts.ts,
// calls the engine, validates the output. Dirty garments never reach the
// engine (see eligible filter below). When `style` is provided, hard
// filtering applies: without enough matching garments the handler answers
// 422 { error: "INSUFFICIENT_STYLE_GARMENTS" } and never calls the LLM.
export async function POST(request: Request) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  // Paid upstream (Groq): require an authenticated session before any
  // parsing or billing-relevant work.
  const auth = await requireRouteUser("recommender", requestId, startTime);
  if (isGuardResponse(auth)) {
    return auth.response;
  }
  const { user } = auth;

  // Authenticated users still share one Groq quota (see RATE_LIMITS).
  const limited = rateLimitResponse("recommender", user.id, requestId);
  if (limited) {
    return limited;
  }

  if (!process.env.GROQ_API_KEY) {
    logger.error('GROQ_API_KEY not configured', { route: 'recommender', requestId });
    return NextResponse.json(
      { error: "AI service is not configured (GROQ_API_KEY)." },
      { status: 503 },
    );
  }

  const parsed = await readJsonBody(request);
  if (isGuardResponse(parsed)) {
    return parsed.response;
  }
  const { body } = parsed;
  if (typeof body !== "object" || body === null) {
    return NextResponse.json(
      { error: "Request body must be a JSON object." },
      { status: 400 },
    );
  }
  const input = body as Record<string, unknown>;

  if (!Array.isArray(input.garments) || input.garments.length === 0) {
    return NextResponse.json(
      { error: "Provide a non-empty garments array." },
      { status: 400 },
    );
  }
  if (input.garments.length > RECOMMENDER_MAX_REQUEST_GARMENTS) {
    return NextResponse.json(
      { error: "Too many garments in a single request." },
      { status: 413 },
    );
  }
  const candidates = input.garments
    .map(toCandidate)
    .filter((candidate): candidate is CandidateGarment => candidate !== null);
  if (candidates.length === 0) {
    return NextResponse.json(
      { error: "No valid garments with IDs were provided." },
      { status: 400 },
    );
  }

  const temperatureC = readTemperatureCelsius(input.temperatureC);
  const dayLow = readFiniteNumber(input.dayLow);
  const dayHigh = readFiniteNumber(input.dayHigh);
  const rainProbability = readOptionalProbability(input.rainProbability);
  const condition = readString(input.condition);
  const isRainy = isRainyWeather(condition, rainProbability);
  // Pinned IDs are read before weather filtering so the rain-material
  // rule can exempt explicit user pins (same hard-constraint contract
  // as the style filter and the eligible gate below).
  const requestedLockedIds = new Set(
    readIdList(
      input.lockedGarmentIds ?? input.fixed_garments ?? input.fixedGarments,
    ),
  );
  // Day-based heat rule: if it will be hot at any point today, winter
  // garments never reach the LLM, even on a mild morning.
  const { kept: heatKept, excludedWinterCount } = applyHeatRule(
    candidates,
    dayHigh ?? temperatureC,
  );
  // Rain-material rule: silk/suede never reach the LLM on wet days
  // unless the user explicitly pinned them.
  const { kept, excludedRainCount } = applyRainMaterialRule(
    heatKept,
    isRainy,
    requestedLockedIds,
  );
  if (kept.length === 0) {
    return NextResponse.json(
      { error: "No candidate garments left after weather filtering." },
      { status: 400 },
    );
  }

  const lockedCandidates = readIdList(
    // Wizard contract ("Bloquear y Generar") sends fixed_garments as the
    // hard constraints; the auto flow sends lockedGarmentIds. Both alias
    // the same rigid restriction.
    input.lockedGarmentIds ?? input.fixed_garments ?? input.fixedGarments,
  )
    .map((id) => kept.find((candidate) => candidate.id === id))
    .filter(
      (candidate): candidate is CandidateGarment => candidate !== undefined,
    );
  // Negative feedback ("change garment") plus hygiene: dirty or dismissed
  // garments never reach the LLM (locked ones always survive).
  const lockedIds = new Set(lockedCandidates.map((candidate) => candidate.id));
  const dismissedIds = new Set(readIdList(input.dismissedGarmentIds));
  const eligible = kept.filter(
    (candidate) =>
      lockedIds.has(candidate.id) ||
      (!dismissedIds.has(candidate.id) && !candidate.isDirty),
  );
  if (eligible.length === 0) {
    return NextResponse.json(
      { error: "No candidate garments left after applying feedback." },
      { status: 400 },
    );
  }
  if (eligible.length < 2) {
    return NextResponse.json(
      { error: "Need at least 2 candidate garments to build an outfit." },
      { status: 400 },
    );
  }

  // Strict style filtering (hard filter): non-locked candidates must match
  // the requested style, so the LLM can never pad a look with off-style
  // garments by elimination. Locked garments are explicit user pins and
  // always survive the filter.
  const requestedStyle = readRequestedStyle(input.style);
  let pool = eligible;
  if (requestedStyle !== null) {
    pool = eligible.filter(
      (candidate) =>
        lockedIds.has(candidate.id) ||
        matchesRequestedStyle(candidate.style, requestedStyle),
    );
    if (!canBuildLook(pool)) {
      // No Groq call: failing fast keeps the response honest instead of
      // returning a look stitched from the wrong style.
      return NextResponse.json(
        { error: "INSUFFICIENT_STYLE_GARMENTS" },
        { status: 422 },
      );
    }
  }
  // Token-budget cap with category balance: a blind head-slice would
  // silently drop whole families (e.g. every shoe) when the closet is
  // large. Locked pins always survive; the rest fills round-robin so each
  // represented category keeps at least one candidate.
  const cappedPool = capBalancedPool(pool, lockedIds);
  const knownIds = new Set(cappedPool.map((candidate) => candidate.id));

  // Hard outerwear rule: with rain or cold the model must dress an
  // available coat in every option (mirrors the client carousel logic).
  const outerwearRequired =
    poolHasOuterwear(cappedPool) &&
    (isRainy || (dayLow ?? temperatureC) < COLD_THRESHOLD_C);
  // Rain-safe prompt rule: the pool is already filtered, but the mandate
  // stops the model from favoring vulnerable leftovers (locked pins).
  const requireRainSafeMaterials = isRainy;

  const locale = readLocale(input.locale ?? input.language, request);

  const { systemPrompt, userPayload } = buildOutfitPrompt({
    profile: readStylistProfile(input.profile),
    climate: {
      temperatureC,
      condition,
      dayLow,
      dayHigh,
      rainProbability,
    },
    lockedGarments: lockedCandidates.map((candidate) => ({
      id: candidate.id,
      garmentType: candidate.garmentType,
      color: candidate.color,
    })),
    styleFilter:
      requestedStyle !== null ? STYLE_PROMPT_LABELS[requestedStyle] : null,
    requireOuterwear: outerwearRequired,
    requireRainSafeMaterials,
    locale,
    payload: {
      temperatureC,
      dayLow,
      dayHigh,
      rainProbability,
      requireOuterwear: outerwearRequired,
      requireRainSafeMaterials,
      profile: input.profile,
      mood: readString(input.mood),
      style: requestedStyle,
      lockedGarmentIds: [...lockedIds],
      candidates: cappedPool,
      locale,
    },
  });

  if (request.headers.get("accept")?.includes("text/event-stream")) {
    return createRecommenderStream({
      request,
      requestId,
      startTime,
      userId: user.id,
      systemPrompt,
      userPayload,
      knownIds,
      cappedPool,
      lockedIds,
      temperatureC,
      outerwearRequired,
      excludedWinterCount,
      excludedRainCount,
      excludedDismissedCount: kept.length - eligible.length,
    });
  }

  let options: OutfitOption[];
  let isFallback = false;
  try {
    const content = await generateOutfitRecommendation(
      systemPrompt,
      userPayload,
    );
    options = parseOptions(content, knownIds);
  } catch (error) {
    // Log the real cause server-side: the client only gets a short
    // message, so without this the failure is impossible to diagnose.
    const message = error instanceof Error ? error.message : String(error);
    const status = (error as { status?: unknown }).status;
    const statusSuffix =
      typeof status === "number" ? ` (status ${status})` : "";
    if (!isUpstreamFailure(error)) {
      logger.error(`Request failed: ${message}${statusSuffix}`, { route: 'recommender', requestId, userId: user.id, error, status });
      return NextResponse.json(
        { error: "Unexpected recommender error." },
        { status: 500 },
      );
    }
    // Graceful degradation: the local cerebelo answers with the same
    // contract plus _isFallback so the client skips AI training.
    logger.warn(`LLM failed, using local fallback: ${message}${statusSuffix}`, { route: 'recommender', requestId, userId: user.id, error, status });
    try {
      options = generateFallbackLook(
        cappedPool,
        lockedIds,
        temperatureC,
        outerwearRequired,
      );
      isFallback = true;
    } catch (fallbackError) {
      const fallbackMessage =
        fallbackError instanceof Error
          ? fallbackError.message
          : String(fallbackError);
      logger.error(`Local fallback failed: ${fallbackMessage}`, { route: 'recommender', requestId, userId: user.id, error: fallbackError });
      return NextResponse.json(
        { error: "AI service request failed. Try again." },
        { status: 502 },
      );
    }
  }
  const durationMs = Date.now() - startTime;
  logger.requestComplete('recommender', requestId, 200, durationMs, {
    userId: user.id,
    isFallback,
    optionsCount: options.length,
    model: isFallback ? "local-fallback" : getEngineModel(),
    excludedWinterGarments: excludedWinterCount,
    excludedRainMaterials: excludedRainCount,
    excludedDismissedGarments: kept.length - eligible.length,
  });
  // Debug headers for observability (safe to expose, no secrets)
  const responseHeaders = {
    "x-groq-model": isFallback ? "local-fallback" : getEngineModel(),
    "x-fallback": String(isFallback),
    "x-options-count": String(options.length),
    "x-excluded-winter": String(excludedWinterCount),
    "x-excluded-rain": String(excludedRainCount),
    "x-excluded-dismissed": String(kept.length - eligible.length),
    "x-request-id": requestId,
  };
  return NextResponse.json(
    {
      options,
      temperatureC,
      requiredOuterwear: outerwearRequired,
      _isFallback: isFallback,
      excludedWinterGarments: excludedWinterCount,
      excludedRainMaterials: excludedRainCount,
      excludedDismissedGarments: kept.length - eligible.length,
      model: isFallback ? "local-fallback" : getEngineModel(),
    },
    { status: 200, headers: responseHeaders },
  );
}
