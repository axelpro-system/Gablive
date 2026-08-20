import { RECURRENCE_TYPE, WAIT_ROOM_JIT_DELAY_SECONDS } from './constants.js';

function toMs(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : Date.now();
}

function durationMs(minutes) {
  const mins = Number(minutes);
  return Math.max(1, Number.isFinite(mins) ? mins : 60) * 60 * 1000;
}

function nextSlotStart(nowMs, scheduledAt, recurrenceType) {
  const anchor = new Date(scheduledAt).getTime();
  if (!Number.isFinite(anchor)) return nowMs;

  const stepMs = recurrenceType === RECURRENCE_TYPE.WEEKLY
    ? 7 * 24 * 60 * 60 * 1000
    : 24 * 60 * 60 * 1000;

  if (nowMs <= anchor) return anchor;

  const index = Math.floor((nowMs - anchor) / stepMs);
  const slotStart = anchor + index * stepMs;
  if (nowMs < slotStart) return slotStart;
  if (nowMs === slotStart) return slotStart;
  return slotStart + stepMs;
}

/**
 * Personal session start for a JIT registration.
 * Always-available: now, or now + wait delay.
 * Daily/weekly: next slot that has not started yet (lead watches from the beginning).
 */
export function computeJitSessionStartAt(webinar, now = Date.now()) {
  if (!webinar?.is_just_in_time) return null;

  const nowMs = toMs(now);
  const recurrence = webinar.recurrence_type || RECURRENCE_TYPE.NONE;

  if (recurrence === RECURRENCE_TYPE.DAILY || recurrence === RECURRENCE_TYPE.WEEKLY) {
    if (webinar.scheduled_at) {
      return new Date(nextSlotStart(
        nowMs,
        webinar.scheduled_at,
        recurrence,
      )).toISOString();
    }
  }

  const delayMs = webinar.use_wait_room ? WAIT_ROOM_JIT_DELAY_SECONDS * 1000 : 0;
  return new Date(nowMs + delayMs).toISOString();
}

export function getJitSessionEndsAt(webinar, sessionStartAt) {
  if (!sessionStartAt) return null;
  const startMs = new Date(sessionStartAt).getTime();
  if (!Number.isFinite(startMs)) return null;
  return new Date(startMs + durationMs(webinar?.session_duration_minutes)).toISOString();
}

/**
 * @returns {'waiting'|'player'|'ended'|null}
 */
export function getJitPlaybackState(webinar, registration, now = Date.now()) {
  if (!webinar?.is_just_in_time) return null;
  const start = registration?.session_start_at;
  if (!start) return null;

  const startMs = new Date(start).getTime();
  if (!Number.isFinite(startMs)) return null;

  const current = toMs(now);
  const endMs = startMs + durationMs(webinar.session_duration_minutes);

  if (current < startMs) return 'waiting';
  if (current >= endMs) return 'ended';
  return 'player';
}

export function needsJitWait(webinar, sessionStartAt, now = Date.now()) {
  if (!webinar?.is_just_in_time || !sessionStartAt) {
    return Boolean(webinar?.use_wait_room);
  }
  return new Date(sessionStartAt).getTime() - toMs(now) > 1000;
}
