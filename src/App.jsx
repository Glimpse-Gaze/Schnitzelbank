import { useCallback, useEffect, useRef, useState } from "react";
import Board from "./board/Board.jsx";
import { COUPLETS, shuffleCouplets } from "./board/couplets.js";
import Lyrics from "./ui/Lyrics.jsx";
import Transport from "./ui/Transport.jsx";
import useSong, { playResponse, songTime } from "./audio/useSong.js";
import { gradeAt, promptClose, promptForPanel, responseOnGrade, steps } from "./data/sequence.js";
import { bindZoom } from "./scene/zoomBus.js";

export default function App() {
  const { status, time, countdown, error, volume, setVolume, play, pause, stop } = useSong();
  const [hoveredPanel, setHoveredPanel] = useState(null);
  const [clickedPanel, setClickedPanel] = useState(null);
  const [grade, setGrade] = useState(null);
  const clickTimer = useRef(0);
  const judged = useRef(new Set());
  const pan = useRef({ x: 0, y: 0 });
  const drag = useRef(null);
  const stageRef = useRef(null);
  const zoomRef = useRef(null);
  const fitZoom = useRef(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(null);
  const [panning, setPanning] = useState(false);
  const [couplets, setCouplets] = useState(() => shuffleCouplets(COUPLETS));
  const statusRef = useRef(status);
  statusRef.current = status;

  const onClickPanel = useCallback((name) => {
    setClickedPanel(name);
    window.clearTimeout(clickTimer.current);
    clickTimer.current = window.setTimeout(() => setClickedPanel(null), 420);
    if (statusRef.current !== "playing") return;
    const now = songTime();
    const prompt = promptForPanel(now, name);
    if (!prompt || judged.current.has(prompt.index)) return;
    judged.current.add(prompt.index);
    const value = gradeAt(now, prompt);
    if (responseOnGrade(value)) playResponse(prompt);
    setGrade({ index: prompt.index, value });
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
    if (!grade) return undefined;
    const id = window.setTimeout(() => setGrade(null), 2500);
    return () => window.clearTimeout(id);
  }, [grade]);

  useEffect(() => {
    if (status === "playing" || status === "paused") return undefined;
    judged.current.clear();
    setGrade(null);
    return undefined;
  }, [status]);

  useEffect(() => () => window.clearTimeout(clickTimer.current), []);

  const onFitZoom = useCallback((value) => {
    fitZoom.current = value;
  }, []);

  const setZoomClamped = useCallback((value) => {
    const fit = fitZoom.current || 1;
    const next = Math.min(Math.max(fit * 3, fit), Math.max(1, value));
    zoomRef.current = next;
    setZoom(next);
  }, []);

  useEffect(() => bindZoom((direction) => {
    const current = zoomRef.current ?? fitZoom.current ?? 1;
    setZoomClamped(current / (1 + direction * 0.18));
  }), [setZoomClamped]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;
    const onWheel = (event) => {
      event.preventDefault();
      const current = zoomRef.current ?? fitZoom.current ?? 1;
      setZoomClamped(current / (1 + event.deltaY * 0.001));
    };
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, [setZoomClamped]);

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

  const onStagePointerDown = (event) => {
    if (event.button !== 1 && event.button !== 2) return;
    event.preventDefault();
    drag.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      ox: pan.current.x,
      oy: pan.current.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setPanning(true);
  };

  const onStagePointerMove = (event) => {
    const current = drag.current;
    if (!current || event.pointerId !== current.id) return;
    const stage = event.currentTarget;
    const frame = stage.querySelector(".board-frame");
    const scale = zoomRef.current ?? fitZoom.current ?? 1;
    const layoutW = frame?.clientWidth ?? stage.clientWidth;
    const layoutH = frame?.clientHeight ?? stage.clientHeight;
    const limitX = Math.max(stage.clientWidth * 0.2, (layoutW * (scale - 1)) / 2 + layoutW * 0.2);
    const limitY = Math.max(stage.clientHeight * 0.2, (layoutH * (scale - 1)) / 2 + layoutH * 0.2);
    const next = {
      x: Math.min(limitX, Math.max(-limitX, current.ox + event.clientX - current.x)),
      y: Math.min(limitY, Math.max(-limitY, current.oy + event.clientY - current.y)),
    };
    pan.current = next;
    setPanOffset(next);
  };

  const onStagePointerUp = (event) => {
    if (!drag.current || event.pointerId !== drag.current.id) return;
    drag.current = null;
    setPanning(false);
  };

  return (
    <div id="app">
      <div
        ref={stageRef}
        className={panning ? "stage is-panning" : "stage"}
        onPointerDown={onStagePointerDown}
        onPointerMove={onStagePointerMove}
        onPointerUp={onStagePointerUp}
        onPointerCancel={onStagePointerUp}
        onMouseDown={(event) => {
          if (event.button === 1) event.preventDefault();
        }}
        onAuxClick={(event) => event.preventDefault()}
        onContextMenu={(event) => event.preventDefault()}
      >
        <Board
          couplets={couplets}
          status={status}
          hoveredPanel={hoveredPanel}
          clickedPanel={clickedPanel}
          grade={grade}
          pan={panOffset}
          zoom={zoom}
          onFitZoom={onFitZoom}
          onHoverPanel={setHoveredPanel}
          onClickPanel={onClickPanel}
        />
        {countdown ? (
          <div className="countdown" aria-live="assertive">
            <span>{countdown}</span>
          </div>
        ) : null}
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
          onShuffle={() => {
            setCouplets((current) => {
              const next = shuffleCouplets(current);
              const same = next.every((item, index) => item.src === current[index].src);
              return same ? [...next.slice(1), next[0]] : next;
            });
          }}
        />
      </section>
    </div>
  );
}
