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
const KASZEBA_LATER = 0.2;
const KASZEBA_END_EARLIER = 0.3;
const STOLECA_END_EARLIER = 0.1;
const KOLO_END_EARLIER = 0.12;
const PROSTE_LATER = 0.12;
const HOJNE_END_EARLIER = 0.2;
const HOJNE_PANEL = pairTarget(["R2P1.3", "R2P1.4"]);

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
  pushHold(cues, {
    panel: HOJNE_PANEL,
    perfect: marker.time,
    releaseAt: endHojne.time - HOJNE_END_EARLIER,
    end: widle.time,
    lines,
    tone,
    span: endHojne.time - HOJNE_END_EARLIER - marker.time,
  });
  pushHold(cues, {
    panel: HOJNE_PANEL,
    perfect: widle.time,
    releaseAt: areaEnd - HOJNE_END_EARLIER,
    end: lyricEnd,
    lines,
    tone,
    span: areaEnd - HOJNE_END_EARLIER - widle.time,
  });
}

function addPair(cues, marker, points, panels, lyricEnd, lines, tone) {
  const second = points.find((point) => pointKind(point) === "second");
  if (!second) throw new Error(`Second click marker missing after ${marker.name} at ${marker.time}`);
  const later = fold(marker.name) === "prostykrzywy" ? PROSTE_LATER : 0;
  const panel = pairTarget(panels);
  const areaEnd = marker.time + marker.duration;
  pushClick(cues, {
    panel,
    perfect: marker.time + later,
    end: second.time,
    lines,
    tone,
    span: second.time - marker.time,
  });
  pushClick(cues, {
    panel,
    perfect: second.time + later,
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
  let perfect = marker.time;
  let releaseAt = marker.time + span;
  if (key === "kaszeba") {
    perfect += KASZEBA_LATER;
    releaseAt += KASZEBA_LATER - KASZEBA_END_EARLIER;
  }
  if (key === "kaszebskostolica" || key === "kaszebksostolica") releaseAt -= STOLECA_END_EARLIER;
  if (key === "tylnekolo") releaseAt -= KOLO_END_EARLIER;
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
