// listen: the pointing hand follows the song.
// interactive: the shrinking frame is the cue, and the hand stays off.
export const PLAY_MODES = {
  listen: "listen",
  interactive: "interactive",
};

export const playMode = PLAY_MODES.interactive;

export function showPointingHand(mode = playMode) {
  return mode === PLAY_MODES.listen;
}
