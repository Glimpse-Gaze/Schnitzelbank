import { stepAt, steps } from "../data/sequence.js";

export default function Lyrics({ status, time, error }) {
  const active = status === "playing" || status === "paused";
  const step = active ? stepAt(time) : null;
  const phraseLabel = step ? `${step.index + 1} / ${steps.length}` : `${steps.length} phrases`;
  const answerStarted = step?.prompt && time >= step.perfect;

  return (
    <section className="lyrics" aria-live="polite">
      <div className="lyrics__heading">
        <p className="lyrics__kicker">Schnitzelbank</p>
        <p className="lyrics__count">{phraseLabel}</p>
      </div>
      {error ? <p className="lyrics__error">{error}</p> : null}
      <div className="lyrics__block">
        {step ? (
          step.lines.map((line, index) => {
            const audience = line.voice === "audience";
            const live = audience && (answerStarted || step.lines.every((item) => item.voice === "audience"));
            const waiting = audience && !live;
            const className = live
              ? "lyrics__line is-audience"
              : waiting
                ? "lyrics__line is-waiting"
                : "lyrics__line";
            return (
              <p key={`${line.text}-${index}`} className={className}>
                {line.text}
                {line.repeat ? <span className="lyrics__repeat">x2</span> : null}
              </p>
            );
          })
        ) : (
          <p className="lyrics__idle">
            {status === "counting"
              ? "Get ready."
              : "Play the song. Click the picture when the frame meets it."}
          </p>
        )}
      </div>
      <div className="lyrics__meter" aria-hidden="true">
        <span style={{ width: step ? `${Math.min(100, step.progress * 100)}%` : "0%" }} />
      </div>
    </section>
  );
}
