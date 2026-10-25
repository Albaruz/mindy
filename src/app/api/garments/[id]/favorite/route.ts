import { NextResponse } from "next/server";
import { logger, generateRequestId } from "@/lib/logger";
import {
  isGuardResponse,
  rateLimitResponse,
  readJsonBody,
  requireRouteUser,
} from "@/lib/api/routeGuards";
import { TABLES, USER_ID_COLUMN } from "@/constants/storage";
import { createClient } from "@/lib/supabase/server";

// PATCH /api/garments/[id]/favorite
// Body: { is_favorite: boolean }
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  const auth = await requireRouteUser("favorite", requestId, startTime);
  if (isGuardResponse(auth)) {
    return auth.response;
  }
  const { user } = auth;

  const rateLimit = rateLimitResponse("favorite", user.id, requestId);
  if (rateLimit !== null) return rateLimit;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Garment ID required" }, { status: 400 });
  }

  const bodyResult = await readJsonBody(request);
  if (isGuardResponse(bodyResult)) {
    return bodyResult.response;
  }
  const { body } = bodyResult;

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const { is_favorite } = body as { is_favorite?: unknown };
  if (typeof is_favorite !== "boolean") {
    return NextResponse.json({ error: "is_favorite must be boolean" }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from(TABLES.garments)
      .update({ is_favorite })
      .eq("garment_id", id)
      .eq(USER_ID_COLUMN, user.id);

    if (error) {
      logger.error("Favorite toggle failed", { route: "favorite", requestId, userId: user.id, garmentId: id, error });
      return NextResponse.json({ error: "Could not update favorite" }, { status: 500 });
    }

    const durationMs = Date.now() - startTime;
    logger.requestComplete("favorite", requestId, 200, durationMs, { userId: user.id, garmentId: id, is_favorite });
    return NextResponse.json({ success: true, is_favorite });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    logger.error("Favorite request failed", { route: "favorite", requestId, userId: user.id, error, durationMs });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
