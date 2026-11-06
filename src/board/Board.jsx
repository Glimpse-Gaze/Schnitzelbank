import { useEffect, useId, useMemo, useState } from "react";
import { framesAt, holdAt, steps } from "../data/sequence.js";
import { songTime } from "../audio/useSong.js";
import { layoutCouplets } from "./couplets.js";
import { HOLD_FLOWERS, HORIZONTAL_QUERY, layoutKaszebe } from "./kaszebe.js";
import { ApproachFrame, FolkHoldBar, HoldMark, PanelChrome } from "./kaszebeChrome.jsx";

const CANVAS_PAD = 160;

function useKaszebeOrientation(enabled) {
  const [horizontal, setHorizontal] = useState(() =>
    typeof window !== "undefined" && window.matchMedia(HORIZONTAL_QUERY).matches,
  );
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return undefined;
    const media = window.matchMedia(HORIZONTAL_QUERY);
    const sync = () => setHorizontal(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [enabled]);
  return enabled && horizontal ? "horizontal" : "vertical";
}
const GRADE_LABEL = {
  perfect: "Perfect",
  good: "Good",
  ok: "OK",
  early: "Too early",
  late: "Too late",
};

function posterBoard(couplets) {
  const layout = layoutCouplets(couplets);
  return {
    viewBox: `${-CANVAS_PAD} ${-CANVAS_PAD} ${layout.width + CANVAS_PAD * 2} ${layout.height + CANVAS_PAD * 2}`,
    width: layout.width + CANVAS_PAD * 2,
    height: layout.height + CANVAS_PAD * 2,
    originX: -CANVAS_PAD,
    originY: -CANVAS_PAD,
    imageWidth: layout.width,
    imageHeight: layout.height,
    layers: layout.layers,
    panels: layout.panels,
    notes: layout.notes,
  };
}

function kaszebeBoard(cards, orientation) {
  const layout = layoutKaszebe(cards, orientation);
  return {
    viewBox: `${-CANVAS_PAD} ${-CANVAS_PAD} ${layout.width + CANVAS_PAD * 2} ${layout.height + CANVAS_PAD * 2}`,
    width: layout.width + CANVAS_PAD * 2,
    height: layout.height + CANVAS_PAD * 2,
    originX: -CANVAS_PAD,
    originY: -CANVAS_PAD,
    imageWidth: layout.width,
    imageHeight: layout.height,
    layers: layout.layers,
    panels: layout.panels,
    notes: [],
    orientation: layout.orientation,
  };
}

export default function Board({
  song = "schnitzel",
  couplets,
  cards,
  status,
  hoveredPanel,
  clickedPanel,
  grade,
  prost,
  pan,
  zoom,
  onFitZoom,
  onHoverPanel,
  onClickPanel,
  onHoldStart,
  onHoldEnd,
  holding = false,
  showCues = true,
  preview = false,
}) {
  const orientation = useKaszebeOrientation(song === "kaszebe" && !preview);
  const board = useMemo(
    () => (song === "kaszebe" ? kaszebeBoard(cards, orientation) : posterBoard(couplets)),
    [song, couplets, cards, orientation],
  );
  const [frames, setFrames] = useState([]);
  const [hold, setHold] = useState(null);
  const [boardCursor, setBoardCursor] = useState(null);
  const [finePointer, setFinePointer] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches,
  );
  const holdActive = Boolean(showCues && hold);

  useEffect(() => {
    if (preview || typeof window === "undefined") return undefined;
    const media = window.matchMedia("(hover: hover) and (pointer: fine)");
    const sync = () => {
      setFinePointer(media.matches);
      if (!media.matches) setBoardCursor(null);
    };
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [preview]);

  const onBoardPointerMove = (event) => {
    if (preview || !finePointer) return;
    setBoardCursor({ x: event.clientX, y: event.clientY });
  };

  const onBoardPointerLeave = () => setBoardCursor(null);

  useEffect(() => {
    if (status !== "playing") return undefined;
    let raf = 0;
    const tick = () => {
      const now = songTime();
      setFrames(framesAt(now));
      setHold(holdAt(now));
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [status]);

  useEffect(() => {
    if (status === "playing" || status === "paused") return undefined;
    setFrames([]);
    setHold(null);
    return undefined;
  }, [status]);

  useEffect(() => {
    if (!board || preview) return undefined;
    document.documentElement.style.setProperty("--board-w", String(board.width));
    document.documentElement.style.setProperty("--board-h", String(board.height));
    onFitZoom(board.height / board.imageHeight);
    return undefined;
  }, [board, onFitZoom, preview]);

  const fitZoom = board.height / board.imageHeight;
  const scale = zoom ?? fitZoom;
  const chromeId = useId().replace(/:/g, "");

  const panels = board.panels;
  const notes = board.notes;
  const noteLayer = board.layers.find((layer) => String(layer.src).includes("music_only_notes"));
  const clickedNote = notes.find((note) => note.id === clickedPanel);
  const visibleFrames = frames
    .map((frame) => ({ frame, panel: panels.find((panel) => panel.id === frame.panel) }))
    .filter((item) => item.panel && item.frame.opacity > 0.02);
  const gradedPanel = grade ? panels.find((panel) => panel.id === steps[grade.index]?.panel) : null;
  const gradeFrame = gradedPanel ? visibleFrames.find((item) => item.panel.id === gradedPanel.id) : null;
  const gradeScale = gradeFrame ? gradeFrame.frame.scale : 1;
  const gradeTop = gradedPanel
    ? gradedPanel.y + gradedPanel.height / 2 - (gradedPanel.height * gradeScale) / 2
    : 0;
  const barPanels = holdActive
    ? hold.panels.map((id) => panels.find((panel) => panel.id === id)).filter(Boolean)
    : [];

  const customCursor = Boolean(boardCursor) && !preview;

  return (
    <>
    <div
      className={["board-frame", customCursor ? "has-board-cursor" : ""].filter(Boolean).join(" ")}
      style={{
        "--board-w": board.width,
        "--board-h": board.height,
        transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
      }}
      onPointerMove={onBoardPointerMove}
      onPointerEnter={onBoardPointerMove}
      onPointerLeave={onBoardPointerLeave}
    >
      <svg viewBox={board.viewBox} role="img" aria-label={song === "kaszebe" ? "Kaszëbsczé nótë board" : "Schnitzelbank board"}>
        <rect
          x="0"
          y="0"
          width={board.imageWidth}
          height={board.imageHeight}
          fill="#cec5b8"
          pointerEvents="none"
        />
        {board.layers.map((layer) => (
          <image
            key={`${layer.src}-${layer.x}-${layer.y}`}
            href={layer.src}
            x={layer.x}
            y={layer.y}
            width={layer.width}
            height={layer.height}
            pointerEvents="none"
          />
        ))}
        {noteLayer ? (
          <mask id="note-ink" maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse" mask-type="alpha">
            <image
              href={noteLayer.src}
              x={noteLayer.x}
              y={noteLayer.y}
              width={noteLayer.width}
              height={noteLayer.height}
            />
          </mask>
        ) : null}
        {showCues
          ? visibleFrames.map(({ frame, panel }) =>
              song === "kaszebe" ? (
                <ApproachFrame
                  key={frame.index}
                  chromeId={chromeId}
                  frameIndex={frame.index}
                  panel={panel}
                  scale={frame.scale}
                  opacity={frame.opacity}
                  arrived={frame.arrived ?? 1}
                />
              ) : (
                <Frame key={frame.index} panel={panel} scale={frame.scale} opacity={frame.opacity} />
              ),
            )
          : null}
        {clickedNote && noteLayer ? (
          <rect
            x={clickedNote.x}
            y={clickedNote.y}
            width={clickedNote.width}
            height={clickedNote.height}
            fill="#ff4b00"
            mask="url(#note-ink)"
            pointerEvents="none"
          />
        ) : null}
        {notes.map((note) => (
          <rect
            key={note.id}
            className="note-hit hit-target"
            x={note.x}
            y={note.y}
            width={note.width}
            height={note.height}
            fill="transparent"
            stroke="transparent"
            onClick={(event) => onClickPanel(note.id, clickPoint(event, note))}
          />
        ))}
        {panels.map((panel) =>
          song === "kaszebe" ? (
            <g key={panel.id} className="kaszebe-target">
              <rect
                className="kaszebe-hover"
                x={panel.x}
                y={panel.y}
                width={panel.width}
                height={panel.height}
                fill="none"
                stroke="#9fd0ee"
                strokeWidth="6"
                strokeDasharray="2 7"
                strokeLinecap="round"
                pointerEvents="none"
              />
              <PanelChrome panel={panel} />
              {HOLD_FLOWERS.has(panel.id) ? (
                <HoldMark
                  panel={panel}
                  placement="corner"
                  orientation={board.orientation === "vertical" ? "vertical" : "horizontal"}
                />
              ) : null}
              <PanelHit
                panel={panel}
                pressed={clickedPanel === panel.id}
                folk
                onPointerEnter={onHoverPanel}
                onPointerLeave={() => onHoverPanel(null)}
                onHoldStart={onHoldStart}
                onHoldEnd={onHoldEnd}
                onClickPanel={onClickPanel}
              />
            </g>
          ) : (
            <PanelHit
              key={panel.id}
              panel={panel}
              pressed={clickedPanel === panel.id}
              hovered={hoveredPanel === panel.id}
              onPointerEnter={onHoverPanel}
              onPointerLeave={() => onHoverPanel(null)}
              onHoldStart={onHoldStart}
              onHoldEnd={onHoldEnd}
              onClickPanel={onClickPanel}
            />
          ),
        )}
      </svg>
      {gradedPanel ? (
        <GradeToast
          grade={grade}
          panel={gradedPanel}
          board={board}
          top={gradeTop}
        />
      ) : null}
      {prost && notes.length ? (
        <GradeToast
          grade={{ index: prost.id, value: "perfect", point: prost.point }}
          panel={notes[notes.length - 1]}
          board={board}
          top={0}
          label="Prost!"
        />
      ) : null}
      {barPanels.length && hold ? (
        <div className="board-hold is-on">
          <svg viewBox={board.viewBox} aria-hidden="true">
            {song === "kaszebe" ? (
              <FolkHoldBar
                chromeId={chromeId}
                bounds={unionOf(barPanels)}
                progress={holding ? hold.progress : 0}
                okFrom={hold.okFrom}
                goodFrom={hold.goodFrom}
                perfectFrom={hold.perfectFrom}
              />
            ) : (
              <HoldBar
                chromeId={chromeId}
                bounds={unionOf(barPanels)}
                progress={holding ? hold.progress : 0}
                okFrom={hold.okFrom}
                goodFrom={hold.goodFrom}
                perfectFrom={hold.perfectFrom}
              />
            )}
          </svg>
        </div>
      ) : null}
    </div>
    {customCursor ? (
      <img
        className="board-pointer"
        src="/Pointer.svg"
        alt=""
        aria-hidden="true"
        style={{ left: boardCursor.x, top: boardCursor.y }}
      />
    ) : null}
    </>
  );
}

function clickPoint(event, panel) {
  const rect = event.currentTarget.getBoundingClientRect();
  const fx = rect.width ? (event.clientX - rect.left) / rect.width : 0.5;
  const fy = rect.height ? (event.clientY - rect.top) / rect.height : 0.5;
  const x = panel.x + Math.min(1, Math.max(0, fx)) * panel.width;
  const y = panel.y + Math.min(1, Math.max(0, fy)) * panel.height;
  return { x, y, angle: toastAngle(x) };
}

function toastAngle(x) {
  const min = x < 420 ? 0 : x > 1180 ? -45 : -60;
  const max = x < 420 ? 45 : x > 1180 ? 0 : 60;
  return min + Math.random() * (max - min);
}

function GradeToast({ grade, panel, board, top, label }) {
  const late = grade.value === "late";
  const point = !late && grade.point ? grade.point : null;
  const x = point ? point.x : panel.x + panel.width / 2;
  const y = point ? point.y : top;
  const angle = point ? point.angle : 0;
  const rad = (angle * Math.PI) / 180;
  const align = !point ? "-50%" : x < 420 ? "0%" : x > 1180 ? "-100%" : "-50%";
  const origin = !point ? "center bottom" : x < 420 ? "left bottom" : x > 1180 ? "right bottom" : "center bottom";
  return (
    <div
      className="grade-anchor"
      style={{
        left: `${((x - board.originX) / board.width) * 100}%`,
        top: `${((y - board.originY) / board.height) * 100}%`,
        "--align": align,
        "--lift-x": point ? `${Math.sin(rad) * 12}px` : "0px",
        "--lift-y": point ? `${-Math.cos(rad) * 12}px` : "-14px",
      }}
    >
      <span
        key={`${grade.index}-${grade.part ?? "tap"}-${grade.value}`}
        className={["grade-float", `is-${grade.value}`].join(" ")}
        style={{
          "--slide-x": point ? `${Math.sin(rad) * 36}px` : "0px",
          "--slide-y": point ? `${-Math.cos(rad) * 36}px` : "0px",
          "--tilt": point ? `${angle * 0.2}deg` : "0deg",
          "--origin": origin,
        }}
        aria-live="polite"
      >
        {label ?? GRADE_LABEL[grade.value] ?? ""}
      </span>
    </div>
  );
}

function unionOf(panels) {
  const left = Math.min(...panels.map((panel) => panel.x));
  const top = Math.min(...panels.map((panel) => panel.y));
  const right = Math.max(...panels.map((panel) => panel.x + panel.width));
  const bottom = Math.max(...panels.map((panel) => panel.y + panel.height));
  return { x: left, y: top, width: right - left, height: bottom - top };
}

function PanelHit({ panel, pressed, hovered = false, folk = false, onPointerEnter, onPointerLeave, onHoldStart, onHoldEnd, onClickPanel }) {
  return (
    <rect
      className="hit-target"
      x={panel.x}
      y={panel.y}
      width={panel.width}
      height={panel.height}
      fill={pressed ? (folk ? "rgba(31, 95, 173, 0.2)" : "rgba(255, 75, 0, 0.34)") : "transparent"}
      stroke={!folk && hovered ? "#ff4b00" : "transparent"}
      strokeWidth="3"
      vectorEffect="non-scaling-stroke"
      onPointerEnter={() => onPointerEnter(panel.id)}
      onPointerLeave={onPointerLeave}
      onPointerDown={(event) => {
        if (event.button !== 0 || !onHoldStart) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        onHoldStart(panel.id, clickPoint(event, panel));
      }}
      onPointerUp={(event) => {
        if (event.button !== 0 || !onHoldEnd) return;
        onHoldEnd();
      }}
      onClick={(event) => onClickPanel(panel.id, clickPoint(event, panel))}
    />
  );
}

function HoldBar({
  chromeId = "hold",
  bounds,
  progress,
  okFrom = 0.9,
  goodFrom = 0.95,
  perfectFrom = 0.98,
}) {
  if (!bounds || !Number.isFinite(bounds.width)) return null;
  const y = bounds.y + Math.min(36, bounds.height * 0.22);
  const x0 = bounds.x + 8;
  const x1 = bounds.x + bounds.width - 8;
  const span = x1 - x0;
  const fill = x0 + span * progress;
  const ok = Math.min(1, Math.max(0, okFrom));
  const good = Math.min(1, Math.max(ok, goodFrom));
  const perfect = Math.min(1, Math.max(good, perfectFrom));
  const okX = x0 + span * ok;
  const goodX = x0 + span * good;
  const perfectX = x0 + span * perfect;
  const hatchOk = `${chromeId}-plain-hatch-ok`;
  return (
    <g pointerEvents="none">
      <defs>
        <pattern id={hatchOk} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="5" stroke="#fffef6" strokeWidth="2.4" />
        </pattern>
      </defs>
      <line x1={x0} y1={y} x2={x1} y2={y} stroke="#1a1a1a" strokeWidth="16" strokeLinecap="round" opacity="0.72" />
      {/* Zones under fill so the progress stroke overlaps Ok / Good / Perfect. */}
      {goodX > okX ? (
        <>
          <line x1={okX} y1={y} x2={goodX} y2={y} stroke="#e0a63a" strokeWidth="16" strokeLinecap="butt" />
          <line x1={okX} y1={y} x2={goodX} y2={y} stroke={`url(#${hatchOk})`} strokeWidth="16" strokeLinecap="butt" />
        </>
      ) : null}
      {perfectX > goodX ? (
        <line x1={goodX} y1={y} x2={perfectX} y2={y} stroke="#cc7939" strokeWidth="16" strokeLinecap="butt" />
      ) : null}
      <line x1={perfectX} y1={y} x2={x1} y2={y} stroke="#9B1212" strokeWidth="16" strokeLinecap="butt" />
      {progress > 0.01 ? (
        <line x1={x0} y1={y} x2={fill} y2={y} stroke="#ff4b00" strokeWidth="16" strokeLinecap="butt" />
      ) : null}
    </g>
  );
}

function Frame({ panel, scale, opacity }) {
  const width = panel.width * scale;
  const height = panel.height * scale;
  const x = panel.x + panel.width / 2 - width / 2;
  const y = panel.y + panel.height / 2 - height / 2;
  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      fill="none"
      stroke="#ff4b00"
      strokeWidth="3"
      vectorEffect="non-scaling-stroke"
      opacity={opacity}
      pointerEvents="none"
    />
  );
}
