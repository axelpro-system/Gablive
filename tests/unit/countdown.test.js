/**
 * Unit tests for countdown / wait-room leave rules.
 * Run: node --test tests/unit/countdown.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getCountdownParts, shouldLeaveWaitRoom } from '../../src/lib/countdown.js';

const NOW = new Date('2026-08-12T20:00:00.000Z').getTime();

describe('getCountdownParts', () => {
  it('marks missing target as expired zeros', () => {
    assert.deepEqual(getCountdownParts(null, NOW), {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isExpired: true,
    });
  });

  it('splits a future target into days/hours/minutes/seconds', () => {
    const target = new Date(NOW + (((1 * 24 + 2) * 60 + 3) * 60 + 4) * 1000).toISOString();
    assert.deepEqual(getCountdownParts(target, NOW), {
      days: 1,
      hours: 2,
      minutes: 3,
      seconds: 4,
      isExpired: false,
    });
  });

  it('marks a past target as expired', () => {
    assert.equal(getCountdownParts('2026-08-12T19:59:59.000Z', NOW).isExpired, true);
  });
});

describe('shouldLeaveWaitRoom', () => {
  const registration = { id: 'reg-1', session_start_at: new Date(NOW + 120_000).toISOString() };

  it('stays until data is loaded', () => {
    assert.equal(shouldLeaveWaitRoom({ webinar: null, registration, now: NOW }), false);
    assert.equal(
      shouldLeaveWaitRoom({
        webinar: { is_just_in_time: true, use_wait_room: true, slug: 'x' },
        registration: null,
        now: NOW,
      }),
      false
    );
  });

  it('keeps JIT wait-room visitors until session_start_at', () => {
    assert.equal(
      shouldLeaveWaitRoom({
        webinar: { is_just_in_time: true, use_wait_room: true, slug: 'x' },
        registration,
        now: NOW,
      }),
      false
    );
  });

  it('leaves JIT wait room after session_start_at', () => {
    assert.equal(
      shouldLeaveWaitRoom({
        webinar: { is_just_in_time: true, use_wait_room: true, slug: 'x' },
        registration,
        now: NOW + 120_000,
      }),
      true
    );
  });

  it('leaves immediately when JIT has no wait room or no session clock', () => {
    assert.equal(
      shouldLeaveWaitRoom({
        webinar: { is_just_in_time: true, use_wait_room: false, slug: 'x' },
        registration,
        now: NOW,
      }),
      true
    );
    assert.equal(
      shouldLeaveWaitRoom({
        webinar: { is_just_in_time: true, use_wait_room: true, slug: 'x' },
        registration: { id: 'reg-1', session_start_at: null },
        now: NOW,
      }),
      true
    );
  });

  it('keeps a future scheduled live webinar in the wait room', () => {
    assert.equal(
      shouldLeaveWaitRoom({
        webinar: {
          is_just_in_time: false,
          type: 'live',
          status: 'scheduled',
          scheduled_at: '2026-08-12T21:00:00.000Z',
          video_url: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
          slug: 'x',
        },
        registration: { id: 'reg-1' },
        now: NOW,
      }),
      false
    );
  });

  it('leaves when scheduled live time has been reached', () => {
    assert.equal(
      shouldLeaveWaitRoom({
        webinar: {
          is_just_in_time: false,
          type: 'live',
          status: 'scheduled',
          scheduled_at: '2026-08-12T19:00:00.000Z',
          video_url: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
          slug: 'x',
        },
        registration: { id: 'reg-1' },
        now: NOW,
      }),
      true
    );
  });
});
