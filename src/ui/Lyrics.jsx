import { stepAt, steps } from "../data/sequence.js";

export default function Lyrics({ status, time, error }) {
  const active = status === "playing" || status === "paused";
  const step = active ? stepAt(time) : null;
  const phraseLabel = step ? `${step.index + 1} / ${steps.length}` : `${steps.length} phrases`;

  return (
    <section className="lyrics" aria-live="polite">
      <div className="lyrics__heading">
        <p className="lyrics__kicker">Schnitzelbank</p>
        <p className="lyrics__count">{phraseLabel}</p>
      </div>
      {error ? <p className="lyrics__error">{error}</p> : null}
      {step ? (
        <>
          <div className="lyrics__block">
            {step.lines.map((line) => (
              <p key={line} className="lyrics__line">
                {line}
              </p>
            ))}
          </div>
          <div className="lyrics__meter" aria-hidden="true">
            <span style={{ width: `${Math.min(100, step.progress * 100)}%` }} />
          </div>
        </>
      ) : (
        <p className="lyrics__idle">
          {status === "counting" ? "Get ready." : "Play the song, then follow the pointing hand."}
        </p>
      )}
    </section>
  );
}
