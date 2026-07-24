/** Minimum seconds between `video_progress` analytics emissions. */
export const DEFAULT_MIN_INTERVAL_SEC = 60;

/**
 * Decide whether to emit a sampled VIDEO_PROGRESS event.
 *
 * @param {number|null|undefined} lastEmitAtSec - Video time (seconds) of last emission, or null if none.
 * @param {number} currentSec - Current video time in seconds.
 * @param {number} [minIntervalSec=60]
 * @returns {boolean}
 */
export function shouldEmitVideoProgress(
  lastEmitAtSec,
  currentSec,
  minIntervalSec = DEFAULT_MIN_INTERVAL_SEC
) {
  if (typeof currentSec !== 'number' || !Number.isFinite(currentSec) || currentSec < 0) {
    return false;
  }
  if (typeof minIntervalSec !== 'number' || minIntervalSec <= 0) {
    return false;
  }

  // First sample only after a full interval (avoids 11 emits in 0..600 inclusive).
  if (lastEmitAtSec == null) {
    return currentSec >= minIntervalSec;
  }

  if (typeof lastEmitAtSec !== 'number' || !Number.isFinite(lastEmitAtSec)) {
    return currentSec >= minIntervalSec;
  }

  return currentSec - lastEmitAtSec >= minIntervalSec;
}

/**
 * Simulate a continuous watch from 0..durationSec (inclusive) at 1s ticks.
 * Used by tests and debugging — drives the real helper.
 *
 * @param {number} durationSec
 * @param {number} [minIntervalSec]
 * @returns {number} emit count
 */
export function countProgressEmitsOverDuration(
  durationSec,
  minIntervalSec = DEFAULT_MIN_INTERVAL_SEC
) {
  let last = null;
  let count = 0;
  for (let t = 0; t <= durationSec; t += 1) {
    if (shouldEmitVideoProgress(last, t, minIntervalSec)) {
      count += 1;
      last = t;
    }
  }
  return count;
}
