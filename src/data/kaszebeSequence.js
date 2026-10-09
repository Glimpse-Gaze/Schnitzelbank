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

// Median press and release from six linear plays with the guides hidden
// (kaszebe-timing-2026-10-08-23-04-16). Two mistaken clicks in take 5 are
// excluded. Each value is seconds after that phrase's Premiere marker.
// Repeats are listed in the order they are sung, because the lag is not the same every time.
const MEASURED = {
  kaszeba: [
    { press: 0.398, release: 0.183 },
    { press: 0.302, release: 0.227 },
    { press: 0.3, release: 0.205 },
  ],
  base: [{ press: 0.345 }, { press: 0.273 }, { press: 0.292 }],
  skrzepce: [{ press: 0.267 }, { press: 0.242 }, { press: 0.278 }],
  krotkie: [{ press: 0.209 }, { press: 0.187 }, { press: 0.255 }],
  dludze: [{ press: 0.208 }, { press: 0.178 }, { press: 0.255 }],
  stolica: [
    { press: 0.309, release: 0.166 },
    { press: 0.283, release: 0.182 },
    { press: 0.242, release: 0.261 },
  ],
  tylnekolo: [
    { press: 0.373, release: 0.285 },
    { press: 0.272, release: 0.227 },
  ],
  proste: [{ press: 0.357 }, { press: 0.371 }],
  krzywe: [{ press: 0.407 }, { press: 0.351 }],
  hojne: [
    { press: 0.269, release: 0.136 },
    { press: 0.255, release: 0.197 },
  ],
  widle: [
    { press: 0.225, release: 0.205 },
    { press: 0.249, release: 0.212 },
  ],
  ridel: [{ press: 0.355 }, { press: 0.231 }],
  tycz: [{ press: 0.277 }, { press: 0.225 }],
  hoczi: [{ press: 0.257 }],
  ptoczi: [{ press: 0.188 }],
  poltorak: [{ press: 0.243, release: 0.134 }],
};

const measuredCursor = {};

function takeMeasured(key) {
  const index = measuredCursor[key] ?? 0;
  measuredCursor[key] = index + 1;
  const sample = MEASURED[key]?.[index];
  if (!sample) throw new Error(`No measured timing for ${key} repetition ${index + 1}`);
  return sample;
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

function pushClick(cues, { panel, perfect, end, lines, tone, span }) {
  cues.push({
    panel,
    perfect,
    lead: GRADE_LEAD,
    approach: APPROACH,
    lateRatio: LATE_WINDOW / GRADE_LEAD,
    settle: SETTLE,
    span,
    start: perfect - APPROACH,
    end,
    lines,
    tone,
  });
}

function pushHold(cues, { panel, perfect, releaseAt, end, lines, tone, span }) {
  cues.push({
    hold: true,
    panel,
    panels: [panel],
    perfect,
    lead: GRADE_LEAD,
    approach: APPROACH,
    lateRatio: LATE_WINDOW / GRADE_LEAD,
    settle: SETTLE,
    releaseAt,
    releaseLead: 0.26,
    releaseLateRatio: 0.55,
    span,
    start: perfect - APPROACH,
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
    if (panels.length > 1) addPair(cues, marker, points, panels, lyricEnd, lines, tone);
    else addSingle(cues, marker, panels, lyricEnd, lines, tone);
  }
  installCues(cues, duration);
}
