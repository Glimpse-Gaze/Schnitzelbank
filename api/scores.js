import { clientIp, hashedIpBucket } from "../server/rateLimit.js";
import { upsertScore } from "../server/scores.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed." });
    return;
  }

  try {
    if (!process.env.DATABASE_URL) {
      res.status(503).json({ error: "DATABASE_URL is not set." });
      return;
    }
    const bucket = hashedIpBucket(
      clientIp(req),
      process.env.RATE_LIMIT_SECRET || process.env.DATABASE_URL,
    );
    const result = await upsertScore(process.env.DATABASE_URL, req.body, bucket);
    res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save.";
    const status =
      error?.status === 429
        ? 429
        : error?.status === 400 ||
            message.includes("must") ||
            message.includes("Invalid") ||
            message.includes("Unknown")
          ? 400
          : 500;
    res.status(status).json({ error: message });
  }
}
