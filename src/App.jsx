import { useCallback, useEffect, useRef, useState } from "react";
import Board from "./board/Board.jsx";
import { COUPLETS, NOTE_COUNT, shuffleCouplets } from "./board/couplets.js";
import { linearKaszebe, shuffleKaszebe } from "./board/kaszebe.js";
import Lyrics from "./ui/Lyrics.jsx";
import LeaderboardPanel from "./ui/LeaderboardPanel.jsx";
import ResultsModal from "./ui/ResultsModal.jsx";
import { CanvasTools, Playback } from "./ui/Transport.jsx";
import useSong, { playResponse, setAudienceLoud, songTime } from "./audio/useSong.js";
import {
  gradeAt,
  gradeRelease,
  holdForPanel,
  isRefrainAt,
  promptClose,
  promptForPanel,
  releaseClose,
  responseOnGrade,
  steps,
} from "./data/sequence.js";
import {
  difficultyFromSettings,
  settingsFromDifficulty,
} from "./score/difficulty.js";
import {
  PROST_MULTIPLIER,
  accuracyOf,
  applyGrade,
  completeProst,
  createRunState,
  enterRefrain,
  finalizeRun,
  leaveRefrain,
  newRunId,
} from "./score/scoring.js";
import { getUserToken, updateLocalBest } from "./score/storage.js";
import { bindZoom } from "./scene/zoomBus.js";

function audienceFade(step) {
  const span = step.span || step.lead * 2;
  return Math.min(0.09, Math.max(0.03, span * 0.1));
}

function seconds(value) {
  return Math.round(value * 1000) / 1000;
}

function panelLabel(panel) {
  const step = steps.find((item) => item.panel === panel && item.lines?.length);
  if (!step) return "";
  return step.lines.map((line) => line.text).join(" ");
}

export default function App() {
  const [song, setSong] = useState(null);
  const songRef = useRef(null);
  songRef.current = song;
  const { status, time, countdown, error, volume, setVolume, play, pause, stop, endReason } =
    useSong(song);
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
    schnitzel: { mode: "linear", couplets: [...COUPLETS] },
    kaszebe: { mode: "linear", ...linearKaszebe() },
  }));
  const [showCues, setShowCues] = useState(true);
  const [devTiming, setDevTiming] = useState(false);
  const [timingTakes, setTimingTakes] = useState(0);
  const devTimingRef = useRef(false);
  const timingLog = useRef({ takes: [] });
  const openTake = useRef(null);
  const pendingTiming = useRef(null);
  devTimingRef.current = devTiming;
  const recallPlayed = useRef(new Set());
  const misses = useRef(new Set());
  const audienceLoud = useRef(true);
  const armed = useRef(null);
  const [holding, setHolding] = useState(false);
  const mode = song ? orders[song].mode : "linear";
  const difficulty = difficultyFromSettings(mode, showCues);
  const statusRef = useRef(status);
  statusRef.current = status;

  const runRef = useRef(null);
  const runLive = useRef(false);
  const runStarted = useRef(false);
  const prevStatus = useRef(status);
  const inRefrainRef = useRef(false);
  const [liveScore, setLiveScore] = useState(0);
  const [liveCombo, setLiveCombo] = useState(1);
  const [liveBonus, setLiveBonus] = useState(1);
  const [results, setResults] = useState(null);
  const [boardOpen, setBoardOpen] = useState(false);
  const [boardRefresh, setBoardRefresh] = useState(0);
  const [scrambling, setScrambling] = useState(false);
  const userShuffledRef = useRef(false);
  const scrambleGen = useRef(0);
  const endReasonRef = useRef(endReason);
  endReasonRef.current = endReason;
  const showCuesRef = useRef(showCues);
  showCuesRef.current = showCues;
  const ordersRef = useRef(orders);
  ordersRef.current = orders;
  const modeRef = useRef(mode);
  modeRef.current = mode;

  useEffect(() => {
    getUserToken();
  }, []);

  const syncRunView = useCallback((next) => {
    runRef.current = next;
    setLiveScore(next?.score ?? 0);
    setLiveCombo(next?.comboMult ?? 1);
    setLiveBonus(next?.bonusActive ? PROST_MULTIPLIER : 1);
  }, []);

  const recordGrade = useCallback(
    (value) => {
      if (!runLive.current || !runRef.current || runRef.current.finalized) return;
      if (statusRef.current !== "playing") return;
      const next = applyGrade(runRef.current, value, PROST_MULTIPLIER);
      syncRunView(next);
    },
    [syncRunView],
  );

  const onClickPanel = useCallback(
    (name, point) => {
      setClickedPanel(name);
      window.clearTimeout(clickTimer.current);
      clickTimer.current = window.setTimeout(() => setClickedPanel(null), 420);

      if (typeof name === "string" && name.startsWith("N")) {
        const playing = statusRef.current === "playing";
        const stopped = statusRef.current === "stopped" || statusRef.current === "paused";
        const allowPractice = stopped && !runLive.current;
        const allowLive = playing && songRef.current === "schnitzel" && inRefrainRef.current;
        if (allowPractice || allowLive) {
          const index = Number(name.slice(1)) - 1;
          if (index === noteStep.current) {
            noteStep.current += 1;
            if (noteStep.current === NOTE_COUNT) {
              noteStep.current = 0;
              setProst({ id: Date.now(), point });
              if (allowLive && runRef.current) {
                const { state } = completeProst(runRef.current, true);
                syncRunView(state);
              }
            }
          } else {
            noteStep.current = 0;
          }
        }
      }

      if (statusRef.current !== "playing" || devTimingRef.current) return;
      if (!runLive.current || runRef.current?.finalized) return;
      const now = songTime();
      const prompt = promptForPanel(now, name);
      if (!prompt || prompt.hold || judged.current.has(prompt.index)) return;
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
      recordGrade(value);
      setGrade({ index: prompt.index, value, point: value === "late" ? null : point });
    },
    [recordGrade, syncRunView],
  );

  const missAudience = (step) => {
    misses.current.add(step.index);
    audienceLoud.current = false;
    setAudienceLoud(false, audienceFade(step));
  };

  const onHoldStart = useCallback(
    (name, point) => {
      if (devTimingRef.current) {
        if (statusRef.current !== "playing" || songRef.current !== "kaszebe") return;
        pendingTiming.current = { panel: name, down: songTime() };
        return;
      }
      if (statusRef.current !== "playing" || songRef.current !== "kaszebe") return;
      if (!runLive.current || runRef.current?.finalized) return;
      const now = songTime();
      const step = holdForPanel(now, name);
      if (!step || judged.current.has(step.index) || armed.current) return;
      const value = gradeAt(now, step);
      if (!responseOnGrade(value)) {
        judged.current.add(step.index);
        missAudience(step);
        recordGrade(value);
        setGrade({ index: step.index, value, point: value === "late" ? null : point });
        return;
      }
      armed.current = { index: step.index, press: value, point };
      setHolding(true);
      recordGrade(value);
      setGrade({ index: step.index, value, point, part: "press" });
    },
    [recordGrade],
  );

  const onHoldEnd = useCallback(() => {
    if (devTimingRef.current) {
      const pending = pendingTiming.current;
      if (!pending) return;
      pendingTiming.current = null;
      const up = seconds(songTime());
      const down = seconds(pending.down);
      const event = {
        panel: pending.panel,
        label: panelLabel(pending.panel),
        down,
        up,
        held: seconds(Math.max(0, up - down)),
      };
      if (!openTake.current) {
        openTake.current = { take: timingLog.current.takes.length + 1, events: [] };
      }
      openTake.current.events.push(event);
      console.log("[timing]", event);
      return;
    }
    const current = armed.current;
    if (!current) return;
    armed.current = null;
    setHolding(false);
    const step = steps[current.index];
    if (!step || judged.current.has(step.index)) return;
    judged.current.add(step.index);
    const released = gradeRelease(songTime(), step);
    recordGrade(released);
    setGrade({
      index: step.index,
      value: released,
      point: released === "late" ? null : current.point,
      part: "release",
    });
  }, [recordGrade]);

  useEffect(() => {
    if (devTimingRef.current) return undefined;
    if (status !== "playing") return undefined;
    for (const cue of steps) {
      if (!cue.prompt || judged.current.has(cue.index)) continue;
      if (cue.hold && armed.current?.index === cue.index) {
        if (time > releaseClose(cue)) {
          judged.current.add(cue.index);
          armed.current = null;
          setHolding(false);
          recordGrade("late");
          setGrade((current) =>
            current && current.index > cue.index ? current : { index: cue.index, value: "late", part: "release" },
          );
        }
        continue;
      }
      if (time > promptClose(cue)) {
        judged.current.add(cue.index);
        if (songRef.current === "kaszebe") misses.current.add(cue.index);
        recordGrade("late");
        setGrade((current) =>
          current && current.index > cue.index ? current : { index: cue.index, value: "late" },
        );
      }
    }
    return undefined;
  }, [status, time, recordGrade]);

  useEffect(() => {
    if (status !== "playing" || song !== "schnitzel") {
      inRefrainRef.current = false;
      return undefined;
    }
    const nowRefrain = isRefrainAt(time);
    if (nowRefrain && !inRefrainRef.current) {
      inRefrainRef.current = true;
      noteStep.current = 0;
      if (runRef.current) syncRunView(enterRefrain(runRef.current));
    } else if (!nowRefrain && inRefrainRef.current) {
      inRefrainRef.current = false;
      noteStep.current = 0;
      if (runRef.current) syncRunView(leaveRefrain(runRef.current));
    }
    return undefined;
  }, [status, time, song, syncRunView]);

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
    if (devTiming) return undefined;
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
  }, [song, status, time, devTiming]);

  useEffect(() => {
    if (!devTiming || song !== "kaszebe") return undefined;
    if (status === "playing" && !openTake.current) {
      openTake.current = { take: timingLog.current.takes.length + 1, events: [] };
      console.info(`[timing] take ${openTake.current.take} started`);
    }
    if (status === "stopped" && openTake.current) {
      if (pendingTiming.current) {
        const pending = pendingTiming.current;
        pendingTiming.current = null;
        openTake.current.events.push({
          panel: pending.panel,
          label: panelLabel(pending.panel),
          down: seconds(pending.down),
          up: null,
          held: null,
          note: "playback stopped while the button was still held",
        });
      }
      if (openTake.current.events.length) {
        timingLog.current.takes.push(openTake.current);
        setTimingTakes(timingLog.current.takes.length);
        console.log("[timing] take saved", openTake.current);
      }
      openTake.current = null;
    }
    return undefined;
  }, [status, devTiming, song]);

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
    const previous = prevStatus.current;
    prevStatus.current = status;

    if (status === "counting") {
      const songKey = songRef.current;
      const modeNow = songKey ? ordersRef.current[songKey].mode : "linear";
      const next = createRunState(
        newRunId(),
        difficultyFromSettings(modeNow, showCuesRef.current),
      );
      runLive.current = true;
      runStarted.current = false;
      inRefrainRef.current = false;
      noteStep.current = 0;
      syncRunView(next);
      setResults(null);
      return undefined;
    }

    if (status === "playing" && previous === "counting") {
      runStarted.current = true;
      return undefined;
    }

    if (status === "playing" || status === "paused") return undefined;

    if (
      status === "stopped" &&
      runLive.current &&
      runStarted.current &&
      runRef.current &&
      !runRef.current.finalized
    ) {
      const finished = finalizeRun(runRef.current);
      const accuracy = accuracyOf(finished);
      syncRunView(finished);
      runLive.current = false;
      runStarted.current = false;
      // Next shuffled run must scramble again unless the player reshuffles first.
      userShuffledRef.current = false;
      if (songRef.current) {
        updateLocalBest(songRef.current, finished.difficulty, {
          score: finished.score,
          accuracy,
        });
        setResults({
          runId: finished.runId,
          difficulty: finished.difficulty,
          score: finished.score,
          accuracy,
          peakCombo: finished.peakCombo,
          prostCount: finished.prostCount,
          bonusActive: finished.bonusActive,
          reason: endReasonRef.current === "complete" ? "complete" : "stop",
        });
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      }
    } else if (status === "stopped") {
      runLive.current = false;
      runStarted.current = false;
      syncRunView(null);
    }

    judged.current.clear();
    recallPlayed.current.clear();
    misses.current.clear();
    audienceLoud.current = true;
    armed.current = null;
    setHolding(false);
    setGrade(null);
    inRefrainRef.current = false;
    return undefined;
  }, [status, syncRunView]);

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

  const cancelScramble = useCallback(() => {
    scrambleGen.current += 1;
    setScrambling(false);
  }, []);

  const openSong = (next) => {
    cancelScramble();
    userShuffledRef.current = false;
    resetView();
    setSong(next);
    setResults(null);
    setBoardOpen(false);
  };

  const reshuffleBoard = useCallback((songKey = songRef.current) => {
    if (!songKey) return;
    setOrders((current) => {
      if (songKey === "schnitzel") {
        const list = current.schnitzel.couplets;
        const next = shuffleCouplets(list);
        const same = next.every((item, index) => item.src === list[index].src);
        const couplets = same ? [...next.slice(1), next[0]] : next;
        return { ...current, schnitzel: { ...current.schnitzel, mode: "shuffled", couplets } };
      }
      return {
        ...current,
        kaszebe: { ...current.kaszebe, mode: "shuffled", ...shuffleKaszebe(current.kaszebe) },
      };
    });
  }, []);

  const onShuffle = () => {
    if (!song || mode === "linear" || status !== "stopped" || scrambling) return;
    reshuffleBoard(song);
    userShuffledRef.current = true;
  };

  const applyMode = (next) => {
    if (!song || next === mode) return;
    if (devTimingRef.current && song === "kaszebe" && next !== "linear") return;
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
    userShuffledRef.current = next === "shuffled";
    stop();
  };

  const onToggleCues = () => {
    setShowCues((current) => !current);
  };

  const onDifficulty = (next) => {
    if (scrambling) return;
    const settings = settingsFromDifficulty(next);
    setShowCues(settings.showCues);
    if (settings.mode === "shuffled") {
      // Every press on a shuffled mode (or switch between guide variants) reshuffles.
      cancelScramble();
      stop();
      reshuffleBoard(song);
      userShuffledRef.current = true;
      return;
    }
    userShuffledRef.current = false;
    if (mode !== "linear") applyMode("linear");
  };

  const runForcedScramble = useCallback(async () => {
    const songKey = songRef.current;
    if (!songKey) return;
    const gen = ++scrambleGen.current;
    setScrambling(true);
    for (let step = 0; step < 8; step += 1) {
      if (scrambleGen.current !== gen) return;
      reshuffleBoard(songKey);
      await new Promise((resolve) => window.setTimeout(resolve, 220));
    }
    if (scrambleGen.current !== gen) return;
    userShuffledRef.current = true;
    setScrambling(false);
    play();
  }, [play, reshuffleBoard]);

  const requestPlay = useCallback(() => {
    if (scrambling) return;
    if (status === "paused") {
      play();
      return;
    }
    if (status === "playing" || status === "counting") return;
    if (modeRef.current === "shuffled" && !userShuffledRef.current) {
      void runForcedScramble();
      return;
    }
    play();
  }, [scrambling, status, play, runForcedScramble]);

  const onSwap = () => {
    if (!song || scrambling) return;
    cancelScramble();
    stop();
    setProst(null);
    noteStep.current = 0;
    openSong(song === "schnitzel" ? "kaszebe" : "schnitzel");
  };

  const onStop = () => {
    cancelScramble();
    stop();
  };

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
      if (results) {
        if (event.key === "Escape") {
          event.preventDefault();
          setResults(null);
          return;
        }
        // Block transport Space; leave Enter alone so the nickname form can submit.
        if (event.code === "Space") {
          const tag = event.target?.tagName;
          if (tag !== "INPUT" && tag !== "TEXTAREA") event.preventDefault();
        }
        return;
      }
      if (event.key === "Escape") {
        if (!songRef.current) return;
        event.preventDefault();
        cancelScramble();
        stop();
        pan.current = { x: 0, y: 0 };
        setPanOffset({ x: 0, y: 0 });
        zoomRef.current = null;
        setZoom(null);
        setSong(null);
        return;
      }
      if (event.code !== "Space" || !songRef.current) return;
      event.preventDefault();
      if (scrambling) return;
      if (status === "playing") pause();
      else requestPlay();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [status, play, pause, stop, results, requestPlay, scrambling, cancelScramble]);

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
    <div id="app" className={boardOpen ? "has-leaderboard" : undefined}>
      <div className="play-shell">
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
            onHoldStart={onHoldStart}
            onHoldEnd={onHoldEnd}
            holding={holding}
            showCues={showCues && !devTiming}
          />
          {scrambling ? (
            <div className="scramble-overlay" aria-live="assertive">
              <span>Shuffling panels…</span>
            </div>
          ) : null}
          {countdown ? (
            <div className="countdown" aria-live="assertive">
              <span>{countdown}</span>
            </div>
          ) : null}
          {(status === "playing" || status === "paused" || status === "counting") && (
            <div className="live-hud" aria-live="polite">
              <div className="live-score">{liveScore}</div>
              {liveCombo > 1 ? (
                <div className="live-combo" title="Combo from consecutive Ok+ hits">
                  COMBO ×{liveCombo.toFixed(2)}
                </div>
              ) : null}
              {liveBonus > 1 ? (
                <div className="live-bonus" title="Prost bonus — don't miss a note">
                  PROST ×{liveBonus.toFixed(2)}
                </div>
              ) : null}
            </div>
          )}
        </div>
        <LeaderboardPanel
          song={song}
          difficulty={difficulty}
          open={boardOpen}
          onToggle={() => setBoardOpen((current) => !current)}
          refreshKey={boardRefresh}
        />
      </div>
      <section className="player" aria-label="Player">
        <Lyrics status={status} time={time} error={error} />
        <div className="player-actions">
          <button
            type="button"
            className="shuffle shuffle--dock"
            onClick={onShuffle}
            disabled={mode === "linear" || status !== "stopped" || scrambling}
          >
            Shuffle
          </button>
          <Playback status={status} onPlay={requestPlay} onPause={pause} onStop={onStop} />
        </div>
        <CanvasTools
          volume={volume}
          onVolume={setVolume}
          showCues={showCues}
          onToggleCues={onToggleCues}
          difficulty={difficulty}
          onDifficulty={onDifficulty}
          onSwap={onSwap}
          swapDetail={song === "schnitzel" ? "Open Kaszëbsczé nótë." : "Open Schnitzelbank."}
          devTiming={devTiming}
          timingTakes={timingTakes}
          onDevTiming={(on) => {
            setDevTiming(on);
            if (on && song === "kaszebe" && mode !== "linear") applyMode("linear");
            if (on) {
              console.info(
                "[timing] Developer timing is on. Guides are hidden. Play linear, click what you hear, then download the log from this menu.",
              );
            }
          }}
          onDownloadTiming={() => {
            const takes = [...timingLog.current.takes];
            if (openTake.current?.events.length) takes.push(openTake.current);
            const log = {
              song: "kaszebe",
              order: "linear",
              note: "Guides were hidden. down, up, and held are seconds from the start of the song.",
              takes,
            };
            const blob = new Blob([JSON.stringify(log, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
            link.href = url;
            link.download = `kaszebe-timing-${stamp}.json`;
            link.click();
            URL.revokeObjectURL(url);
          }}
          onOpenSettings={() => {
            if (status === "playing" || status === "counting") pause();
          }}
        />
      </section>
      <ResultsModal
        open={Boolean(results)}
        result={results}
        song={song}
        difficulty={results?.difficulty || difficulty}
        onClose={() => setResults(null)}
        onSubmitted={() => setBoardRefresh((value) => value + 1)}
      />
    </div>
  );
}
