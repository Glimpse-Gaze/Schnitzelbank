// Premiere writes markers into the XMP chunk at the end of the wav.
// startTime is a sample offset at the file's sample rate.

const PANELS = {
  schnitzelbank: "R0P0",
  "kurz und lang": "R1P1",
  "hien und her": "R1P2",
  "hin und her": "R1P2",
  "kreuz und quer": "R1P3",
  "shiess gewehr": "R1P4",
  "wagen rad": "R2P1",
  "krum und grad": "R2P2",
  "krumm und grad": "R2P2",
  "grosses glas": "R2P3",
  "ochsen blas": "R2P4",
  "haufen mist": "R3P1",
  "schnickel fritz": "R3P2",
  "dicke frau": "R3P3",
  "fette sau": "R3P4",
  "langer mann": "R4P1",
  tannenbaum: "R4P2",
  "hochzeits ring": "R4P3",
  "gefahrliches ding": "R4P4",
};

function readString(view, offset, length) {
  let text = "";
  for (let index = 0; index < length; index += 1) text += String.fromCharCode(view.getUint8(offset + index));
  return text;
}

export function sampleRateOf(buffer) {
  const view = new DataView(buffer);
  let offset = 12;
  while (offset + 8 <= view.byteLength) {
    const id = readString(view, offset, 4);
    const size = view.getUint32(offset + 4, true);
    if (id === "fmt ") return view.getUint32(offset + 12, true);
    offset += 8 + size + (size % 2);
  }
  return 48000;
}

export function readMarkers(buffer) {
  const rate = sampleRateOf(buffer);
  const text = new TextDecoder("utf-8").decode(buffer);
  const markers = [];
  for (const block of text.matchAll(/<rdf:li rdf:parseType="Resource">([\s\S]*?)<\/rdf:li>/g)) {
    const start = block[1].match(/<xmpDM:startTime>(\d+)<\/xmpDM:startTime>/);
    if (!start) continue;
    const name = block[1].match(/<xmpDM:name>([^<]*)<\/xmpDM:name>/);
    const duration = block[1].match(/<xmpDM:duration>(\d+)<\/xmpDM:duration>/);
    markers.push({
      sample: Number(start[1]),
      time: Number(start[1]) / rate,
      duration: duration ? Number(duration[1]) / rate : 0,
      name: name?.[1]?.trim() ?? "",
    });
  }
  markers.sort((a, b) => a.sample - b.sample);
  return markers;
}

export function panelFor(label) {
  const key = label
    .toLowerCase()
    .replace(/ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/ß/g, "ss")
    .replace(/\u2026|\.\.\./g, "")
    .replace(/[^a-z\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return PANELS[key] ?? null;
}
