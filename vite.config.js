import { resolve } from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { clientIp, hashedIpBucket } from "./server/rateLimit.js";
import { listLeaderboard, upsertScore } from "./server/scores.js";

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  return JSON.parse(raw);
}

function leaderboardApiPlugin(databaseUrl, rateSecret) {
  return {
    name: "leaderboard-api",
    configureServer(server) {
      server.middlewares.use("/api/leaderboard", async (req, res, next) => {
        if (req.method !== "GET") {
          next();
          return;
        }
        try {
          if (!databaseUrl) {
            json(res, 200, { entries: [] });
            return;
          }
          const url = new URL(req.url || "", "http://localhost");
          const entries = await listLeaderboard(databaseUrl, {
            song: url.searchParams.get("song") || "",
            difficulty: url.searchParams.get("difficulty") || "",
            limit: url.searchParams.get("limit"),
          });
          json(res, 200, { entries });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Could not load.";
          json(res, error?.status === 400 ? 400 : 500, { error: message });
        }
      });

      server.middlewares.use("/api/scores", async (req, res, next) => {
        if (req.method !== "POST") {
          next();
          return;
        }
        try {
          if (!databaseUrl) {
            json(res, 503, { error: "DATABASE_URL is not set." });
            return;
          }
          const body = await readJsonBody(req);
          const bucket = hashedIpBucket(clientIp(req), rateSecret || databaseUrl);
          const result = await upsertScore(databaseUrl, body, bucket);
          json(res, 200, result);
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
          json(res, status, { error: message });
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    resolve: {
      alias: {
        "@src": resolve(__dirname, "./src"),
      },
    },
    plugins: [
      react(),
      leaderboardApiPlugin(env.DATABASE_URL, env.RATE_LIMIT_SECRET),
    ],
  };
});
