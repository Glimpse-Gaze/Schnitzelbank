import { stepAt, steps } from "../data/sequence.js";

export default function Lyrics({ status, time, error }) {
  const active = status === "playing" || status === "paused";
  const step = active ? stepAt(time) : null;
  const answerStarted = step?.prompt && time >= step.perfect;

  return (
    <section className="lyrics" aria-live="polite">
      <p className="lyrics__count" aria-hidden={step ? undefined : true}>
        {step ? `${step.index + 1} / ${steps.length}` : "\u00a0"}
      </p>
      {error ? <p className="lyrics__error">{error}</p> : null}
      <div className="lyrics__block">
        {step ? (
          step.lines.map((line, index) => {
            const audience = line.voice === "audience";
            const live = step.tone === "reply" || (audience && (answerStarted || step.lines.every((item) => item.voice === "audience")));
            const waiting = step.tone === "caller" || (audience && !live);
            const className = live
              ? "lyrics__line is-audience"
              : waiting
                ? "lyrics__line is-waiting"
                : "lyrics__line";
            const label = line.repeat ? `${line.text} x${line.repeat}` : line.text;
            return (
              <p key={`${line.text}-${index}`} className={className} style={{ "--chars": label.length }}>
                {line.text}
                {line.repeat ? <span className="lyrics__repeat">x{line.repeat}</span> : null}
              </p>
            );
          })
        ) : (
          status === "counting" ? (
            <p className="lyrics__line">Get ready.</p>
          ) : (
            <>
              <p className="lyrics__line" style={{ "--chars": 33 }}>
                Play the song. Click the picture
              </p>
              <p className="lyrics__line" style={{ "--chars": 33 }}>
                when the frame meets it.
              </p>
            </>
          )
        )}
      </div>
      <div className="lyrics__meter" aria-hidden="true">
        <span style={{ width: step ? `${Math.min(100, step.progress * 100)}%` : "0%" }} />
      </div>
    </section>
  );
}
