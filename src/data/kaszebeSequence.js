import { installCues } from "./sequence.js";

// A single picture held about as long as a two-picture line is a sustain.
// Shorter singles stay a single tap. Two pictures share one target and take two clicks.
const HOLD_SINGLE = 1.15;

export function pairTarget(panels) {
  return panels.join("+");
}

const PHRASES = {
  krotkiedlugiekaszebskostolica: {
    caller: ["To je krótczé, to je dłudżé,", "to kaszëbskô stolëca."],
  },
  baseskrzepcekaszeba: {
    caller: ["To są basë, to są skrzëpczi,", "to òznôczô Kaszëba."],
  },
  rydeltycz: {
    caller: ["To je ridel,", "to je ticz."],
    reply: ["ridel, ticz"],
  },
  hojnewidlygnojne: {
    caller: ["To są chòjnë,", "widłë gnojné."],
    reply: ["chòjnë, widłë gnojné"],
  },
  prostekrzywe: {
    caller: ["To je prosté,", "to je krzëwé."],
  },
  prostykrzywy: {
    reply: ["prosté, krzëwé"],
  },
  tylnekolo: {
    caller: ["To je slédné", "kòło wòzné."],
    reply: ["slédné kòło wòzné"],
  },
  kaszeba: { reply: ["Òznôczô Kaszëba"] },
  baseskrzepce: { reply: ["basë, skrzëpczi"] },
  krotkiedlugie: { reply: ["krótczé, dłudżé"] },
  kaszebskostolica: { reply: ["to kaszëbskô stolëca"] },
  kaszebksostolica: { reply: ["to kaszëbskô stolëca"] },
  hoczi: { caller: ["To są hôczi."], reply: ["Hôk"] },
  ptoczi: { caller: ["To są ptôczi."], reply: ["ptôk"] },
  poltrojeczi: { caller: ["To są prësczé", "półtrojôczi."] },
  poltorak: { reply: ["półtrojôk"] },
  kleka: { caller: ["To je klëka,"], reply: ["klëka"] },
  wol: { caller: ["to je wół,"], reply: ["wół"] },
  cale: { caller: ["to je całé,"], reply: ["Całé"] },
  pol: { caller: ["a to pół."], reply: ["pół"] },
  male: { reply: ["To je môłé,"] },
  wielki: { reply: ["a to wiôldżé,"] },
  instrumenta: { reply: ["to są jinstrumenta wszelczé."] },
};

const RE_PANELS = [
  ["kaszebksostolica", ["R1P1.3"]],
  ["kaszebskostolica", ["R1P1.3"]],
  ["krotkiedlugie", ["R1P1.1", "R1P1.2"]],
  ["baseskrzepce", ["R1P2.1", "R1P2.2"]],
  ["kaszeba", ["R1P2.3"]],
  ["tylnekolo", ["R2P2.3"]],
  ["prostykrzywy", ["R2P2.1", "R2P2.2"]],
  ["hojnewidlygnojne", ["R2P1.3", "R2P1.4"]],
  ["rydeltycz", ["R2P1.1", "R2P1.2"]],
  ["poltrojeczi", ["R3P3"]],
  ["poltorak", ["R3P3"]],
  ["ptoczi", ["R3P2"]],
  ["hoczi", ["R3P1"]],
  ["kleka", ["R4P1"]],
  ["wol", ["R4P2"]],
  ["cale", ["R4P3"]],
  ["pol", ["R4P3"]],
  ["male", ["R4P4"]],
  ["wielki", ["R4P4"]],
  ["instrumenta", ["R4P4"]],
];

function fold(name) {
  return name
    .replace(/^(?:RE|NA):\s*/i, "")
    .toLowerCase()
    .replace(/ł/g, "l")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z]/g, "");
}

function panelsFor(name) {
  const key = fold(name);
  const found = RE_PANELS.find(([token]) => token === key);
  if (!found) throw new Error(`Unmapped Kaszebe marker: ${name}`);
  return found[1];
}

function linesFor(marker) {
  const phrase = PHRASES[fold(marker.name)];
  if (!phrase) throw new Error(`Unmapped Kaszebe lyric: ${marker.name}`);
  const reply = marker.name.startsWith("RE:");
  const voice = reply ? "audience" : "narrator";
  return phrase[reply ? "reply" : "caller"].map((text) => ({ text, voice }));
}

// The rectangle meets the picture at the marker.
const APPROACH = 1.25;
const GRADE_LEAD = 0.55;
const LATE_WINDOW = 0.22;
const SETTLE = 0.16;
const HOJNE_PANEL = pairTarget(["R2P1.3", "R2P1.4"]);

// Median press and release from linear plays with the guides hidden
// (kaszebe-timing-2026-11-03-00-45-33, takes 3–4). Mistaken taps/holds
// from takes 1, 2, and 5 are excluded. Each value is seconds after that
// phrase's Premiere marker (or after the pair's second-word marker).
// Repeats are listed in sung order — the lag is not the same every time.
// instrumenta / male / wielki offsets are relative to their hit/end markers.
const MEASURED = {
  kaszeba: [
    { press: 0.267, release: -0.043 },
    { press: 0.127, release: 0.047 },
    { press: 0.158, release: 0.034 },
    { press: 0.089, release: -0.28 },
  ],
  base: [{ press: 0.164 }, { press: 0.123 }, { press: 0.111 }, { press: 0.12 }],
  skrzepce: [{ press: 0.039 }, { press: 0.08 }, { press: 0.072 }, { press: 0.088 }],
  krotkie: [{ press: 0.052 }, { press: 0.016 }, { press: 0.068 }, { press: 0.141 }],
  dludze: [{ press: 0.022 }, { press: 0.018 }, { press: 0.075 }, { press: 0.131 }],
  stolica: [
    { press: 0.122, release: 0.016 },
    { press: 0.112, release: -0.002 },
    { press: 0.068, release: 0.131 },
    { press: 0.019, release: -0.321 },
  ],
  tylnekolo: [
    { press: 0.269, release: -0.07 },
    { press: 0.13, release: 0.042 },
    { press: 0.183, release: -0.093 },
  ],
  proste: [{ press: 0.162 }, { press: 0.191 }, { press: 0.176 }],
  krzywe: [{ press: 0.193 }, { press: 0.172 }, { press: 0.14 }],
  hojne: [
    { press: 0.054, release: -0.105 },
    { press: 0.085, release: 0.016 },
    { press: 0.036, release: -0.077 },
  ],
  widle: [
    { press: 0.045, release: 0.153 },
    { press: 0.079, release: 0.156 },
    { press: 0.017, release: -0.125 },
  ],
  ridel: [{ press: 0.261 }, { press: 0.064 }, { press: 0.135 }],
  tycz: [{ press: 0.086 }, { press: 0.045 }, { press: 0.067 }],
  hoczi: [{ press: 0.116 }, { press: 0.054 }],
  ptoczi: [{ press: 0 }, { press: 0.026 }],
  poltorak: [
    { press: 0.052, release: -0.101 },
    { press: 0.036, release: -0.265 },
  ],
  kleka: [{ press: 0 }],
  wol: [{ press: 0.111 }],
  cale: [{ press: 0.081 }],
  pol: [{ press: 0.063 }],
  male: [{ press: 0.14 }],
  wielki: [{ press: 0.178 }],
  // Premiere "Instrumenta end" lands in the instrumental; players release ~0.7s earlier.
  instrumenta: [{ press: -1.103, release: -0.701 }],
};

const measuredCursor = {};

function takeMeasured(key) {
  const list = MEASURED[key];
  if (!list?.length) return { press: 0, release: 0 };
  const index = measuredCursor[key] ?? 0;
  measuredCursor[key] = index + 1;
  return list[Math.min(index, list.length - 1)];
}

function isPhrase(marker) {
  return marker.name.startsWith("NA:") || marker.name.startsWith("RE:");
}

function pointKind(marker) {
  const key = fold(marker.name);
  if (key.startsWith("endofhojne")) return "end-hojne";
  if (key === "widle") return "widle";
  if (key.startsWith("endof")) return "ignore";
  return "second";
}

function pushClick(cues, { panel, perfect, end, lines, tone, span, approach, start }) {
  const travel = approach ?? APPROACH;
  cues.push({
    panel,
    perfect,
    lead: GRADE_LEAD,
    approach: travel,
    lateRatio: LATE_WINDOW / GRADE_LEAD,
    settle: SETTLE,
    span,
    start: start ?? perfect - travel,
    end,
    lines,
    tone,
  });
}

function pushHold(cues, { panel, perfect, releaseAt, end, lines, tone, span, approach, start }) {
  const travel = approach ?? APPROACH;
  cues.push({
    hold: true,
    panel,
    panels: [panel],
    perfect,
    lead: GRADE_LEAD,
    approach: travel,
    lateRatio: LATE_WINDOW / GRADE_LEAD,
    settle: SETTLE,
    releaseAt,
    releaseLead: 0.26,
    releaseLateRatio: 0.55,
    span,
    start: start ?? perfect - travel,
    end,
    lines,
    tone,
  });
}

function addHojne(cues, marker, points, lyricEnd, lines, tone) {
  const endHojne = points.find((point) => pointKind(point) === "end-hojne");
  const widle = points.find((point) => pointKind(point) === "widle");
  if (!endHojne || !widle) throw new Error(`Hojne hold markers missing after ${marker.time}`);
  const areaEnd = marker.time + marker.duration;
  const first = takeMeasured("hojne");
  const second = takeMeasured("widle");
  const firstRelease = endHojne.time + first.release;
  const secondRelease = areaEnd + second.release;
  pushHold(cues, {
    panel: HOJNE_PANEL,
    perfect: marker.time + first.press,
    releaseAt: firstRelease,
    end: widle.time + second.press,
    lines,
    tone,
    span: firstRelease - (marker.time + first.press),
  });
  pushHold(cues, {
    panel: HOJNE_PANEL,
    perfect: widle.time + second.press,
    releaseAt: secondRelease,
    end: lyricEnd,
    lines,
    tone,
    span: secondRelease - (widle.time + second.press),
  });
}

function addPair(cues, marker, points, panels, lyricEnd, lines, tone) {
  const second = points.find((point) => pointKind(point) === "second");
  if (!second) throw new Error(`Second click marker missing after ${marker.name} at ${marker.time}`);
  const names = {
    prostykrzywy: ["proste", "krzywe"],
    baseskrzepce: ["base", "skrzepce"],
    krotkiedlugie: ["krotkie", "dludze"],
    rydeltycz: ["ridel", "tycz"],
  };
  const [firstKey, secondKey] = names[fold(marker.name)];
  const first = takeMeasured(firstKey);
  const secondHit = takeMeasured(secondKey);
  const panel = pairTarget(panels);
  const areaEnd = marker.time + marker.duration;
  const firstPerfect = marker.time + first.press;
  const secondPerfect = second.time + secondHit.press;
  pushClick(cues, {
    panel,
    perfect: firstPerfect,
    end: secondPerfect,
    lines,
    tone,
    span: second.time - marker.time,
  });
  pushClick(cues, {
    panel,
    perfect: secondPerfect,
    end: lyricEnd,
    lines,
    tone,
    span: Math.max(0.2, areaEnd - second.time),
  });
}

function addMarkedTap(cues, marker, points, panel, lyricEnd, lines, tone) {
  const hit = points.find((point) => fold(point.name).endsWith("hit"));
  if (!hit) throw new Error(`Hit marker missing after ${marker.name}`);
  const sample = takeMeasured(fold(marker.name));
  const perfect = hit.time + sample.press;
  const approach = Math.max(0.45, perfect - marker.time);
  pushClick(cues, {
    panel,
    perfect,
    end: lyricEnd,
    lines,
    tone,
    span: Math.max(0.2, lyricEnd - perfect),
    approach,
    start: marker.time,
  });
}

function addMarkedHold(cues, marker, points, panel, lyricEnd, lines, tone) {
  const hit = points.find((point) => fold(point.name).endsWith("hit"));
  const release = points.find((point) => {
    const key = fold(point.name);
    return key.endsWith("end") && !key.startsWith("endof");
  });
  if (!hit || !release) throw new Error(`Hold markers missing after ${marker.name}`);
  const sample = takeMeasured(fold(marker.name));
  const perfect = hit.time + sample.press;
  const releaseAt = release.time + (sample.release ?? 0);
  // Keep the slow Premiere approach even when measured press lands near the
  // phrase start (instrumenta). Otherwise the frame pops in for ~0.1s.
  const approach = Math.max(APPROACH, hit.time - marker.time, perfect - marker.time);
  pushHold(cues, {
    panel,
    perfect,
    releaseAt,
    end: lyricEnd,
    lines,
    tone,
    span: Math.max(0.2, releaseAt - perfect),
    approach,
    start: perfect - approach,
  });
}

function addSingle(cues, marker, panels, lyricEnd, lines, tone) {
  const span = marker.duration;
  const key = fold(marker.name);
  const panel = panels[0];
  const measuredKey = key === "kaszebskostolica" || key === "kaszebksostolica" ? "stolica" : key;
  const sample = takeMeasured(measuredKey);
  const perfect = marker.time + sample.press;
  const releaseAt = marker.time + span + (sample.release ?? 0);
  if (span >= HOLD_SINGLE || key === "poltorak") {
    pushHold(cues, {
      panel,
      perfect,
      releaseAt,
      end: lyricEnd,
      lines,
      tone,
      span: releaseAt - perfect,
    });
    return;
  }
  pushClick(cues, {
    panel,
    perfect,
    end: lyricEnd,
    lines,
    tone,
    span,
  });
}

export function installKaszebe(markers, duration) {
  for (const key of Object.keys(measuredCursor)) delete measuredCursor[key];
  const cues = [];
  for (let index = 0; index < markers.length; index += 1) {
    const marker = markers[index];
    if (!isPhrase(marker)) continue;
    let next = index + 1;
    const points = [];
    while (next < markers.length && !isPhrase(markers[next])) {
      points.push(markers[next]);
      next += 1;
    }
    const lyricEnd = markers[next]?.time ?? duration;
    const tone = marker.name.startsWith("RE:") ? "reply" : "caller";
    const lines = linesFor(marker);
    if (!marker.name.startsWith("RE:")) {
      cues.push({ start: marker.time, end: lyricEnd, lines, tone });
      continue;
    }
    const key = fold(marker.name);
    if (key === "hojnewidlygnojne") {
      addHojne(cues, marker, points, lyricEnd, lines, tone);
      continue;
    }
    const panels = panelsFor(marker.name);
    if (key === "male" || key === "wielki") {
      addMarkedTap(cues, marker, points, panels[0], lyricEnd, lines, tone);
      continue;
    }
    if (key === "instrumenta") {
      addMarkedHold(cues, marker, points, panels[0], lyricEnd, lines, tone);
      continue;
    }
    if (panels.length > 1) addPair(cues, marker, points, panels, lyricEnd, lines, tone);
    else addSingle(cues, marker, panels, lyricEnd, lines, tone);
  }
  installCues(cues, duration);
}
