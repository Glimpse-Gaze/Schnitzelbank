import { useEffect, useRef, useState } from "react";
import { Howl } from "howler";
import { sequenceDuration } from "../data/sequence.js";

const SONG_URL = "/audio/Schnitzelbank3.wav";

let sharedHowl = null;
let sharedUrl = "";
let sharedVolume = 1;

function getHowl() {
  if (sharedHowl && sharedUrl === SONG_URL) return sharedHowl;
  sharedHowl?.unload();
  sharedUrl = SONG_URL;
  sharedHowl = new Howl({
    src: [SONG_URL],
    html5: true,
    preload: true,
    volume: sharedVolume,
  });
  return sharedHowl;
}

function readTime(howl) {
  const value = howl.seek();
  return typeof value === "number" ? value : 0;
}

export function songTime() {
  if (!sharedHowl) return 0;
  return readTime(sharedHowl);
}

export default function useSong() {
  const howlRef = useRef(null);
  const [status, setStatus] = useState("stopped");
  const [time, setTime] = useState(0);
  const [countdown, setCountdown] = useState(null);
  const [error, setError] = useState("");
  const [volume, setVolumeState] = useState(sharedVolume);

  useEffect(() => {
    const howl = getHowl();
    howlRef.current = howl;
    const onError = () => setError("The song file could not be played in this browser.");
    howl.on("loaderror", onError);
    howl.on("playerror", onError);
    return () => {
      howl.off("loaderror", onError);
      howl.off("playerror", onError);
      howl.stop();
    };
  }, [SONG_URL]);

  useEffect(() => {
    if (status !== "playing") return undefined;
    const tick = () => {
      const howl = howlRef.current;
      if (!howl) return;
      const seconds = readTime(howl);
      if (seconds >= sequenceDuration) {
        howl.stop();
        setTime(0);
        setStatus("stopped");
        return;
      }
      setTime(seconds);
    };
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [status]);

  useEffect(() => {
    if (status !== "counting") return undefined;
    let value = 3;
    let cancelled = false;
    setCountdown(3);
    const id = window.setInterval(() => {
      if (cancelled) return;
      value -= 1;
      if (value <= 0) {
        window.clearInterval(id);
        setCountdown(null);
        howlRef.current?.play();
        setStatus("playing");
        return;
      }
      setCountdown(value);
    }, 1000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [status]);

  const play = () => {
    const howl = howlRef.current;
    if (!howl || status === "playing" || status === "counting") return;
    setError("");
    if (status === "paused") {
      howl.play();
      setStatus("playing");
      return;
    }
    setCountdown(3);
    setStatus("counting");
  };

  const pause = () => {
    const howl = howlRef.current;
    if (!howl || status === "counting") {
      setCountdown(null);
      setStatus("stopped");
      return;
    }
    if (status !== "playing") return;
    howl.pause();
    setTime(readTime(howl));
    setStatus("paused");
  };

  const setVolume = (value) => {
    const next = Math.min(1, Math.max(0, Number(value)));
    sharedVolume = next;
    setVolumeState(next);
    howlRef.current?.volume(next);
  };

  const stop = () => {
    const howl = howlRef.current;
    if (!howl) return;
    howl.stop();
    setCountdown(null);
    setTime(0);
    setStatus("stopped");
  };

  return { status, time, countdown, error, volume, setVolume, play, pause, stop };
}
