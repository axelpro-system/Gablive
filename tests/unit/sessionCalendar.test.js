/**
 * Run: node --test tests/unit/sessionCalendar.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildGoogleCalendarUrl,
  formatConfirmedSignups,
  getReplayExpiresAt,
  isReplayAvailable,
} from '../../src/lib/sessionCalendar.js';
import { tallyPollVotes } from '../../src/lib/pollResults.js';

const START = '2026-08-20T18:00:00.000Z';

describe('replay expiry', () => {
  it('starts the replay clock from the personal session', () => {
    const expires = getReplayExpiresAt(
      { replay_enabled: true, replay_expires_hours: 48, scheduled_at: '2026-08-01T00:00:00.000Z' },
      { session_start_at: START },
    );
    assert.equal(expires.toISOString(), '2026-08-22T18:00:00.000Z');
  });

  it('keeps replay available when there is no session clock', () => {
    assert.equal(
      isReplayAvailable({ replay_enabled: true, replay_expires_hours: 48, scheduled_at: null }, null),
      true
    );
  });

  it('treats disabled replay as unavailable', () => {
    assert.equal(isReplayAvailable({ replay_enabled: false, scheduled_at: START }, null), false);
  });
});

describe('google calendar', () => {
  it('uses session duration instead of a fixed two-hour block', () => {
    const url = buildGoogleCalendarUrl(
      { title: 'Aula', description: 'x', session_duration_minutes: 90, scheduled_at: START },
      null,
    );
    assert.match(url, /dates=20260820T180000Z\/20260820T193000Z/);
  });

  it('returns null without a start time', () => {
    assert.equal(buildGoogleCalendarUrl({ title: 'Aula' }, null), null);
  });
});

describe('signup proof', () => {
  it('hides the line when nobody confirmed', () => {
    assert.equal(formatConfirmedSignups(0), null);
  });

  it('uses singular and plural copy', () => {
    assert.equal(formatConfirmedSignups(1), '1 pessoa já garantiu a vaga.');
    assert.equal(formatConfirmedSignups(12), '12 pessoas já garantiram a vaga.');
  });
});

describe('tallyPollVotes', () => {
  it('counts votes per option and ignores out-of-range indexes', () => {
    const tally = tallyPollVotes({
      options: ['Sim', 'Não'],
      poll_responses: [
        { selected_option: 0 },
        { selected_option: 0 },
        { selected_option: 1 },
        { selected_option: 9 },
      ],
    });
    assert.deepEqual(tally, { total: 3, counts: [2, 1] });
  });
});
