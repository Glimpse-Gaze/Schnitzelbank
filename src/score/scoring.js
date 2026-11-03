export const GRADE_POINTS = {
  perfect: 100,
  good: 75,
  ok: 50,
  early: 0,
  late: 0,
};

export const PROST_MULTIPLIER = 1.2;
// +0.05× every 5 consecutive Ok+ hits → 1.05, 1.10, … capped at 1.50.
export const COMBO_STEP = 0.05;
export const COMBO_EVERY = 5;
export const COMBO_CAP = 1.5;

export function isHit(grade) {
  return grade === "perfect" || grade === "good" || grade === "ok";
}

export function createRunState(runId, difficulty = "easy") {
  return {
    runId,
    difficulty,
    score: 0,
    basePoints: 0,
    judgedNotes: 0,
    streak: 0,
    comboMult: 1,
    peakCombo: 1,
    bonusActive: false,
    prostCompletedThisRefrain: false,
    inRefrain: false,
    prostCount: 0,
    finalized: false,
  };
}

export function comboMultiplier(streak) {
  const steps = Math.floor(Math.max(0, streak) / COMBO_EVERY);
  return Math.min(COMBO_CAP, 1 + steps * COMBO_STEP);
}

export function applyGrade(state, grade, bonusMultiplier = 1) {
  if (state.finalized) return state;
  const base = GRADE_POINTS[grade] ?? 0;
  const hit = isHit(grade);
  let streak = hit ? state.streak + 1 : 0;
  const comboMult = comboMultiplier(streak);
  const bonus = hit && state.bonusActive ? bonusMultiplier : 1;
  const gained = Math.round(base * comboMult * bonus);
  return {
    ...state,
    judgedNotes: state.judgedNotes + 1,
    basePoints: state.basePoints + base,
    streak,
    comboMult,
    peakCombo: Math.max(state.peakCombo, comboMult),
    score: state.score + gained,
    bonusActive: hit ? state.bonusActive : false,
  };
}

export function accuracyOf(state) {
  if (!state.judgedNotes) return 0;
  return Math.round((state.basePoints / (100 * state.judgedNotes)) * 10000) / 100;
}

export function enterRefrain(state) {
  if (state.finalized) return state;
  return {
    ...state,
    inRefrain: true,
    bonusActive: false,
    prostCompletedThisRefrain: false,
  };
}

export function leaveRefrain(state) {
  if (state.finalized) return state;
  const arm = state.prostCompletedThisRefrain;
  return {
    ...state,
    inRefrain: false,
    prostCompletedThisRefrain: false,
    bonusActive: arm,
  };
}

export function completeProst(state, playing) {
  if (state.finalized) return { state, armed: false };
  if (!playing) return { state, armed: false };
  if (!state.inRefrain) return { state, armed: false };
  return {
    state: {
      ...state,
      prostCompletedThisRefrain: true,
      prostCount: state.prostCount + 1,
    },
    armed: true,
  };
}

export function finalizeRun(state) {
  return { ...state, finalized: true };
}

export function newRunId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `run-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
