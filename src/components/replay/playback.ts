/* How a replay plays: one step a beat, at one of a few speeds. */

/** How many steps a beat a replay plays at; the address does not keep it, as it says how to watch, not what is shown. */
export const REPLAY_SPEEDS = ['1', '2', '4'] as const;
export type ReplaySpeed = (typeof REPLAY_SPEEDS)[number];

/** How long a step lasts while a replay plays at its slowest speed. */
export const STEP_BEAT_MS = 1200;
