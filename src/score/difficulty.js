export const DIFFICULTIES = {
  easy: "easy",
  medium: "medium",
  hard: "hard",
  crazy: "crazy",
};

export const DIFFICULTY_OPTIONS = [
  { id: "easy", label: "Easy", detail: "Linear order with timing guides." },
  { id: "medium", label: "Medium", detail: "Linear order, guides off." },
  { id: "hard", label: "Hard", detail: "Shuffled pictures with guides." },
  { id: "crazy", label: "Crazy", detail: "Shuffled pictures, guides off." },
];

export function difficultyFromSettings(mode, showCues) {
  const shuffled = mode === "shuffled";
  if (!shuffled && showCues) return DIFFICULTIES.easy;
  if (!shuffled && !showCues) return DIFFICULTIES.medium;
  if (shuffled && showCues) return DIFFICULTIES.hard;
  return DIFFICULTIES.crazy;
}

export function settingsFromDifficulty(difficulty) {
  switch (difficulty) {
    case DIFFICULTIES.medium:
      return { mode: "linear", showCues: false };
    case DIFFICULTIES.hard:
      return { mode: "shuffled", showCues: true };
    case DIFFICULTIES.crazy:
      return { mode: "shuffled", showCues: false };
    case DIFFICULTIES.easy:
    default:
      return { mode: "linear", showCues: true };
  }
}

export function difficultyLabel(id) {
  return DIFFICULTY_OPTIONS.find((item) => item.id === id)?.label ?? id;
}
