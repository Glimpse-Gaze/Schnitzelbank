import { useEffect, useRef, useState } from "react";
import { Howl } from "howler";
import { sequenceDuration } from "../data/sequence.js";

const SONG_URL = "/audio/Schnitzelbank2.m4a";

let sharedHowl = null;

function getHowl() {
  if (!sharedHowl) {
    sharedHowl = new Howl({
      src: [SONG_URL],
      html5: true,
      preload: true,
    });
  }
  return sharedHowl;
}

function readTime(howl) {
  const value = howl.seek();
  return typeof value === "number" ? value : 0;
}

export default function useSong() {
  const howlRef = useRef(null);
  const [status, setStatus] = useState("stopped");
  const [time, setTime] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    const howl = getHowl();
    howlRef.current = howl;
    const onError = () => setError("The song file could not be played in this browser.");
    howl.on("loaderror", onError);
    howl.on("playerror", onError);
    return () => {
      howl.off("loaderror", onError);
      howl.off("playerror", onError);
    };
  }, []);

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

  const play = () => {
    const howl = howlRef.current;
    if (!howl || status === "playing") return;
    setError("");
    howl.play();
    setStatus("playing");
  };

  const pause = () => {
    const howl = howlRef.current;
    if (!howl || status !== "playing") return;
    howl.pause();
    setTime(readTime(howl));
    setStatus("paused");
  };

  const stop = () => {
    const howl = howlRef.current;
    if (!howl) return;
    howl.stop();
    setTime(0);
    setStatus("stopped");
  };

  return { status, time, error, play, pause, stop };
}
