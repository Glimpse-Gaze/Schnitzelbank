const TOKEN_KEY = "sb_user_token";
const PROFILE_KEY = "sb_profile";
const BEST_PREFIX = "sb_local_best:";

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getUserToken() {
  let token = localStorage.getItem(TOKEN_KEY);
  if (token) return token;
  token =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `sb-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  localStorage.setItem(TOKEN_KEY, token);
  return token;
}

export function getProfile() {
  return readJson(PROFILE_KEY, { nickname: "", locale: null, localeName: "" });
}

export function saveProfile(profile) {
  writeJson(PROFILE_KEY, {
    nickname: String(profile.nickname ?? "").slice(0, 10),
    locale: profile.locale || null,
    localeName: profile.localeName || "",
  });
}

function bestKey(song, difficulty) {
  return `${BEST_PREFIX}${song}:${difficulty}`;
}

export function getLocalBest(song, difficulty) {
  return readJson(bestKey(song, difficulty), null);
}

export function updateLocalBest(song, difficulty, result) {
  const previous = getLocalBest(song, difficulty);
  if (previous && Number(previous.score) >= Number(result.score)) {
    return { best: previous, improved: false };
  }
  const best = {
    score: Number(result.score) || 0,
    accuracy: Number(result.accuracy) || 0,
    updatedAt: new Date().toISOString(),
  };
  writeJson(bestKey(song, difficulty), best);
  return { best, improved: true };
}
