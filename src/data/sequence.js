// Cue times are seconds in Schnitzelbank3.wav. Playback stops at the last cue.
export const steps = [
  {
    panel: "Row0_Panel0",
    start: 0,
    end: 8.3,
    lines: ["Oh, du schöne,", "oh, du schöne,", "oh, du schöne, Schnitzelbank"],
  },
  {
    panel: "Row0_Panel0",
    start: 8.3,
    end: 12.45,
    lines: ["Ist das nicht ein Schnitzelbank?", "Ja das ist ein Schnitzelbank."],
  },
  {
    panel: "Row1_Panel1",
    start: 12.45,
    end: 17,
    lines: ["Ist das nicht ein kurz und lang?", "Ja das ist ein kurz und lang."],
  },
  {
    panel: "Row1_Panel2",
    start: 17,
    end: 21.1,
    lines: ["Ist das nicht ein hin und her?", "Ja das ist ein hin und her."],
  },
  {
    panel: "Row1_Panel2",
    start: 21.1,
    end: 22.1,
    lines: ["Hin und her,"],
  },
  {
    panel: "Row1_Panel1",
    start: 22.1,
    end: 23.1,
    lines: ["kurz und lang,"],
  },
  {
    panel: "Row0_Panel0",
    start: 23.1,
    end: 24.2,
    lines: ["Schnitzelbank,"],
  },
  {
    panel: "Row0_Panel0",
    start: 24.2,
    end: 32.4,
    lines: ["Oh, du schöne,", "oh, du schöne,", "oh, du schöne, Schnitzelbank"],
  },
];

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
