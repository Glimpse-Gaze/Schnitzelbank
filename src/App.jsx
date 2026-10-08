import { useCallback, useEffect, useRef, useState } from "react";
import Board from "./board/Board.jsx";
import { COUPLETS, NOTE_COUNT, shuffleCouplets } from "./board/couplets.js";
import { linearKaszebe, shuffleKaszebe } from "./board/kaszebe.js";
import Lyrics from "./ui/Lyrics.jsx";
import { CanvasTools, Playback } from "./ui/Transport.jsx";
import useSong, { playResponse, setAudienceLoud, songTime } from "./audio/useSong.js";
import { gradeAt, promptClose, promptForPanel, responseOnGrade, steps } from "./data/sequence.js";
import { bindZoom } from "./scene/zoomBus.js";

function audienceFade(step) {
  const span = step.span || step.lead * 2;
  return Math.min(0.09, Math.max(0.03, span * 0.1));
}

export default function App() {
  const [song, setSong] = useState(null);
  const songRef = useRef(null);
  songRef.current = song;
  const { status, time, countdown, error, volume, setVolume, play, pause, stop } = useSong(song);
  const [hoveredPanel, setHoveredPanel] = useState(null);
  const [clickedPanel, setClickedPanel] = useState(null);
  const [grade, setGrade] = useState(null);
  const [prost, setProst] = useState(null);
  const noteStep = useRef(0);
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
  const [orders, setOrders] = useState(() => ({
    schnitzel: { mode: "shuffled", couplets: shuffleCouplets(COUPLETS) },
    kaszebe: { mode: "shuffled", ...shuffleKaszebe() },
  }));
  const [showCues, setShowCues] = useState(true);
  const recallPlayed = useRef(new Set());
  const misses = useRef(new Set());
  const audienceLoud = useRef(true);
  const mode = song ? orders[song].mode : "shuffled";
  const statusRef = useRef(status);
  statusRef.current = status;

  const onClickPanel = useCallback((name, point) => {
    setClickedPanel(name);
    window.clearTimeout(clickTimer.current);
    clickTimer.current = window.setTimeout(() => setClickedPanel(null), 420);
    if (typeof name === "string" && name.startsWith("N")) {
      const index = Number(name.slice(1)) - 1;
      if (index === noteStep.current) {
        noteStep.current += 1;
        if (noteStep.current === NOTE_COUNT) {
          noteStep.current = 0;
          setProst({ id: Date.now(), point });
        }
      } else {
        noteStep.current = 0;
      }
    }
    if (statusRef.current !== "playing") return;
    const now = songTime();
    const prompt = promptForPanel(now, name);
    if (!prompt || judged.current.has(prompt.index)) return;
    judged.current.add(prompt.index);
    const value = gradeAt(now, prompt);
    if (songRef.current === "kaszebe") {
      if (!responseOnGrade(value)) {
        misses.current.add(prompt.index);
        audienceLoud.current = false;
        setAudienceLoud(false, audienceFade(prompt));
      } else if (!audienceLoud.current) {
        audienceLoud.current = true;
        setAudienceLoud(true, audienceFade(prompt));
      }
    } else if (responseOnGrade(value) && !prompt.dexterity) {
      playResponse(prompt);
    }
    setGrade({ index: prompt.index, value, point: value === "late" ? null : point });
  }, []);

  useEffect(() => {
    if (status !== "playing") return undefined;
    for (const cue of steps) {
      if (!cue.prompt || judged.current.has(cue.index)) continue;
      if (time > promptClose(cue)) {
        judged.current.add(cue.index);
        if (songRef.current === "kaszebe") misses.current.add(cue.index);
        setGrade((current) =>
          current && current.index > cue.index ? current : { index: cue.index, value: "late" },
        );
      }
    }
    return undefined;
  }, [status, time]);

  useEffect(() => {
    if (status !== "playing") return undefined;
    for (const step of steps) {
      if (!step.dexterity || step.chainIndex !== 0 || !step.response) continue;
      if (recallPlayed.current.has(step.recallId)) continue;
      if (time < step.response.start) continue;
      const elapsed = time - step.response.start;
      if (elapsed >= step.response.duration) continue;
      recallPlayed.current.add(step.recallId);
      playResponse(step, elapsed);
    }
    return undefined;
  }, [status, time]);

  useEffect(() => {
    if (song !== "kaszebe" || status !== "playing") return undefined;
    const prompts = steps.filter((step) => step.prompt);
    let plan = { loud: true, fade: 0.08 };
    for (let index = 0; index < prompts.length; index += 1) {
      const step = prompts[index];
      const next = prompts[index + 1];
      const regionEnd = next ? next.open : promptClose(step);
      if (time < step.open) break;
      if (time >= step.open && time < regionEnd) {
        plan = {
          loud: !misses.current.has(step.index),
          fade: audienceFade(step),
        };
        break;
      }
    }
    if (plan.loud === audienceLoud.current) return undefined;
    audienceLoud.current = plan.loud;
    setAudienceLoud(plan.loud, plan.fade);
    return undefined;
  }, [song, status, time]);

  useEffect(() => {
    if (!grade) return undefined;
    const life = grade.value === "late" ? 1400 : 950;
    const id = window.setTimeout(() => setGrade(null), life);
    return () => window.clearTimeout(id);
  }, [grade]);

  useEffect(() => {
    if (!prost) return undefined;
    const id = window.setTimeout(() => setProst(null), 950);
    return () => window.clearTimeout(id);
  }, [prost]);

  useEffect(() => {
    if (status === "playing" || status === "paused") return undefined;
    judged.current.clear();
    recallPlayed.current.clear();
    misses.current.clear();
    audienceLoud.current = true;
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
      if (event.target.closest(".canvas-tools")) return;
      event.preventDefault();
      const current = zoomRef.current ?? fitZoom.current ?? 1;
      setZoomClamped(current / (1 + event.deltaY * 0.001));
    };
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, [setZoomClamped, song]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.code !== "Space" || !songRef.current) return;
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

  const resetView = () => {
    pan.current = { x: 0, y: 0 };
    setPanOffset({ x: 0, y: 0 });
    zoomRef.current = null;
    setZoom(null);
  };

  const openSong = (next) => {
    resetView();
    setSong(next);
  };

  const onShuffle = () => {
    if (!song || mode === "linear") return;
    setOrders((current) => {
      if (song === "schnitzel") {
        const list = current.schnitzel.couplets;
        const next = shuffleCouplets(list);
        const same = next.every((item, index) => item.src === list[index].src);
        const couplets = same ? [...next.slice(1), next[0]] : next;
        return { ...current, schnitzel: { ...current.schnitzel, couplets } };
      }
      return { ...current, kaszebe: { ...current.kaszebe, ...shuffleKaszebe(current.kaszebe) } };
    });
  };

  const onMode = (next) => {
    if (!song || next === mode) return;
    setOrders((current) => {
      if (song === "schnitzel") {
        return {
          ...current,
          schnitzel: {
            mode: next,
            couplets: next === "linear" ? [...COUPLETS] : shuffleCouplets(COUPLETS),
          },
        };
      }
      return {
        ...current,
        kaszebe: {
          mode: next,
          ...(next === "linear" ? linearKaszebe() : shuffleKaszebe()),
        },
      };
    });
    stop();
  };

  const onSwap = () => {
    if (!song) return;
    stop();
    setProst(null);
    noteStep.current = 0;
    openSong(song === "schnitzel" ? "kaszebe" : "schnitzel");
  };

  if (!song) {
    return (
      <div id="app">
        <div className="picker">
          <button type="button" className="picker-card" onClick={() => openSong("schnitzel")}>
            <h1>Schnitzelbank</h1>
            <div className="picker-preview">
              <Board
                song="schnitzel"
                couplets={orders.schnitzel.couplets}
                cards={orders.kaszebe}
                status="stopped"
                hoveredPanel={null}
                clickedPanel={null}
                grade={null}
                prost={null}
                pan={panOffset}
                zoom={null}
                onFitZoom={() => {}}
                onHoverPanel={() => {}}
                onClickPanel={() => {}}
                showCues={false}
                preview
              />
            </div>
          </button>
          <button type="button" className="picker-card" onClick={() => openSong("kaszebe")}>
            <h1>Kaszëbsczé nótë</h1>
            <div className="picker-preview">
              <Board
                song="kaszebe"
                couplets={orders.schnitzel.couplets}
                cards={orders.kaszebe}
                status="stopped"
                hoveredPanel={null}
                clickedPanel={null}
                grade={null}
                prost={null}
                pan={{ x: 0, y: 0 }}
                zoom={null}
                onFitZoom={() => {}}
                onHoverPanel={() => {}}
                onClickPanel={() => {}}
                showCues={false}
                preview
              />
            </div>
          </button>
        </div>
      </div>
    );
  }

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
          song={song}
          couplets={orders.schnitzel.couplets}
          cards={orders.kaszebe}
          status={status}
          hoveredPanel={hoveredPanel}
          clickedPanel={clickedPanel}
          grade={grade}
          prost={prost}
          pan={panOffset}
          zoom={zoom}
          onFitZoom={onFitZoom}
          onHoverPanel={setHoveredPanel}
          onClickPanel={onClickPanel}
          showCues={showCues}
        />
        {countdown ? (
          <div className="countdown" aria-live="assertive">
            <span>{countdown}</span>
          </div>
        ) : null}
      </div>
      <section className="player" aria-label="Player">
        <Lyrics status={status} time={time} error={error} />
        <div className="player-actions">
          <button
            type="button"
            className="shuffle shuffle--dock"
            onClick={onShuffle}
            disabled={mode === "linear"}
          >
            Shuffle
          </button>
          <Playback status={status} onPlay={play} onPause={pause} onStop={stop} />
        </div>
        <CanvasTools
          volume={volume}
          onVolume={setVolume}
          showCues={showCues}
          onToggleCues={() => setShowCues((current) => !current)}
          mode={mode}
          onMode={onMode}
          onSwap={onSwap}
          swapDetail={song === "schnitzel" ? "Open Kaszëbsczé nótë." : "Open Schnitzelbank."}
          onOpenSettings={() => {
            if (status === "playing" || status === "counting") pause();
          }}
        />
      </section>
    </div>
  );
}
