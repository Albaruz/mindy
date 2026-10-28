import { NextResponse } from "next/server";
import { logger, generateRequestId } from "@/lib/logger";
import {
  isGuardResponse,
  rateLimitResponse,
  requireRouteUser,
} from "@/lib/api/routeGuards";
import { COLUMNS, TABLES, USER_ID_COLUMN } from "@/constants/storage";
import {
  GARMENT_ROW_COLUMNS,
  toGarment,
  type GarmentRow,
} from "@/lib/garment/garmentMappers";

// GET /api/favorites
// Returns only favorited garments for the current user
export async function GET() {
  const requestId = generateRequestId();
  const startTime = Date.now();

  const auth = await requireRouteUser("favorite", requestId, startTime);
  if (isGuardResponse(auth)) {
    return auth.response;
  }
  const { user, supabase } = auth;

  const limited = await rateLimitResponse("favorite", user.id, requestId, supabase);
  if (limited !== null) {
    return limited;
  }

  try {
    const { data, error } = await supabase
      .from(TABLES.garments)
      .select(GARMENT_ROW_COLUMNS)
      .eq(USER_ID_COLUMN, user.id)
      .eq(COLUMNS.isFavorite, true)
      .order(COLUMNS.createdAt, { ascending: false });

    if (error) {
      logger.error("Favorites fetch failed", { route: "favorites", requestId, userId: user.id, error });
      return NextResponse.json({ error: "Could not fetch favorites" }, { status: 500 });
    }

    const garments = (data as unknown as GarmentRow[]).map(toGarment);
    const durationMs = Date.now() - startTime;
    logger.requestComplete("favorites", requestId, 200, durationMs, { userId: user.id, count: garments.length });

    return NextResponse.json(garments, {
      headers: {
        "Cache-Control": "private, max-age=60, stale-while-revalidate=30",
      },
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    logger.error("Favorites request failed", { route: "favorites", requestId, userId: user.id, error, durationMs });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
