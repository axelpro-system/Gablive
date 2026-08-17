import { getLiveRoomState } from './liveRoomState.js';

const EMPTY = { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };

export function getCountdownParts(targetDate, now = Date.now()) {
  if (!targetDate) return { ...EMPTY };

  const target = new Date(targetDate).getTime();
  const current = typeof now === 'number' ? now : new Date(now).getTime();
  if (!Number.isFinite(target) || !Number.isFinite(current)) return { ...EMPTY };

  const diff = target - current;
  if (diff <= 0) return { ...EMPTY };

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    isExpired: false,
  };
}

export function waitRoomTarget(webinar, registration) {
  if (!webinar) return null;
  if (webinar.is_just_in_time) return registration?.session_start_at || null;
  return webinar.scheduled_at || null;
}

/**
 * Whether /wait should send the registrant to /room.
 * Uses the session/scheduled clock — not React hook state — so the first
 * render after data loads cannot false-expire and skip the wait room.
 */
export function shouldLeaveWaitRoom({ webinar, registration, now = Date.now() } = {}) {
  if (!webinar || !registration) return false;

  if (webinar.is_just_in_time) {
    if (!webinar.use_wait_room) return true;
    const start = registration.session_start_at;
    if (!start) return true;
    return getCountdownParts(start, now).isExpired;
  }

  const scheduled = webinar.scheduled_at;
  if (scheduled && !getCountdownParts(scheduled, now).isExpired) {
    return false;
  }

  const state = getLiveRoomState(webinar, new Date(now));
  return Boolean(state.showPlayer || state.state === 'player' || (scheduled && getCountdownParts(scheduled, now).isExpired));
}
