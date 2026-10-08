import { useEffect, useState } from "react";
import { readMarkers } from "./markers.js";
import { installSequence, songLength } from "../data/sequence.js";
import { installKaszebe } from "../data/kaszebeSequence.js";

const SONGS = {
  schnitzel: {
    music: "/audio/Schnitzelbank_Music.wav",
    caller: "/audio/Schnitzelbank_Caller.wav",
    audience: "/audio/Schnitzelbank_Audience.wav",
    bed: false,
  },
  kaszebe: {
    music: "/audio/Kaszebe_Music.wav",
    caller: "/audio/Kaszebe_Caller.wav",
    audience: "/audio/Kaszebe_Audience.wav",
    bed: true,
  },
};

const engine = {
  context: null,
  master: null,
  audienceGain: null,
  buffers: null,
  sources: [],
  responses: [],
  offset: 0,
  startedAt: 0,
  status: "stopped",
  ready: false,
  bed: false,
};

let sharedVolume = 1;

function songOffset() {
  if (engine.status !== "playing" || !engine.context) return engine.offset;
  return engine.offset + (engine.context.currentTime - engine.startedAt);
}

export function songTime() {
  return songOffset();
}

function stopList(list) {
  for (const source of list) {
    try {
      source.onended = null;
      source.stop();
    } catch {
      // The node has already finished.
    }
  }
  list.length = 0;
}

function startStem(buffer, when, offset, destination) {
  const source = engine.context.createBufferSource();
  source.buffer = buffer;
  source.connect(destination || engine.master);
  source.start(when, Math.max(0, offset));
  engine.sources.push(source);
}

function begin(position) {
  stopList(engine.sources);
  stopList(engine.responses);
  const when = engine.context.currentTime;
  engine.offset = position;
  engine.startedAt = when;
  startStem(engine.buffers.music, when, position);
  startStem(engine.buffers.caller, when, position);
  if (!engine.bed || !engine.buffers.audience) return;
  if (position === 0 && engine.audienceGain) {
    engine.audienceGain.gain.cancelScheduledValues(when);
    engine.audienceGain.gain.setValueAtTime(1, when);
  }
  startStem(engine.buffers.audience, when, position, engine.audienceGain);
}

export function setAudienceLoud(loud, fade = 0.07) {
  if (!engine.bed || !engine.audienceGain || !engine.context) return;
  const now = engine.context.currentTime;
  const gain = engine.audienceGain.gain;
  const current = gain.value;
  gain.cancelScheduledValues(now);
  gain.setValueAtTime(current, now);
  gain.linearRampToValueAtTime(loud ? 1 : 0, now + fade);
}

export function playResponse(step, elapsed = 0) {
  if (engine.bed || !step?.response || engine.status !== "playing" || !engine.buffers?.audience) return;
  const duration = step.response.duration - elapsed;
  if (duration <= 0.05) return;
  const source = engine.context.createBufferSource();
  source.buffer = engine.buffers.audience;
  source.connect(engine.master);
  source.start(0, step.response.start + Math.max(0, elapsed), duration);
  engine.responses.push(source);
  source.onended = () => {
    const index = engine.responses.indexOf(source);
    if (index >= 0) engine.responses.splice(index, 1);
  };
}

async function loadStem(url, context, withMarkers) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(url);
  const bytes = await response.arrayBuffer();
  const markers = withMarkers ? readMarkers(bytes) : null;
  const audio = await context.decodeAudioData(bytes.slice(0));
  return { audio, markers };
}

export default function useSong(song) {
  const [status, setStatus] = useState("stopped");
  const [time, setTime] = useState(0);
  const [countdown, setCountdown] = useState(null);
  const [error, setError] = useState("");
  const [volume, setVolumeState] = useState(sharedVolume);
  const [, setReady] = useState(false);

  useEffect(() => {
    const context = new AudioContext();
    const master = context.createGain();
    master.gain.value = sharedVolume;
    master.connect(context.destination);
    const audienceGain = context.createGain();
    audienceGain.gain.value = 1;
    audienceGain.connect(master);
    engine.context = context;
    engine.master = master;
    engine.audienceGain = audienceGain;
    return () => {
      stopList(engine.sources);
      stopList(engine.responses);
      engine.ready = false;
      engine.buffers = null;
      context.close();
    };
  }, []);

  useEffect(() => {
    const spec = song ? SONGS[song] : null;
    let cancelled = false;
    engine.ready = false;
    engine.bed = Boolean(spec?.bed);
    setReady(false);
    stopList(engine.sources);
    stopList(engine.responses);
    if (!spec || !engine.context) {
      engine.buffers = null;
      return undefined;
    }
    setError("");
    Promise.all([
      loadStem(spec.music, engine.context, false),
      loadStem(spec.caller, engine.context, true),
      loadStem(spec.audience, engine.context, false),
    ])
      .then(([music, caller, audience]) => {
        if (cancelled) return;
        if (spec.bed) installKaszebe(caller.markers, music.audio.duration);
        else installSequence(caller.markers, music.audio.duration);
        engine.buffers = {
          music: music.audio,
          caller: caller.audio,
          audience: audience.audio,
        };
        engine.ready = true;
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setError("The song files could not be played in this browser.");
      });
    return () => {
      cancelled = true;
    };
  }, [song]);

  useEffect(() => {
    if (status !== "playing") return undefined;
    const tick = () => {
      const seconds = songOffset();
      if (seconds >= songLength()) {
        stopList(engine.sources);
        stopList(engine.responses);
        engine.offset = 0;
        engine.status = "stopped";
        setTime(0);
        setStatus("stopped");
        return;
      }
      setTime(seconds);
    };
    tick();
    const id = window.setInterval(tick, 100);
    return () => window.clearInterval(id);
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
        begin(0);
        engine.status = "playing";
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
    if (!engine.ready || status === "playing" || status === "counting") return;
    setError("");
    engine.context.resume();
    if (status === "paused") {
      begin(engine.offset);
      engine.status = "playing";
      setStatus("playing");
      return;
    }
    engine.offset = 0;
    setCountdown(3);
    engine.status = "counting";
    setStatus("counting");
  };

  const pause = () => {
    if (status === "counting") {
      setCountdown(null);
      engine.offset = 0;
      engine.status = "stopped";
      setStatus("stopped");
      return;
    }
    if (status !== "playing") return;
    engine.offset = songOffset();
    stopList(engine.sources);
    stopList(engine.responses);
    engine.status = "paused";
    setTime(engine.offset);
    setStatus("paused");
  };

  const setVolume = (value) => {
    const next = Math.min(1, Math.max(0, Number(value)));
    sharedVolume = next;
    setVolumeState(next);
    if (engine.master) engine.master.gain.value = next;
  };

  const stop = () => {
    stopList(engine.sources);
    stopList(engine.responses);
    engine.offset = 0;
    engine.status = "stopped";
    setCountdown(null);
    setTime(0);
    setStatus("stopped");
  };

  return { status, time, countdown, error, volume, setVolume, play, pause, stop };
}
