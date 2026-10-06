import { useEffect, useMemo, useState } from "react";
import { frameAt, steps } from "../data/sequence.js";
import { songTime } from "../audio/useSong.js";
import { layoutCouplets } from "./couplets.js";

const CANVAS_PAD = 160;
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

export default function Board({
  couplets,
  status,
  hoveredPanel,
  clickedPanel,
  grade,
  pan,
  zoom,
  onFitZoom,
  onHoverPanel,
  onClickPanel,
  showCues = true,
}) {
  const board = useMemo(() => posterBoard(couplets), [couplets]);
  const [frame, setFrame] = useState(null);

  useEffect(() => {
    if (status !== "playing") return undefined;
    let raf = 0;
    const tick = () => {
      setFrame(frameAt(songTime()));
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [status]);

  useEffect(() => {
    if (status === "playing" || status === "paused") return undefined;
    setFrame(null);
    return undefined;
  }, [status]);

  useEffect(() => {
    if (!board) return undefined;
    document.documentElement.style.setProperty("--board-w", String(board.width));
    document.documentElement.style.setProperty("--board-h", String(board.height));
    onFitZoom(board.height / board.imageHeight);
    return undefined;
  }, [board, onFitZoom]);

  const fitZoom = board.height / board.imageHeight;
  const scale = zoom ?? fitZoom;

  const panels = board.panels;
  const notes = board.notes;
  const noteLayer = board.layers.find((layer) => String(layer.src).includes("music_only_notes"));
  const clickedNote = notes.find((note) => note.id === clickedPanel);
  const framed = frame ? panels.find((panel) => panel.id === frame.panel) : null;
  const gradedPanel = grade ? panels.find((panel) => panel.id === steps[grade.index]?.panel) : null;
  const gradeScale = gradedPanel && frame?.panel === gradedPanel.id ? frame.scale : 1;
  const gradeTop = gradedPanel
    ? gradedPanel.y + gradedPanel.height / 2 - (gradedPanel.height * gradeScale) / 2
    : 0;

  return (
    <div
      className="board-frame"
      style={{
        "--board-w": board.width,
        "--board-h": board.height,
        transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
      }}
    >
      <svg viewBox={board.viewBox} role="img" aria-label="Schnitzelbank board">
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
          <mask id="note-ink" maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse" maskType="alpha" style={{ maskType: "alpha" }}>
            <image
              href={noteLayer.src}
              x={noteLayer.x}
              y={noteLayer.y}
              width={noteLayer.width}
              height={noteLayer.height}
            />
          </mask>
        ) : null}
        {showCues && framed && frame.opacity > 0.02 ? (
          <Frame panel={framed} scale={frame.scale} opacity={frame.opacity} />
        ) : null}
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
            className="note-hit"
            x={note.x}
            y={note.y}
            width={note.width}
            height={note.height}
            fill="transparent"
            stroke="transparent"
            onClick={() => onClickPanel(note.id)}
          />
        ))}
        {panels.map((panel) => (
          <rect
            key={panel.id}
            x={panel.x}
            y={panel.y}
            width={panel.width}
            height={panel.height}
            fill={clickedPanel === panel.id ? "rgba(255, 75, 0, 0.34)" : "transparent"}
            stroke={hoveredPanel === panel.id ? "#ff4b00" : "transparent"}
            strokeWidth="3"
            vectorEffect="non-scaling-stroke"
            onPointerEnter={() => onHoverPanel(panel.id)}
            onPointerLeave={() => onHoverPanel(null)}
            onClick={() => onClickPanel(panel.id)}
          />
        ))}
      </svg>
      {gradedPanel ? (
        <div
          className="grade-anchor"
          style={{
            left: `${((gradedPanel.x + gradedPanel.width / 2 - board.originX) / board.width) * 100}%`,
            top: `${((gradeTop - board.originY) / board.height) * 100}%`,
          }}
        >
          <span
            key={`${grade.index}-${grade.value}`}
            className={
              grade.value === "early" || grade.value === "late" ? "grade-float is-miss" : "grade-float"
            }
            aria-live="polite"
          >
            {GRADE_LABEL[grade.value] ?? ""}
          </span>
        </div>
      ) : null}
    </div>
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
    />
  );
}
