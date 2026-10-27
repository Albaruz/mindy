import { NextResponse } from "next/server";
import { logger, generateRequestId } from "@/lib/logger";
import {
  isGuardResponse,
  rateLimitResponse,
  readJsonObject,
  requireRouteUser,
} from "@/lib/api/routeGuards";
import { TABLES, USER_ID_COLUMN } from "@/constants/storage";
import { UUID_PATTERN } from "@/constants/validation";

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
  const { user, supabase } = auth;

  const rateLimit = await rateLimitResponse("favorite", user.id, requestId, supabase);
  if (rateLimit !== null) return rateLimit;

  const { id } = await params;
  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json({ error: "Invalid garment ID." }, { status: 400 });
  }

  const bodyResult = await readJsonObject(request);
  if (isGuardResponse(bodyResult)) {
    return bodyResult.response;
  }
  const { is_favorite } = bodyResult.body;
  if (typeof is_favorite !== "boolean") {
    return NextResponse.json({ error: "is_favorite must be boolean" }, { status: 400 });
  }

  try {
    const { data, error } = await supabase
      .from(TABLES.garments)
      .update({ is_favorite })
      .eq("garment_id", id)
      .eq(USER_ID_COLUMN, user.id)
      .select("garment_id")
      .maybeSingle();

    if (error) {
      logger.error("Favorite toggle failed", { route: "favorite", requestId, userId: user.id, garmentId: id, error });
      return NextResponse.json({ error: "Could not update favorite" }, { status: 500 });
    }

    if (data === null) {
      return NextResponse.json({ error: "Garment not found." }, { status: 404 });
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
