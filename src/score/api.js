export async function fetchLeaderboard(song, difficulty, limit = 10) {
  const params = new URLSearchParams({
    song,
    difficulty,
    limit: String(limit),
  });
  const response = await fetch(`/api/leaderboard?${params}`);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || "Could not load leaderboard.");
  }
  const data = await response.json();
  return Array.isArray(data.entries) ? data.entries : [];
}

export async function submitScore(payload) {
  const response = await fetch("/api/scores", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Could not submit score.");
  }
  return data;
}
