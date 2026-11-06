import { createHmac } from "node:crypto";
import { neon } from "@neondatabase/serverless";

let ensured = false;

function sqlClient(databaseUrl) {
  if (!databaseUrl) throw new Error("DATABASE_URL is not set.");
  return neon(databaseUrl);
}

export async function ensureRateLimitTable(databaseUrl) {
  if (ensured) return;
  const sql = sqlClient(databaseUrl);
  await sql`
    CREATE TABLE IF NOT EXISTS api_rate_limits (
      bucket text NOT NULL,
      window_start timestamptz NOT NULL,
      count integer NOT NULL,
      PRIMARY KEY (bucket, window_start)
    )
  `;
  ensured = true;
}

export function clientIp(req) {
  const forwarded = req.headers?.["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }
  const real = req.headers?.["x-real-ip"];
  if (typeof real === "string" && real.trim()) return real.trim();
  return req.socket?.remoteAddress ?? "";
}

export function hashedIpBucket(ip, secret) {
  const hmac = createHmac("sha256", secret || "schnitzelbank-rate");
  hmac.update(String(ip || "unknown"));
  return hmac.digest("hex").slice(0, 32);
}

export async function consumeRateLimit(databaseUrl, bucket, limit, windowSeconds) {
  await ensureRateLimitTable(databaseUrl);
  const sql = sqlClient(databaseUrl);
  const windowMs = Math.max(10, windowSeconds) * 1000;
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs);
  const rows = await sql`
    INSERT INTO api_rate_limits (bucket, window_start, count)
    VALUES (${bucket}, ${windowStart}, 1)
    ON CONFLICT (bucket, window_start)
    DO UPDATE SET count = api_rate_limits.count + 1
    RETURNING count
  `;
  const count = Number(rows[0]?.count) || 0;
  if (count > limit) {
    const error = new Error("Too many tries. Wait a few minutes.");
    error.status = 429;
    throw error;
  }
}
