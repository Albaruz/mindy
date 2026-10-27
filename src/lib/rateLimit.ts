import type { SupabaseClient } from "@supabase/supabase-js";

export interface RateLimitResult {
  limited: boolean;
  retryAfterSec: number;
}

type RateLimitClient = Pick<SupabaseClient, "rpc">;

/**
 * Atomically consumes a per-user quota in Postgres. Unlike a process-local
 * Map, the database counter is shared by all serverless instances.
 */
export async function checkRateLimit(
  supabase: RateLimitClient,
  key: string,
): Promise<RateLimitResult> {
  const { data, error } = await supabase.rpc("consume_api_rate_limit", {
    p_key: key,
  });
  if (error) {
    throw error;
  }

  const result = Array.isArray(data) ? data[0] : data;
  if (
    typeof result !== "object" ||
    result === null ||
    typeof result.limited !== "boolean" ||
    typeof result.retry_after_sec !== "number"
  ) {
    throw new Error("Rate limit RPC returned an invalid response.");
  }

  return {
    limited: result.limited,
    retryAfterSec: result.retry_after_sec,
  };
}
