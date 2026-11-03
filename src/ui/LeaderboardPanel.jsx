import { useEffect, useState } from "react";
import { fetchLeaderboard } from "../score/api.js";
import { difficultyLabel } from "../score/difficulty.js";
import { getLocalBest } from "../score/storage.js";

function localeCell(code) {
  return code ? String(code).toUpperCase() : "-";
}

function accuracyCell(value) {
  if (value == null || !Number.isFinite(Number(value))) return "-";
  return `${Math.round(Number(value))}`;
}

export default function LeaderboardPanel({
  song,
  difficulty,
  open,
  onToggle,
  refreshKey = 0,
}) {
  const [entries, setEntries] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const localBest = song && difficulty ? getLocalBest(song, difficulty) : null;

  useEffect(() => {
    if (!open || !song || !difficulty) return undefined;
    let cancelled = false;
    setLoading(true);
    setError("");
    fetchLeaderboard(song, difficulty, 10)
      .then((rows) => {
        if (!cancelled) setEntries(rows);
      })
      .catch((err) => {
        if (!cancelled) {
          setEntries([]);
          setError(err instanceof Error ? err.message : "Could not load.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, song, difficulty, refreshKey]);

  const title = song === "kaszebe" ? "KASZEBE RANKING" : "SCHNITZEL RANKING";
  const inTop = localBest
    ? entries.some((entry) => entry.score === localBest.score)
    : false;

  return (
    <aside className={open ? "leaderboard is-open" : "leaderboard"} aria-label="Leaderboard">
      <button type="button" className="leaderboard__toggle" onClick={onToggle} aria-expanded={open}>
        {open ? "Hide scores" : "Scores"}
      </button>
      {open ? (
        <div className="leaderboard__panel">
          <p className="leaderboard__title">{title}</p>
          <p className="leaderboard__course">{difficultyLabel(difficulty)}</p>
          <div className="leaderboard__head" aria-hidden="true">
            <span>#</span>
            <span>SCORE</span>
            <span>ACC</span>
            <span>NAME</span>
            <span>LOC</span>
          </div>
          {loading ? <p className="leaderboard__empty">Loading…</p> : null}
          {error ? <p className="leaderboard__empty">{error}</p> : null}
          {!loading && !error && !entries.length ? (
            <p className="leaderboard__empty">No scores yet. Be the first.</p>
          ) : null}
          <ol className="leaderboard__list">
            {entries.map((entry) => (
              <li key={`${entry.rank}-${entry.nickname}-${entry.score}`} className={entry.rank === 1 ? "is-top" : undefined}>
                <span>{entry.rank}</span>
                <span>{entry.score}</span>
                <span>{accuracyCell(entry.accuracy)}</span>
                <span>{entry.nickname}</span>
                <span>{localeCell(entry.locale)}</span>
              </li>
            ))}
          </ol>
          {localBest && !inTop ? (
            <p className="leaderboard__personal">
              Your best: {localBest.score}
            </p>
          ) : null}
        </div>
      ) : null}
    </aside>
  );
}
