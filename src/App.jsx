import { useCallback, useEffect, useRef, useState } from "react";
import Scene from "./scene/Scene.jsx";
import Lyrics from "./ui/Lyrics.jsx";
import Transport from "./ui/Transport.jsx";
import useSong, { songTime } from "./audio/useSong.js";
import { gradeAt, promptClose, promptForPanel, stepAt, steps } from "./data/sequence.js";
import { showPointingHand } from "./playMode.js";

const GRADE_LABEL = {
  perfect: "Perfect",
  good: "Good",
  ok: "OK",
  early: "Too early",
  late: "Too late",
};

function gradeLabel(value) {
  return GRADE_LABEL[value] ?? "";
}

export default function App() {
  const { status, time, countdown, error, volume, setVolume, play, pause, stop } = useSong();
  const [hoveredPanel, setHoveredPanel] = useState(null);
  const [clickedPanel, setClickedPanel] = useState(null);
  const [grade, setGrade] = useState(null);
  const clickTimer = useRef(0);
  const gradeRef = useRef(null);
  const judged = useRef(new Set());
  const statusRef = useRef(status);
  statusRef.current = status;
  const step = status === "playing" || status === "paused" ? stepAt(time) : null;

  const onClickPanel = useCallback((name) => {
    setClickedPanel(name);
    window.clearTimeout(clickTimer.current);
    clickTimer.current = window.setTimeout(() => setClickedPanel(null), 420);
    if (statusRef.current !== "playing") return;
    const now = songTime();
    const prompt = promptForPanel(now, name);
    if (!prompt || judged.current.has(prompt.index)) return;
    judged.current.add(prompt.index);
    setGrade({ index: prompt.index, value: gradeAt(now, prompt) });
  }, []);

  useEffect(() => {
    if (status !== "playing") return undefined;
    for (const cue of steps) {
      if (!cue.prompt || judged.current.has(cue.index)) continue;
      if (time > promptClose(cue)) {
        judged.current.add(cue.index);
        setGrade((current) =>
          current && current.index > cue.index ? current : { index: cue.index, value: "late" },
        );
      }
    }
    return undefined;
  }, [status, time]);

  useEffect(() => {
    if (!grade || (status !== "playing" && status !== "paused")) return undefined;
    const cue = steps[grade.index];
    const next = steps.find((item) => item.prompt && item.index > grade.index);
    if (next && time >= next.start && time > promptClose(cue) + 0.7) setGrade(null);
    return undefined;
  }, [grade, status, time]);

  useEffect(() => {
    if (status === "playing" || status === "paused") return undefined;
    judged.current.clear();
    setGrade(null);
    return undefined;
  }, [status]);

  useEffect(() => () => window.clearTimeout(clickTimer.current), []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.code !== "Space") return;
      event.preventDefault();
      if (status === "playing") pause();
      else play();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [status, play, pause]);

  return (
    <div id="app">
      <div className="stage">
        <Scene
          hoveredPanel={hoveredPanel}
          cuedPanel={step?.panel ?? null}
          clickedPanel={clickedPanel}
          showPointer={showPointingHand()}
          grade={grade}
          gradeRef={gradeRef}
          onHoverPanel={setHoveredPanel}
          onClickPanel={onClickPanel}
        />
        {countdown ? (
          <div className="countdown" aria-live="assertive">
            <span>{countdown}</span>
          </div>
        ) : null}
        <div ref={gradeRef} className="grade-anchor">
          {grade ? (
            <span
              key={`${grade.index}-${grade.value}`}
              className={
                grade.value === "early" || grade.value === "late"
                  ? "grade-float is-miss"
                  : "grade-float"
              }
              aria-live="polite"
            >
              {gradeLabel(grade.value)}
            </span>
          ) : null}
        </div>
      </div>
      <section className="player" aria-label="Player">
        <Lyrics status={status} time={time} error={error} />
        <Transport
          status={status}
          volume={volume}
          onVolume={setVolume}
          onPlay={play}
          onPause={pause}
          onStop={stop}
        />
      </section>
    </div>
  );
}
