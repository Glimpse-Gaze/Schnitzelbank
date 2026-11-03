import { listLeaderboard } from "../server/scores.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed." });
    return;
  }

  try {
    if (!process.env.DATABASE_URL) {
      res.status(200).json({ entries: [] });
      return;
    }
    const song = String(req.query?.song ?? "");
    const difficulty = String(req.query?.difficulty ?? "");
    const limit = req.query?.limit;
    const entries = await listLeaderboard(process.env.DATABASE_URL, {
      song,
      difficulty,
      limit,
    });
    res.status(200).json({ entries });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load.";
    res.status(error?.status === 400 ? 400 : 500).json({ error: message });
  }
}
