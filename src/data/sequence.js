import { panelFor } from "../audio/markers.js";

// Sections come from the Premiere markers shared by the three stems.
// A caller line and its answer are one phrase. The frame lands on the answer.
// A recall is sung with the caller, so its frame lands at the start.
const LATE_RATIO = 0.3;
const RECALL_LEAD = 1;

const REFRAIN = [
  { text: "Oh, du schöne,", voice: "narrator", repeat: 3 },
  { text: "Schnitzelbank", voice: "narrator" },
];

export const steps = [];
export let sequenceDuration = 0;

export function songLength() {
  return sequenceDuration;
}

function kindOf(name) {
  if (name === "REF") return "ref";
  if (name.startsWith("CA:")) return "ca";
  if (name.startsWith("AD:")) return "ad";
  if (name.startsWith("RE:")) return "re";
  return "";
}

function labelOf(name) {
  return name.replace(/^(?:CA|AD|RE):\s*/, "").trim();
}

function prepare(cue, index) {
  const echo = cue.echo === true;
  const prompt = Boolean(cue.panel && cue.perfect != null && (echo || cue.hold || cue.perfect > cue.start));
  const lead = !prompt ? 0 : cue.lead ?? (echo ? RECALL_LEAD : cue.perfect - cue.start);
  const perfect = prompt ? cue.perfect : null;
  return {
    ...cue,
    index,
    prompt,
    lead,
    perfect,
    open: prompt ? perfect - lead : null,
  };
}

export function installSequence(markers, duration) {
  const points = markers
    .filter((marker) => marker.time < duration)
    .map((marker) => ({
      time: marker.time,
      kind: kindOf(marker.name),
      label: labelOf(marker.name),
    }));
  const cues = [];
  const introduced = [];
  const pushRecall = (start, end) => {
    if (!introduced.length || !(end > start)) return;
    const chain = [...introduced].reverse();
    const slot = (end - start) / chain.length;
    chain.forEach((item, index) => {
      cues.push({
        panel: item.panel,
        start: start + index * slot,
        end: start + (index + 1) * slot,
        echo: true,
        dexterity: true,
        chainIndex: index,
        recallId: start,
        perfect: start + index * slot,
        lead: slot,
        lines: [{ text: item.label, voice: "audience" }],
        response: index === 0 ? { start, duration: end - start } : undefined,
      });
    });
  };
  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    if (point.kind === "ad") continue;
    const nextNamed = points.slice(index + 1).find((item) => item.kind);
    const end = nextNamed?.time ?? duration;
    if (!point.kind) {
      if (nextNamed?.kind === "ref") pushRecall(point.time, nextNamed.time);
      continue;
    }
    if (point.kind === "ref") {
      cues.push({
        panel: "R0P0",
        start: point.time,
        end,
        lines: REFRAIN,
      });
      continue;
    }
    if (point.kind === "re") {
      pushRecall(point.time, end);
      continue;
    }
    const answer = points.slice(index + 1).find((item) => item.kind === "ad");
    if (!answer) continue;
    const answerIndex = points.indexOf(answer);
    const boundary = points[answerIndex + 1];
    const following = points.slice(answerIndex + 1).find((item) => item.kind);
    const recallAt = boundary && !boundary.kind && following?.kind === "ref" ? boundary.time : null;
    const panel = panelFor(point.label);
    if (panel) introduced.push({ panel, label: point.label });
    cues.push({
      panel,
      start: point.time,
      end: recallAt ?? following?.time ?? duration,
      perfect: answer.time,
      lines: [
        { text: `Ist das nicht ein ${point.label}?`, voice: "narrator" },
        { text: `Ja das ist ein ${answer.label}.`, voice: "audience" },
      ],
      response: { start: answer.time, duration: (boundary?.time ?? duration) - answer.time },
    });
  }
  installCues(cues, duration);
}

export function installCues(cues, duration) {
  steps.splice(0, steps.length, ...cues.map(prepare));
  sequenceDuration = duration;
}

export function responseOnGrade(value) {
  return value === "perfect" || value === "good" || value === "ok";
}

export function stepAt(time) {
  if (!steps.length || time < 0 || time >= sequenceDuration) return null;
  for (let index = 0; index < steps.length; index += 1) {
    const step = steps[index];
    if (time < step.end) {
      const duration = step.end - step.start;
      return {
        ...step,
        index,
        duration,
        progress: duration > 0 ? (time - step.start) / duration : 0,
      };
    }
  }
  return null;
}

export function promptClose(step) {
  return step.perfect + (step.settle ?? 0) + step.lead * (step.lateRatio ?? LATE_RATIO);
}

export function openPrompts(time) {
  return steps.filter((step) => {
    if (!step.prompt || step.hold) return false;
    return time >= step.open && time <= promptClose(step);
  });
}

export function releaseClose(step) {
  return step.releaseAt + step.releaseLead * (step.releaseLateRatio ?? 1);
}

function approachOf(step) {
  return step.approach ?? step.lead;
}

export function holdAt(time) {
  for (const step of steps) {
    if (!step.hold) continue;
    const began = step.perfect - approachOf(step);
    if (time < began || time > releaseClose(step)) continue;
    const length = Math.max(0.2, step.releaseAt - step.perfect);
    const progress = time <= step.perfect ? 0 : Math.min(1, (time - step.perfect) / length);
    return { index: step.index, panels: step.panels, progress };
  }
  return null;
}

export function holdForPanel(time, panel) {
  for (let index = steps.length - 1; index >= 0; index -= 1) {
    const step = steps[index];
    if (!step.hold || !step.panels?.includes(panel)) continue;
    if (time >= step.open && time <= promptClose(step)) return step;
  }
  return null;
}

// The opening accelerates from rest. After that the shrink is the old straight line,
// so the frame meets the picture on a steady, readable pace.
function cueTravel(amount) {
  const t = Math.min(1, Math.max(0, amount));
  const split = 0.3;
  if (t >= split) return t;
  const u = t / split;
  return split * u * u * (2 - u);
}

function fadeIn(amount) {
  const t = Math.min(1, Math.max(0, amount));
  return t * t * (3 - 2 * t);
}

function paintFrame(step, time) {
  const approach = approachOf(step);
  const began = step.perfect - approach;
  const elapsed = Math.max(0, time - began);
  const arrived = approach > 0 ? cueTravel(Math.min(1, elapsed / approach)) : 1;
  const late = Math.max(0, time - (step.perfect + (step.settle ?? 0)));
  const lateSpan = step.lead * (step.lateRatio ?? LATE_RATIO);
  const fade = late === 0 || lateSpan <= 0 ? 1 : Math.max(0, 1 - late / lateSpan);
  const introSpan = step.approach ? 0.22 : 0;
  const intro = introSpan <= 0 ? 1 : fadeIn(Math.min(1, elapsed / introSpan));
  const opacity = fade * intro;
  return {
    panel: step.panel,
    index: step.index,
    scale: 1 + (1 - arrived) * 0.55,
    opacity,
  };
}

export function framesAt(time) {
  return steps
    .filter((step) => {
      if (!step.prompt) return false;
      const began = step.perfect - approachOf(step);
      return time >= began && time <= promptClose(step);
    })
    .map((step) => paintFrame(step, time));
}

export function frameAt(time) {
  const open = framesAt(time);
  if (!open.length) return null;
  const upcoming = open.filter((frame) => time <= steps[frame.index].perfect);
  return upcoming.length
    ? upcoming.reduce((best, frame) => (steps[frame.index].perfect < steps[best.index].perfect ? frame : best))
    : open.reduce((best, frame) => (steps[frame.index].perfect > steps[best.index].perfect ? frame : best));
}

export function promptForPanel(time, panel) {
  const matches = openPrompts(time).filter((step) => step.panel === panel);
  if (!matches.length) return null;
  return matches.reduce((best, step) =>
    Math.abs(time - step.perfect) < Math.abs(time - best.perfect) ? step : best,
  );
}

export function gradeAt(time, step) {
  const offset = time - step.perfect;
  const ratio = Math.abs(offset) / step.lead;
  if (ratio <= 0.05) return "perfect";
  if (ratio <= 0.15) return "good";
  if (ratio <= 0.3) return "ok";
  return offset >= 0 ? "late" : "early";
}
