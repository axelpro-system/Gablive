/**
 * Unit tests for Phase 0 pure helpers (shipped entry points under src/lib).
 * Run: node --test tests/unit/phase0-helpers.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  shouldEmitVideoProgress,
  countProgressEmitsOverDuration,
  DEFAULT_MIN_INTERVAL_SEC,
} from '../../src/lib/videoProgressSampling.js';
import {
  canSendChatMessage,
  capChatMessages,
  CHAT_MESSAGE_CAP,
  CHAT_SEND_MIN_INTERVAL_MS,
} from '../../src/lib/chatLimits.js';
import {
  nextEmailQueueStateAfterAttempt,
  MAX_EMAIL_ATTEMPTS,
  EMAIL_BACKOFF_MINUTES_PER_ATTEMPT,
} from '../../src/lib/emailQueueRetry.js';
import {
  applyEmailPlaceholders,
  buildResendEmailPayload,
  getDefaultEmailBodyHtml,
} from '../../src/lib/emailTemplates.js';
import { slugBaseFromTitle } from '../../src/lib/slugify.js';

describe('shouldEmitVideoProgress / countProgressEmitsOverDuration', () => {
  it('emits at most 10 times over a continuous 10-minute (600s) session at 60s interval', () => {
    const count = countProgressEmitsOverDuration(600, DEFAULT_MIN_INTERVAL_SEC);
    assert.ok(count <= 10, `expected ≤10 emits, got ${count}`);
    assert.ok(count >= 9, `expected roughly 10 emits, got ${count}`);
  });

  it('does not emit before the first interval', () => {
    assert.equal(shouldEmitVideoProgress(null, 0, 60), false);
    assert.equal(shouldEmitVideoProgress(null, 59, 60), false);
    assert.equal(shouldEmitVideoProgress(null, 60, 60), true);
  });

  it('requires min interval since last emit', () => {
    assert.equal(shouldEmitVideoProgress(60, 119, 60), false);
    assert.equal(shouldEmitVideoProgress(60, 120, 60), true);
  });

  it('rejects invalid currentSec', () => {
    assert.equal(shouldEmitVideoProgress(null, -1, 60), false);
    assert.equal(shouldEmitVideoProgress(null, NaN, 60), false);
  });
});

describe('chat limits', () => {
  it('caps messages to the last N', () => {
    const msgs = Array.from({ length: 250 }, (_, i) => ({ id: i }));
    const capped = capChatMessages(msgs, CHAT_MESSAGE_CAP);
    assert.equal(capped.length, 200);
    assert.equal(capped[0].id, 50);
    assert.equal(capped[199].id, 249);
  });

  it('throttles sends closer than 2s', () => {
    const t0 = 1_000_000;
    assert.equal(canSendChatMessage(null, t0), true);
    assert.equal(canSendChatMessage(t0, t0 + 1999, CHAT_SEND_MIN_INTERVAL_MS), false);
    assert.equal(canSendChatMessage(t0, t0 + 2000, CHAT_SEND_MIN_INTERVAL_MS), true);
  });
});

describe('nextEmailQueueStateAfterAttempt', () => {
  const fixed = new Date('2026-07-24T12:00:00.000Z');

  it('marks sent on success', () => {
    const next = nextEmailQueueStateAfterAttempt({
      attempts: 0,
      success: true,
      now: fixed,
    });
    assert.equal(next.status, 'sent');
    assert.equal(next.attempts, 1);
    assert.equal(next.sent_at, fixed.toISOString());
    assert.equal(next.error, null);
  });

  it('requeues pending with backoff on attempt 1 and 2', () => {
    const a1 = nextEmailQueueStateAfterAttempt({
      attempts: 0,
      success: false,
      now: fixed,
      errorMessage: 'boom',
    });
    assert.equal(a1.status, 'pending');
    assert.equal(a1.attempts, 1);
    assert.ok(a1.scheduled_at);
    const delay1 =
      new Date(a1.scheduled_at).getTime() - fixed.getTime();
    assert.equal(
      delay1,
      EMAIL_BACKOFF_MINUTES_PER_ATTEMPT * 1 * 60 * 1000
    );

    const a2 = nextEmailQueueStateAfterAttempt({
      attempts: 1,
      success: false,
      now: fixed,
      errorMessage: 'boom',
    });
    assert.equal(a2.status, 'pending');
    assert.equal(a2.attempts, 2);
    const delay2 =
      new Date(a2.scheduled_at).getTime() - fixed.getTime();
    assert.equal(
      delay2,
      EMAIL_BACKOFF_MINUTES_PER_ATTEMPT * 2 * 60 * 1000
    );
  });

  it('terminal fails on attempt reaching MAX_EMAIL_ATTEMPTS', () => {
    const terminal = nextEmailQueueStateAfterAttempt({
      attempts: MAX_EMAIL_ATTEMPTS - 1,
      success: false,
      now: fixed,
      errorMessage: 'final',
    });
    assert.equal(terminal.status, 'failed');
    assert.equal(terminal.attempts, MAX_EMAIL_ATTEMPTS);
    assert.equal(terminal.scheduled_at, null);
    assert.match(terminal.error, /final/);
  });
});

describe('email templates (Resend html)', () => {
  it('applies placeholders including wait/room urls', () => {
    const html = applyEmailPlaceholders(
      'Oi {name} — {webinar_title} — {wait_url}',
      {
        name: 'Ana',
        webinar_title: 'Lançamento',
        wait_url: 'https://app.test/wait/x',
      }
    );
    assert.equal(html, 'Oi Ana — Lançamento — https://app.test/wait/x');
  });

  it('builds confirmation payload with branded default when body empty', () => {
    const { subject, html } = buildResendEmailPayload({
      type: 'confirmation',
      subject: '',
      bodyHtml: '',
      vars: {
        name: 'Ana',
        webinar_title: 'Funil X',
        wait_url: 'https://app.test/wait/funil-x',
      },
    });
    assert.match(subject, /Funil X/);
    assert.match(html, /Ana/);
    assert.match(html, /Gablive/);
    assert.match(html, /https:\/\/app\.test\/wait\/funil-x/);
    assert.ok(getDefaultEmailBodyHtml('confirmation').includes('{name}'));
  });
});

describe('slugBaseFromTitle', () => {
  it('does not turn YouTube URLs into path slugs', () => {
    const slug = slugBaseFromTitle(
      'https://www.youtube.com/watch?v=Y6MakWicjmQ',
      'https://www.youtube.com/watch?v=Y6MakWicjmQ'
    );
    assert.equal(slug, 'video-y6makwicjmq');
    assert.ok(!slug.includes('https'));
    assert.ok(!slug.includes('youtube'));
  });

  it('slugifies normal titles', () => {
    assert.equal(slugBaseFromTitle('IMERSÃO REVISIONAL'), 'imersao-revisional');
  });
});
