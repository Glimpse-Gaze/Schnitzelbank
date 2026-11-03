import { neon } from "@neondatabase/serverless";
import { consumeRateLimit } from "./rateLimit.js";

const SONGS = new Set(["schnitzel", "kaszebe"]);
const DIFFICULTIES = new Set(["easy", "medium", "hard", "crazy"]);
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Generous ceiling: prompt notes vary by song/order; reject only absurd cheats.
const MAX_SCORE_BY_SONG = {
  schnitzel: Math.ceil(80 * 100 * 1.5 * 1.2),
  kaszebe: Math.ceil(120 * 100 * 1.5 * 1.2),
};

let ensured = false;

function sqlClient(databaseUrl) {
  if (!databaseUrl) throw new Error("DATABASE_URL is not set.");
  return neon(databaseUrl);
}

export async function ensureScoresTable(databaseUrl) {
  if (ensured) return;
  const sql = sqlClient(databaseUrl);
  await sql`
    CREATE TABLE IF NOT EXISTS scores (
      user_token uuid NOT NULL,
      song text NOT NULL CHECK (song IN ('schnitzel', 'kaszebe')),
      difficulty text NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard', 'crazy')),
      nickname varchar(10) NOT NULL,
      locale char(2),
      top_score bigint NOT NULL,
      accuracy numeric(5, 2),
      updated_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (user_token, song, difficulty)
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS scores_board_rank_idx
      ON scores (song, difficulty, top_score DESC)
  `;
  ensured = true;
}

function normalizeLocale(value) {
  if (value == null || value === "") return null;
  const code = String(value).trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) {
    throw Object.assign(new Error("Locale must be a 2-letter code."), { status: 400 });
  }
  return code;
}

function normalizeNickname(value) {
  const nickname = String(value ?? "").trim();
  if (!nickname || nickname.length > 10) {
    throw Object.assign(new Error("Nickname must be 1 to 10 characters."), { status: 400 });
  }
  return nickname;
}

export function validateScorePayload(payload) {
  if (!payload || typeof payload !== "object") {
    throw Object.assign(new Error("Score must be an object."), { status: 400 });
  }
  if (!UUID_RE.test(String(payload.userToken ?? ""))) {
    throw Object.assign(new Error("Invalid user token."), { status: 400 });
  }
  if (!SONGS.has(payload.song)) {
    throw Object.assign(new Error("Unknown song."), { status: 400 });
  }
  if (!DIFFICULTIES.has(payload.difficulty)) {
    throw Object.assign(new Error("Unknown difficulty."), { status: 400 });
  }
  const score = Number(payload.score);
  if (!Number.isFinite(score) || score < 0 || !Number.isInteger(score)) {
    throw Object.assign(new Error("Score must be a non-negative integer."), { status: 400 });
  }
  const cap = MAX_SCORE_BY_SONG[payload.song] ?? 20000;
  if (score > cap) {
    throw Object.assign(new Error("Score is not feasible."), { status: 400 });
  }
  const accuracy = payload.accuracy == null ? null : Number(payload.accuracy);
  if (accuracy != null && (!Number.isFinite(accuracy) || accuracy < 0 || accuracy > 100)) {
    throw Object.assign(new Error("Accuracy must be between 0 and 100."), { status: 400 });
  }
  return {
    userToken: String(payload.userToken),
    song: payload.song,
    difficulty: payload.difficulty,
    nickname: normalizeNickname(payload.nickname),
    locale: normalizeLocale(payload.locale),
    score,
    accuracy,
    runId: payload.runId == null ? null : String(payload.runId).slice(0, 80),
  };
}

function mapRow(row, rank) {
  return {
    rank,
    nickname: row.nickname,
    score: Number(row.top_score),
    locale: row.locale || null,
  };
}

export async function listLeaderboard(databaseUrl, { song, difficulty, limit = 10 }) {
  if (!SONGS.has(song) || !DIFFICULTIES.has(difficulty)) {
    throw Object.assign(new Error("Unknown board."), { status: 400 });
  }
  await ensureScoresTable(databaseUrl);
  const sql = sqlClient(databaseUrl);
  const take = Math.min(50, Math.max(1, Number(limit) || 10));
  const rows = await sql`
    SELECT nickname, locale, top_score
    FROM scores
    WHERE song = ${song} AND difficulty = ${difficulty}
    ORDER BY top_score DESC, updated_at ASC
    LIMIT ${take}
  `;
  return rows.map((row, index) => mapRow(row, index + 1));
}

export async function upsertScore(databaseUrl, payload, rateBucket) {
  const data = validateScorePayload(payload);
  if (rateBucket) {
    await consumeRateLimit(databaseUrl, `score:${rateBucket}`, 8, 60);
  }
  await ensureScoresTable(databaseUrl);
  const sql = sqlClient(databaseUrl);
  const rows = await sql`
    INSERT INTO scores (
      user_token, song, difficulty, nickname, locale, top_score, accuracy, updated_at
    )
    VALUES (
      ${data.userToken}::uuid,
      ${data.song},
      ${data.difficulty},
      ${data.nickname},
      ${data.locale},
      ${data.score},
      ${data.accuracy},
      CURRENT_TIMESTAMP
    )
    ON CONFLICT (user_token, song, difficulty)
    DO UPDATE SET
      nickname = CASE
        WHEN EXCLUDED.top_score > scores.top_score THEN EXCLUDED.nickname
        ELSE scores.nickname
      END,
      locale = CASE
        WHEN EXCLUDED.top_score > scores.top_score THEN EXCLUDED.locale
        ELSE scores.locale
      END,
      top_score = CASE
        WHEN EXCLUDED.top_score > scores.top_score THEN EXCLUDED.top_score
        ELSE scores.top_score
      END,
      accuracy = CASE
        WHEN EXCLUDED.top_score > scores.top_score THEN EXCLUDED.accuracy
        ELSE scores.accuracy
      END,
      updated_at = CASE
        WHEN EXCLUDED.top_score > scores.top_score THEN CURRENT_TIMESTAMP
        ELSE scores.updated_at
      END
    RETURNING top_score, nickname, locale, accuracy
  `;
  const row = rows[0];
  const personalBest = Number(row?.top_score) || data.score;
  const improved = personalBest === data.score;
  const leaderboard = await listLeaderboard(databaseUrl, {
    song: data.song,
    difficulty: data.difficulty,
    limit: 10,
  });
  return {
    accepted: true,
    personalBest,
    improved,
    leaderboard,
  };
}
