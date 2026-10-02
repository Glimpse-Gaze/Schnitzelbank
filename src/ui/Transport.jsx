import { requestZoom } from "../scene/zoomBus.js";

function Glyph({ children }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      {children}
    </svg>
  );
}

export default function Transport({ status, onPlay, onPause, onStop }) {
  return (
    <div className="transport-bar">
      <div className="zoom-controls" role="group" aria-label="Zoom">
        <button type="button" aria-label="Zoom out" onClick={() => requestZoom(1)}>
          <Glyph>
            <path d="M14 32h36" />
          </Glyph>
        </button>
        <button type="button" aria-label="Zoom in" onClick={() => requestZoom(-1)}>
          <Glyph>
            <path d="M14 32h36M32 14v36" />
          </Glyph>
        </button>
      </div>
      <div className="transport" role="group" aria-label="Song">
        <button
          type="button"
          className={status === "playing" || status === "counting" ? "is-active" : undefined}
          aria-label="Play"
          aria-pressed={status === "playing" || status === "counting"}
          onClick={onPlay}
        >
          <Glyph>
            <path d="M22 14l28 18-28 18z" />
          </Glyph>
        </button>
        <button
          type="button"
          className={status === "paused" ? "is-active" : undefined}
          aria-label="Pause"
          aria-pressed={status === "paused"}
          onClick={onPause}
        >
          <Glyph>
            <path d="M20 14h8v36h-8zM36 14h8v36h-8z" />
          </Glyph>
        </button>
        <button type="button" aria-label="Stop" onClick={onStop}>
          <Glyph>
            <rect x="18" y="18" width="28" height="28" />
          </Glyph>
        </button>
      </div>
    </div>
  );
}
