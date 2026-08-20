/**
 * Unit tests for Just-in-Time session clock (recurrence, duration, wait).
 * Run: node --test tests/unit/jitSession.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeJitSessionStartAt,
  getJitPlaybackState,
  needsJitWait,
} from '../../src/lib/jitSession.js';
import { RECURRENCE_TYPE, WAIT_ROOM_JIT_DELAY_SECONDS } from '../../src/lib/constants.js';

const NOW = new Date('2026-08-20T18:00:00.000Z').getTime();

describe('computeJitSessionStartAt', () => {
  it('returns null for a unique (non-JIT) webinar', () => {
    assert.equal(computeJitSessionStartAt({ is_just_in_time: false }, NOW), null);
  });

  it('starts immediately when always-available and wait room is off', () => {
    const start = computeJitSessionStartAt({
      is_just_in_time: true,
      recurrence_type: RECURRENCE_TYPE.NONE,
      use_wait_room: false,
    }, NOW);
    assert.equal(start, new Date(NOW).toISOString());
  });

  it('adds the wait-room delay when always-available with wait room on', () => {
    const start = computeJitSessionStartAt({
      is_just_in_time: true,
      recurrence_type: RECURRENCE_TYPE.NONE,
      use_wait_room: true,
    }, NOW);
    assert.equal(start, new Date(NOW + WAIT_ROOM_JIT_DELAY_SECONDS * 1000).toISOString());
  });

  it('uses the next daily slot when the current one has not started', () => {
    const start = computeJitSessionStartAt({
      is_just_in_time: true,
      recurrence_type: RECURRENCE_TYPE.DAILY,
      scheduled_at: '2026-08-20T20:00:00.000Z',
      session_duration_minutes: 60,
      use_wait_room: false,
    }, NOW);
    assert.equal(start, '2026-08-20T20:00:00.000Z');
  });

  it('skips a daily slot that already started so the lead watches from the beginning', () => {
    const start = computeJitSessionStartAt({
      is_just_in_time: true,
      recurrence_type: RECURRENCE_TYPE.DAILY,
      scheduled_at: '2026-08-20T17:30:00.000Z',
      session_duration_minutes: 60,
      use_wait_room: false,
    }, NOW);
    assert.equal(start, '2026-08-21T17:30:00.000Z');
  });

  it('starts a weekly session at the slot time when the lead arrives on time', () => {
    const start = computeJitSessionStartAt({
      is_just_in_time: true,
      recurrence_type: RECURRENCE_TYPE.WEEKLY,
      scheduled_at: '2026-08-13T18:00:00.000Z',
      session_duration_minutes: 90,
      use_wait_room: false,
    }, NOW);
    assert.equal(start, '2026-08-20T18:00:00.000Z');
  });

  it('skips a weekly slot that already started', () => {
    const start = computeJitSessionStartAt({
      is_just_in_time: true,
      recurrence_type: RECURRENCE_TYPE.WEEKLY,
      scheduled_at: '2026-08-13T18:00:00.000Z',
      session_duration_minutes: 90,
      use_wait_room: false,
    }, NOW + 1000);
    assert.equal(start, '2026-08-27T18:00:00.000Z');
  });
});

describe('getJitPlaybackState', () => {
  const webinar = {
    is_just_in_time: true,
    session_duration_minutes: 60,
    video_url: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
  };
  const registration = { session_start_at: '2026-08-20T18:00:00.000Z' };

  it('waits before the personal session start', () => {
    assert.equal(getJitPlaybackState(webinar, registration, NOW - 1000), 'waiting');
  });

  it('plays during the session duration', () => {
    assert.equal(getJitPlaybackState(webinar, registration, NOW + 10 * 60 * 1000), 'player');
  });

  it('ends when the session duration has elapsed', () => {
    assert.equal(getJitPlaybackState(webinar, registration, NOW + 60 * 60 * 1000), 'ended');
  });
});

describe('needsJitWait', () => {
  it('sends the lead to wait when the personal start is still in the future', () => {
    assert.equal(
      needsJitWait({ is_just_in_time: true }, new Date(NOW + 120_000).toISOString(), NOW),
      true
    );
  });

  it('skips wait when the session starts now', () => {
    assert.equal(
      needsJitWait({ is_just_in_time: true, use_wait_room: false }, new Date(NOW).toISOString(), NOW),
      false
    );
  });
});
