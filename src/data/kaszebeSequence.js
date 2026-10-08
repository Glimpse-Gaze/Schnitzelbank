import { installCues } from "./sequence.js";

const NA1 = [
  { text: "To je krótczé, to je dłudżé, to kaszëbskô stolëca,", voice: "narrator" },
  { text: "to są basë, to są skrzëpczi, to òznôczô Kaszëba.", voice: "narrator" },
];
const RE1 = [
  { text: "Òznôczô Kaszëba, basë, skrzëpczi,", voice: "audience" },
  { text: "krótczé, dłudżé, to kaszëbskô stolëca.", voice: "audience" },
];
const NA_RIDEL = [
  { text: "To je ridel, to je ticz,", voice: "narrator" },
  { text: "to są chòjnë, widłë gnojné.", voice: "narrator" },
];
const NA_WHEEL = [
  { text: "To je prosté, to je krzëwé,", voice: "narrator" },
  { text: "to je slédné kòło wòzné.", voice: "narrator" },
];
const RE_WHEEL = [
  { text: "Slédné kòło wòzné, prosté, krzëwé,", voice: "audience" },
  { text: "chòjnë, widłë gnojné, ridel, ticz, òznôczô Kaszëba, basë, skrzëpczi, krótczé, dłudżé, to kaszëbskô stolëca.", voice: "audience" },
];
const NA_BIRDS = [
  { text: "To są hôczi, to są ptôczi,", voice: "narrator" },
  { text: "to są prësczé półtrojôczi.", voice: "narrator" },
];
const RE_BIRDS = [
  { text: "Hôk, ptôk, półtrojôk,", voice: "audience" },
  { text: "slédné kòło wòzné, prosté, krzëwé, chòjnë, widłë gnojné, ridel, ticz, òznôczô Kaszëba, basë, skrzëpczi, krótczé, dłudżé, to kaszëbskô stolëca.", voice: "audience" },
];

// Caller lines stay up through each verse. Audience markers replace them.
const REGIONS = [
  { until: 17.667, tone: "caller", lines: NA1 },
  { until: 25.867, tone: "reply", lines: RE1 },
  { until: 31.417, tone: "caller", lines: NA_RIDEL },
  { until: 37.417, tone: "caller", lines: NA_WHEEL },
  { until: 53.5, tone: "reply", lines: RE_WHEEL },
  { until: 58.833, tone: "caller", lines: NA_BIRDS },
  { until: Infinity, tone: "reply", lines: RE_BIRDS },
];

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
    .replace(/^RE:\s*/i, "")
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

function regionAt(time) {
  return REGIONS.find((region) => time < region.until) ?? REGIONS[REGIONS.length - 1];
}

function pushNarration(cues, from, to) {
  let start = from;
  while (start < to - 0.02) {
    const region = regionAt(start + 0.02);
    const end = Math.min(to, region.until);
    if (!(end > start + 0.05)) {
      start = Math.max(end, start + 0.05);
      continue;
    }
    cues.push({
      start,
      end,
      lines: region.lines,
      tone: region.tone,
    });
    start = end;
  }
}

export function installKaszebe(markers, duration) {
  const cues = [];
  let cursor = 0;
  const replies = markers.filter((marker) => marker.name.startsWith("RE:"));
  replies.forEach((marker, replyIndex) => {
    const next = replies[replyIndex + 1];
    const span = marker.duration > 0
      ? marker.duration
      : (next?.time ?? duration) - marker.time;
    pushNarration(cues, cursor, marker.time);
    const panels = panelsFor(marker.name);
    const slice = span / panels.length;
    panels.forEach((panel, index) => {
      const start = marker.time + index * slice;
      const region = regionAt(start);
      cues.push({
        panel,
        start,
        end: start + slice,
        perfect: start + slice / 2,
        lead: slice / 2,
        lateRatio: 1,
        span: slice,
        lines: region.lines,
        tone: region.tone,
      });
    });
    cursor = marker.time + span;
  });
  pushNarration(cues, cursor, duration);
  installCues(cues, duration);
}
