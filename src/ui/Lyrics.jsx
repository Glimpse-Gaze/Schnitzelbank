import { stepAt } from "../data/sequence.js";

export default function Lyrics({ status, time, error }) {
  const step = status === "playing" || status === "paused" ? stepAt(time) : null;

  return (
    <section className="lyrics" aria-live="polite">
      <p className="lyrics__kicker">Schnitzelbank</p>
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
