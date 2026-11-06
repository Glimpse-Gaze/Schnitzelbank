import { useEffect, useMemo, useRef, useState } from "react";
import {
  findCanonicalCountry,
  getCountrySuggestions,
  iso2ForCountry,
} from "../data/countries.js";
import { submitScore } from "../score/api.js";
import { difficultyLabel } from "../score/difficulty.js";
import { getProfile, getUserToken, saveProfile } from "../score/storage.js";

export default function ResultsModal({
  open,
  result,
  song,
  difficulty,
  onClose,
  onSubmitted,
}) {
  const profile = useMemo(() => getProfile(), [open]);
  const [nickname, setNickname] = useState(profile.nickname || "");
  const [countryQuery, setCountryQuery] = useState(profile.localeName || "");
  const [locale, setLocale] = useState(profile.locale || null);
  const [suggestions, setSuggestions] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const nicknameRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const next = getProfile();
    setNickname(next.nickname || "");
    setCountryQuery(next.localeName || "");
    setLocale(next.locale || null);
    setSuggestions([]);
    setBusy(false);
    setMessage("");
    setSubmitted(false);
    const id = window.setTimeout(() => nicknameRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [open, result?.runId]);

  if (!open || !result) return null;

  const onCountryInput = (value) => {
    setCountryQuery(value);
    const matchId = findCanonicalCountry(value);
    if (matchId) {
      setLocale(iso2ForCountry(matchId));
    } else if (!value.trim()) {
      setLocale(null);
    }
    setSuggestions(getCountrySuggestions(value, 6));
  };

  const pickCountry = (entry) => {
    setCountryQuery(entry.name);
    setLocale(entry.iso2);
    setSuggestions([]);
  };

  const onSubmit = async (event) => {
    event?.preventDefault?.();
    const name = nickname.trim().slice(0, 10);
    if (!name) {
      setMessage("Enter a nickname (up to 10 characters).");
      nicknameRef.current?.focus();
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      saveProfile({ nickname: name, locale, localeName: countryQuery.trim() });
      const data = await submitScore({
        userToken: getUserToken(),
        song,
        difficulty,
        nickname: name,
        locale,
        score: result.score,
        accuracy: result.accuracy,
        runId: result.runId,
      });
      setSubmitted(true);
      setMessage(data.improved ? "New personal best submitted." : "Submitted. Existing best kept.");
      onSubmitted?.(data);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not submit.");
    } finally {
      setBusy(false);
    }
  };

  const shieldTransportKeys = (event) => {
    if (event.code === "Space" || event.key === "Enter") {
      event.stopPropagation();
    }
  };

  return (
    <div
      className="results-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Run results"
      onKeyDown={shieldTransportKeys}
      onKeyUp={shieldTransportKeys}
    >
      <form className="results-modal__card" onSubmit={onSubmit}>
        <p className="results-modal__eyebrow">{difficultyLabel(difficulty)}</p>
        <h2 className="results-modal__title">
          {result.reason === "complete" ? "Song clear" : "Run stopped"}
        </h2>
        <p className="results-modal__score">{result.score}</p>
        <ul className="results-modal__stats">
          <li>Accuracy {result.accuracy.toFixed(1)}%</li>
          <li>Peak combo ×{result.peakCombo.toFixed(2)}</li>
          {song === "schnitzel" ? <li>Prost clears {result.prostCount}</li> : null}
          {result.bonusActive ? <li>Bonus ×1.2 was active</li> : null}
        </ul>
        <label className="results-modal__field">
          <span>Nickname</span>
          <input
            ref={nicknameRef}
            name="nickname"
            value={nickname}
            maxLength={10}
            autoComplete="off"
            spellCheck={false}
            onChange={(event) => setNickname(event.target.value.slice(0, 10))}
            onKeyDown={shieldTransportKeys}
          />
        </label>
        <label className="results-modal__field">
          <span>Country (optional)</span>
          <input
            name="country"
            value={countryQuery}
            autoComplete="off"
            spellCheck={false}
            placeholder="Type to search"
            onChange={(event) => onCountryInput(event.target.value)}
            onKeyDown={shieldTransportKeys}
          />
        </label>
        {suggestions.length ? (
          <ul className="results-modal__suggest">
            {suggestions.map((entry) => (
              <li key={entry.id}>
                <button type="button" onClick={() => pickCountry(entry)}>
                  {entry.name} <small>{entry.iso2}</small>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {message ? <p className="results-modal__message">{message}</p> : null}
        <div className="results-modal__actions">
          <button type="button" className="results-modal__ghost" onClick={onClose}>
            Dismiss
          </button>
          <button
            type="submit"
            className="results-modal__submit"
            disabled={busy || submitted}
          >
            {submitted ? "Submitted" : busy ? "Sending…" : "Submit"}
          </button>
        </div>
      </form>
    </div>
  );
}
