import { createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Checks a rate-limit bucket stored in Postgres so limits apply across all
 * serverless instances. Keys are hashed before storage to avoid retaining IPs
 * or email addresses in the database.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<boolean> {
  const keyHash = createHash("sha256").update(key).digest("hex");
  const { data, error } = await createAdminClient().rpc("check_rate_limit", {
    p_key_hash: keyHash,
    p_limit: limit,
    p_window_seconds: Math.ceil(windowMs / 1000),
  });

  if (error) {
    // Fail closed: a missing or unavailable shared limiter must not silently
    // turn protected endpoints into unlimited ones.
    console.error("Rate limit check failed:", error.message);
    return false;
  }

  return data === true;
}

export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}
