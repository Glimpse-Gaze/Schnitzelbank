import { useCallback, useEffect, useId, useRef, useState } from "react";
import { requestZoom } from "../scene/zoomBus.js";

function Glyph({ children }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      {children}
    </svg>
  );
}

function SpeakerIcon({ level }) {
  const loud = level >= 0.66;
  const audible = level >= 0.01;
  return (
    <Glyph>
      <path className="is-fill" d="M8 24h12l16-12v40L20 40H8z" />
      {audible ? <path d="M44 24c5 4 5 12 0 16" /> : <path d="M42 26l14 14M56 26L42 40" />}
      {loud ? <path d="M51 16c9 7 9 25 0 32" /> : null}
    </Glyph>
  );
}

function VolumeControl({ volume, onVolume }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const panelId = useId();
  const level = Number(volume);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="volume" ref={rootRef}>
      <button
        type="button"
        className="volume__button"
        aria-label={level >= 0.01 ? "Volume" : "Volume, muted"}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
      >
        <SpeakerIcon level={level} />
      </button>
      {open ? (
        <div className="volume__panel" id={panelId}>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            aria-label="Volume"
            onChange={(event) => onVolume(event.target.value)}
          />
        </div>
      ) : null}
    </div>
  );
}

function useDismiss(open, rootRef, onClose) {
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) onClose();
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose, rootRef]);
}

function ZoomControls() {
  return (
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
  );
}

const MODES = [
  { id: "linear", label: "Linear", detail: "Pictures stay in song order." },
  { id: "shuffled", label: "Shuffled", detail: "Pictures are mixed." },
];

export function CanvasTools({
  volume,
  onVolume,
  showCues,
  onToggleCues,
  mode,
  onMode,
  onOpenSettings,
  onSwap,
  swapDetail,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef(null);
  const menuOpenRef = useRef(false);
  const settingsOpenRef = useRef(false);
  const setMenu = useCallback((next) => {
    menuOpenRef.current = next;
    setMenuOpen(next);
  }, []);
  const setSettings = useCallback((next) => {
    settingsOpenRef.current = next;
    setSettingsOpen(next);
  }, []);
  const closeSettings = useCallback(() => setSettings(false), [setSettings]);
  useDismiss(settingsOpen, settingsRef, closeSettings);

  return (
    <div className="canvas-tools">
      <button
        type="button"
        className="tool-button"
        aria-label="View controls"
        aria-expanded={menuOpen}
        onClick={() => {
          const next = !menuOpenRef.current;
          setMenu(next);
          if (!next) setSettings(false);
        }}
      >
        <Glyph>
          <path d="M14 18h36M14 32h36M14 46h36" />
        </Glyph>
      </button>
      {menuOpen ? (
        <div className="menu-stack">
          <div className="menu-pop" ref={settingsRef}>
            <button
              type="button"
              className="tool-button"
              aria-label="Settings"
              aria-expanded={settingsOpen}
              onClick={() => {
                const next = !settingsOpenRef.current;
                setSettings(next);
                if (next) onOpenSettings();
              }}
            >
              <svg className="is-solid" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.48.48 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87a.49.49 0 0 0 .12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61l-2.03-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4 3.6 3.6 0 0 1 12 15.6z"
                />
              </svg>
            </button>
            {settingsOpen ? (
              <div className="settings-menu" role="dialog" aria-label="Game mode">
                <p className="settings-menu__title">Game mode</p>
                {MODES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={mode === item.id ? "mode-option is-selected" : "mode-option"}
                    aria-pressed={mode === item.id}
                    onClick={() => onMode(item.id)}
                  >
                    <span>{item.label}</span>
                    <small>{item.detail}</small>
                  </button>
                ))}
                {onSwap ? (
                  <button type="button" className="mode-option swap-option" onClick={onSwap}>
                    <span>
                      <img src="/Swap.png" alt="" />
                      Swap
                    </span>
                    <small>{swapDetail}</small>
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
          <ZoomControls />
          <VolumeControl volume={volume} onVolume={onVolume} />
          <button
            type="button"
            className="tool-button time-toggle"
            aria-pressed={showCues}
            aria-label={showCues ? "Timing guides on" : "Timing guides off"}
            onClick={onToggleCues}
          >
            <img src="/time-left.png" alt="" />
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function Playback({ status, onPlay, onPause, onStop }) {
  return (
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
  );
}
