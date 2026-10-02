import { useCallback, useEffect, useRef, useState } from "react";
import Scene from "./scene/Scene.jsx";
import Lyrics from "./ui/Lyrics.jsx";
import Transport from "./ui/Transport.jsx";
import useSong from "./audio/useSong.js";
import { stepAt } from "./data/sequence.js";

export default function App() {
  const { status, time, countdown, error, play, pause, stop } = useSong();
  const [hoveredPanel, setHoveredPanel] = useState(null);
  const [clickedPanel, setClickedPanel] = useState(null);
  const clickTimer = useRef(0);
  const step = status === "playing" || status === "paused" ? stepAt(time) : null;

  const onClickPanel = useCallback((name) => {
    setClickedPanel(name);
    window.clearTimeout(clickTimer.current);
    clickTimer.current = window.setTimeout(() => setClickedPanel(null), 420);
  }, []);

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
      <Scene
        hoveredPanel={hoveredPanel}
        cuedPanel={step?.panel ?? null}
        clickedPanel={clickedPanel}
        onHoverPanel={setHoveredPanel}
        onClickPanel={onClickPanel}
      />
      {countdown ? (
        <div className="countdown" aria-live="assertive">
          <span>{countdown}</span>
        </div>
      ) : null}
      <div className="hud">
        <Lyrics status={status} time={time} error={error} />
        <Transport status={status} onPlay={play} onPause={pause} onStop={stop} />
      </div>
    </div>
  );
}
