// Schnitzelbank.mid is 2/4 at 120 BPM, so one bar lasts one second.
// The sung file is longer than this first loop; playback stops when the loop ends.
export const SECONDS_PER_BAR = 1;

export const steps = [
  {
    panel: "Row0_Panel0",
    bars: 8,
    lines: ["Ist das nicht ein Schnitzelbank?", "Ja das ist ein Schnitzelbank."],
  },
  {
    panel: "Row1_Panel1",
    bars: 8,
    lines: ["Ist das nicht ein kurz und lang?", "Ja das ist ein kurz und lang."],
  },
  {
    panel: "Row1_Panel2",
    bars: 8,
    lines: ["Ist das nicht ein hin und her?", "Ja das ist ein hin und her."],
  },
  {
    panel: "Row1_Panel2",
    bars: 2,
    lines: ["Hin und her,"],
  },
  {
    panel: "Row1_Panel1",
    bars: 2,
    lines: ["kurz und lang,"],
  },
  {
    panel: "Row0_Panel0",
    bars: 2,
    lines: ["Schnitzelbank,"],
  },
  {
    panel: "Row0_Panel0",
    bars: 12,
    lines: ["Oh du schöne,", "Oh du schöne,", "Oh du schöne Schnitzelbank."],
  },
];

export const sequenceDuration = steps.reduce(
  (sum, step) => sum + step.bars * SECONDS_PER_BAR,
  0,
);

export function stepAt(time) {
  if (time < 0 || time >= sequenceDuration) return null;
  let cursor = 0;
  for (let index = 0; index < steps.length; index += 1) {
    const step = steps[index];
    const duration = step.bars * SECONDS_PER_BAR;
    if (time < cursor + duration) {
      return {
        ...step,
        index,
        start: cursor,
        duration,
        progress: (time - cursor) / duration,
      };
    }
    cursor += duration;
  }
  return null;
}
