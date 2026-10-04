// Cue times are seconds in Schnitzelbank3.wav. Playback stops at the last cue.
// The frame lands when the audience should answer. The short echoes are sung
// with the narrator, so their frame lands at the start of the phrase.
const LATE_RATIO = 0.3;
const ECHO_LEAD = 1;

const cues = [
  {
    panel: "Row0_Panel0",
    start: 0,
    end: 8.3,
    lines: [
      { text: "Oh, du schöne,", voice: "narrator", repeat: 2 },
      { text: "oh, du schöne, Schnitzelbank", voice: "narrator" },
    ],
  },
  {
    panel: "Row0_Panel0",
    start: 8.3,
    end: 12.45,
    lines: [
      { text: "Ist das nicht ein Schnitzelbank?", voice: "narrator" },
      { text: "Ja das ist ein Schnitzelbank.", voice: "audience" },
    ],
  },
  {
    panel: "Row1_Panel1",
    start: 12.45,
    end: 17,
    lines: [
      { text: "Ist das nicht ein kurz und lang?", voice: "narrator" },
      { text: "Ja das ist ein kurz und lang.", voice: "audience" },
    ],
  },
  {
    panel: "Row1_Panel2",
    start: 17,
    end: 21.1,
    lines: [
      { text: "Ist das nicht ein hin und her?", voice: "narrator" },
      { text: "Ja das ist ein hin und her.", voice: "audience" },
    ],
  },
  {
    panel: "Row1_Panel2",
    start: 21.1,
    end: 22.1,
    lines: [{ text: "Hin und her,", voice: "audience" }],
  },
  {
    panel: "Row1_Panel1",
    start: 22.1,
    end: 23.1,
    lines: [{ text: "kurz und lang,", voice: "audience" }],
  },
  {
    panel: "Row0_Panel0",
    start: 23.1,
    end: 24.2,
    lines: [{ text: "Schnitzelbank,", voice: "audience" }],
  },
  {
    panel: "Row0_Panel0",
    start: 24.2,
    end: 32.4,
    lines: [
      { text: "Oh, du schöne,", voice: "narrator", repeat: 2 },
      { text: "oh, du schöne, Schnitzelbank", voice: "narrator" },
    ],
  },
];

function prepare(cue, index) {
  const narrator = cue.lines.filter((line) => line.voice === "narrator").length;
  const audience = cue.lines.filter((line) => line.voice === "audience").length;
  const duration = cue.end - cue.start;
  const prompt = audience > 0;
  const echo = prompt && narrator === 0;
  const lead = !prompt ? 0 : echo ? ECHO_LEAD : duration * (narrator / (narrator + audience));
  const perfect = !prompt ? null : echo ? cue.start : cue.start + lead;
  return {
    ...cue,
    index,
    prompt,
    lead,
    perfect,
    open: prompt ? perfect - lead : null,
  };
}

export const steps = cues.map(prepare);

export const sequenceDuration = steps[steps.length - 1].end;

export function stepAt(time) {
  if (time < 0 || time >= sequenceDuration) return null;
  for (let index = 0; index < steps.length; index += 1) {
    const step = steps[index];
    if (time < step.end) {
      const duration = step.end - step.start;
      return {
        ...step,
        index,
        duration,
        progress: (time - step.start) / duration,
      };
    }
  }
  return null;
}

export function openPrompts(time) {
  return steps.filter((step) => {
    if (!step.prompt) return false;
    return time >= step.open && time <= promptClose(step);
  });
}

export function frameAt(time) {
  const open = openPrompts(time);
  if (!open.length) return null;
  const upcoming = open.filter((step) => time <= step.perfect);
  const step = upcoming.length
    ? upcoming.reduce((best, item) => (item.perfect < best.perfect ? item : best))
    : open.reduce((best, item) => (item.perfect > best.perfect ? item : best));
  const elapsed = Math.max(0, time - step.open);
  const arrived = Math.min(1, elapsed / step.lead);
  const late = Math.max(0, time - step.perfect);
  const opacity = late === 0 ? 1 : Math.max(0, 1 - late / (step.lead * LATE_RATIO));
  return {
    panel: step.panel,
    index: step.index,
    scale: 1 + (1 - arrived) * 0.55,
    opacity,
  };
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

export function promptClose(step) {
  return step.perfect + step.lead * LATE_RATIO;
}
