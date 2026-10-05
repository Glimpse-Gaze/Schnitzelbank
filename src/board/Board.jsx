import { useEffect, useState } from "react";
import { frameAt, steps } from "../data/sequence.js";
import { songTime } from "../audio/useSong.js";

const PANEL_NAME = /^R\d+P\d+$/;
const CANVAS_PAD = 160;
const GRADE_LABEL = {
  perfect: "Perfect",
  good: "Good",
  ok: "OK",
  early: "Too early",
  late: "Too late",
};

function readBoard(markup) {
  const xml = new DOMParser().parseFromString(markup, "image/svg+xml");
  const svg = xml.documentElement;
  const viewBox = svg.getAttribute("viewBox") ?? "0 0 1 1";
  const [, , width, height] = viewBox.split(/[\s,]+/).map(Number);
  const images = new Map();
  for (const image of svg.querySelectorAll("image")) {
    images.set(image.id, {
      width: Number(image.getAttribute("width")),
      height: Number(image.getAttribute("height")),
      href: image.getAttribute("href") || image.getAttribute("xlink:href"),
    });
  }
  const nodes = [...svg.querySelectorAll("use")].map((use) => {
    const href = (use.getAttribute("href") || "").replace("#", "");
    const image = images.get(href);
    return {
      id: use.id,
      x: Number(use.getAttribute("x")) || 0,
      y: Number(use.getAttribute("y")) || 0,
      width: image?.width ?? 0,
      height: image?.height ?? 0,
      href: image?.href ?? "",
    };
  });
  const imageWidth = width || 1;
  const imageHeight = height || 1;
  return {
    viewBox: `${-CANVAS_PAD} ${-CANVAS_PAD} ${imageWidth + CANVAS_PAD * 2} ${imageHeight + CANVAS_PAD * 2}`,
    width: imageWidth + CANVAS_PAD * 2,
    height: imageHeight + CANVAS_PAD * 2,
    originX: -CANVAS_PAD,
    originY: -CANVAS_PAD,
    imageWidth,
    imageHeight,
    nodes,
  };
}

export default function Board({
  status,
  hoveredPanel,
  clickedPanel,
  grade,
  pan,
  zoom,
  onFitZoom,
  onHoverPanel,
  onClickPanel,
}) {
  const [board, setBoard] = useState(null);
  const [frame, setFrame] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/Schnitzel_2P.svg")
      .then((response) => {
        if (!response.ok) throw new Error("missing");
        return response.text();
      })
      .then((markup) => {
        if (!cancelled) setBoard(readBoard(markup));
      })
      .catch(() => {
        if (!cancelled) setBoard(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
    onFitZoom(board.height / board.imageHeight);
    return undefined;
  }, [board, onFitZoom]);

  if (!board) return null;

  const fitZoom = board.height / board.imageHeight;
  const scale = zoom ?? fitZoom;

  const panels = board.nodes.filter((node) => PANEL_NAME.test(node.id));
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
        {board.nodes.map((node) => (
          <image
            key={node.id}
            href={node.href}
            x={node.x}
            y={node.y}
            width={node.width}
            height={node.height}
            pointerEvents="none"
          />
        ))}
        {framed && frame.opacity > 0.02 ? (
          <g pointerEvents="none">
            <Frame panel={framed} scale={1} opacity={frame.opacity * 0.45} />
            <Frame panel={framed} scale={frame.scale} opacity={frame.opacity} />
          </g>
        ) : null}
        {panels.map((panel) => (
          <rect
            key={panel.id}
            x={panel.x}
            y={panel.y}
            width={panel.width}
            height={panel.height}
            fill={clickedPanel === panel.id ? "rgba(255, 75, 0, 0.34)" : "transparent"}
            stroke={hoveredPanel === panel.id && framed?.id !== panel.id ? "#ff4b00" : "transparent"}
            strokeWidth="3"
            vectorEffect="non-scaling-stroke"
            onPointerEnter={() => onHoverPanel(panel.id)}
            onPointerLeave={() => onHoverPanel(null)}
            onClick={() => onClickPanel(panel.id)}
          >
            <title>{panel.id}</title>
          </rect>
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
