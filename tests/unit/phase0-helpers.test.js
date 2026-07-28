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
import {
  buildProviderEventId,
  normalizeHotmartWebhook,
  normalizeSelfluxWebhook,
  validateProviderWebhookSecret,
  shouldProcessProviderEvent,
} from '../../src/lib/salesProviders.js';
import {
  buildVideoEmbedUrl,
  getLiveRoomState,
  LIVE_ROOM_STATE,
} from '../../src/lib/liveRoomState.js';
import {
  buildDeleteWebinarPlan,
  validateDeleteConfirmation,
} from '../../src/lib/webinarDeletion.js';
import {
  AI_AGENT_TYPES,
  buildAgentRunPayload,
  normalizeAgentOutput,
  summarizeAgentContext,
  validateAgentType,
} from '../../src/lib/aiAgents.js';

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

describe('sales provider webhook helpers', () => {
  it('normalizes Hotmart purchase payloads into the provider event shape', () => {
    const normalized = normalizeHotmartWebhook({
      event: 'PURCHASE_APPROVED',
      hottok: 'secret',
      data: {
        purchase: {
          transaction: 'HP123',
          status: 'APPROVED',
          price: { value: 197.9, currency_code: 'BRL' },
        },
        product: { id: 9988, name: 'Imersao' },
        buyer: { email: 'BUYER@EXAMPLE.COM', name: 'Buyer Name' },
      },
    });

    assert.equal(normalized.provider, 'hotmart');
    assert.equal(normalized.providerEventId, 'hotmart:HP123:PURCHASE_APPROVED:approved');
    assert.equal(normalized.transactionId, 'HP123');
    assert.equal(normalized.productId, '9988');
    assert.equal(normalized.buyerEmail, 'buyer@example.com');
    assert.equal(normalized.eventType, 'purchase_approved');
    assert.equal(normalized.amountCents, 19790);
    assert.equal(normalized.currency, 'BRL');
  });

  it('normalizes Selflux/SellFlux payloads into the same event shape', () => {
    const normalized = normalizeSelfluxWebhook({
      event: 'sale.approved',
      transaction_id: 'SF123',
      offer_id: 'offer-77',
      customer: { email: 'lead@example.com', name: 'Lead' },
      amount: 129.5,
      currency: 'BRL',
      status: 'approved',
    });

    assert.equal(normalized.provider, 'selflux');
    assert.equal(normalized.providerEventId, 'selflux:SF123:sale.approved:approved');
    assert.equal(normalized.transactionId, 'SF123');
    assert.equal(normalized.productId, 'offer-77');
    assert.equal(normalized.buyerEmail, 'lead@example.com');
    assert.equal(normalized.eventType, 'purchase_approved');
    assert.equal(normalized.amountCents, 12950);
  });

  it('validates provider webhook secrets without timing-sensitive string compares leaking through behavior', () => {
    assert.equal(validateProviderWebhookSecret({ received: 'abc', expected: 'abc' }), true);
    assert.equal(validateProviderWebhookSecret({ received: 'abc', expected: 'def' }), false);
    assert.equal(validateProviderWebhookSecret({ received: '', expected: 'def' }), false);
    assert.equal(validateProviderWebhookSecret({ received: 'abc', expected: '' }), false);
  });

  it('builds stable idempotency keys and blocks already processed events', () => {
    assert.equal(
      buildProviderEventId({
        provider: 'hotmart',
        transactionId: 'tx-1',
        eventType: 'purchase_approved',
        status: 'approved',
      }),
      'hotmart:tx-1:purchase_approved:approved'
    );

    assert.equal(shouldProcessProviderEvent('hotmart:tx-1', new Set(['hotmart:tx-1'])), false);
    assert.equal(shouldProcessProviderEvent('hotmart:tx-2', new Set(['hotmart:tx-1'])), true);
  });
});

describe('live room state and embed urls', () => {
  const now = new Date('2026-07-28T12:00:00.000Z');

  it('opens the player for explicit live webinars', () => {
    assert.equal(
      getLiveRoomState({
        type: 'live',
        status: 'live',
        scheduled_at: '2026-07-28T13:00:00.000Z',
        video_url: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
      }, now).state,
      LIVE_ROOM_STATE.PLAYER
    );
  });

  it('opens scheduled live webinars when scheduled_at has passed', () => {
    assert.equal(
      getLiveRoomState({
        type: 'live',
        status: 'scheduled',
        scheduled_at: '2026-07-28T11:59:00.000Z',
        video_url: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
      }, now).state,
      LIVE_ROOM_STATE.PLAYER
    );
  });

  it('keeps future scheduled live webinars waiting and ended webinars ended', () => {
    assert.equal(
      getLiveRoomState({
        type: 'live',
        status: 'scheduled',
        scheduled_at: '2026-07-28T12:10:00.000Z',
        video_url: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
      }, now).state,
      LIVE_ROOM_STATE.WAITING
    );
    assert.equal(
      getLiveRoomState({
        type: 'live',
        status: 'ended',
        video_url: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
      }, now).state,
      LIVE_ROOM_STATE.ENDED
    );
  });

  it('returns unavailable when the room should play but has no supported video url', () => {
    assert.equal(
      getLiveRoomState({
        type: 'live',
        status: 'live',
        video_url: '',
      }, now).state,
      LIVE_ROOM_STATE.UNAVAILABLE
    );
  });

  it('builds supported YouTube and Vimeo embed URLs', () => {
    assert.match(
      buildVideoEmbedUrl('https://www.youtube.com/live/dQw4w9WgXcQ', 'https://app.gablive.com'),
      /youtube\.com\/embed\/dQw4w9WgXcQ/
    );
    assert.match(
      buildVideoEmbedUrl('https://vimeo.com/123456789', 'https://app.gablive.com'),
      /player\.vimeo\.com\/video\/123456789/
    );
    assert.equal(buildVideoEmbedUrl('https://example.com/video', 'https://app.gablive.com'), null);
  });
});

describe('webinar delete helper', () => {
  it('requires exact title confirmation before destructive delete', () => {
    assert.equal(validateDeleteConfirmation('Launch Webinar', 'Launch Webinar'), true);
    assert.equal(validateDeleteConfirmation('launch webinar', 'Launch Webinar'), false);
    assert.equal(validateDeleteConfirmation('', 'Launch Webinar'), false);
  });

  it('builds a scoped delete plan with audit metadata', () => {
    const plan = buildDeleteWebinarPlan({
      webinar: { id: 'webinar-1', org_id: 'org-1', title: 'Launch Webinar' },
      orgId: 'org-1',
      userId: 'user-1',
      confirmation: 'Launch Webinar',
    });

    assert.equal(plan.ok, true);
    assert.equal(plan.deleteFilter.id, 'webinar-1');
    assert.equal(plan.deleteFilter.org_id, 'org-1');
    assert.equal(plan.audit.action, 'delete');
    assert.equal(plan.audit.entityType, 'webinar');
    assert.equal(plan.audit.entityId, 'webinar-1');
  });

  it('rejects cross-org or mismatched confirmation delete plans', () => {
    assert.equal(buildDeleteWebinarPlan({
      webinar: { id: 'webinar-1', org_id: 'other-org', title: 'Launch Webinar' },
      orgId: 'org-1',
      userId: 'user-1',
      confirmation: 'Launch Webinar',
    }).ok, false);

    assert.equal(buildDeleteWebinarPlan({
      webinar: { id: 'webinar-1', org_id: 'org-1', title: 'Launch Webinar' },
      orgId: 'org-1',
      userId: 'user-1',
      confirmation: 'Wrong',
    }).ok, false);
  });
});

describe('AI agent helpers', () => {
  it('validates supported agent types and rejects unknown types', () => {
    assert.equal(validateAgentType(AI_AGENT_TYPES.WEBINAR_BUILDER).ok, true);
    assert.equal(validateAgentType(AI_AGENT_TYPES.CONVERSION_ANALYST).ok, true);
    assert.equal(validateAgentType('unknown-agent').ok, false);
  });

  it('builds a scoped agent run payload without leaking unrelated data', () => {
    const payload = buildAgentRunPayload({
      orgId: 'org-1',
      userId: 'user-1',
      agentType: AI_AGENT_TYPES.INTEGRATION_DEBUGGER,
      targetType: 'integration',
      targetId: 'hotmart',
      input: { provider: 'hotmart', secret: 'must-not-leak' },
    });

    assert.equal(payload.ok, true);
    assert.equal(payload.run.org_id, 'org-1');
    assert.equal(payload.run.created_by, 'user-1');
    assert.equal(payload.run.agent_type, 'integration_debugger');
    assert.equal(payload.run.status, 'queued');
    assert.equal(payload.run.input_context.provider, 'hotmart');
    assert.equal(payload.run.input_context.secret, undefined);
  });

  it('normalizes model output into artifacts and text summary', () => {
    const normalized = normalizeAgentOutput({
      summary: 'Diagnóstico pronto',
      recommendations: ['Mapear produto', 'Habilitar integração'],
      artifacts: [{ type: 'checklist', title: 'Correções', content: ['a'] }],
    });

    assert.equal(normalized.summary, 'Diagnóstico pronto');
    assert.equal(normalized.recommendations.length, 2);
    assert.equal(normalized.artifacts[0].type, 'checklist');
  });

  it('summarizes agent context with bounded counts for prompts', () => {
    const summary = summarizeAgentContext({
      webinar: { id: 'w1', title: 'Webinar A', status: 'live' },
      registrations: [{ id: 1 }, { id: 2 }],
      analyticsEvents: [{ id: 1 }],
      webhookEvents: [{ id: 1 }, { id: 2 }, { id: 3 }],
      mappings: [{ id: 1 }],
    });

    assert.equal(summary.webinar.title, 'Webinar A');
    assert.equal(summary.counts.registrations, 2);
    assert.equal(summary.counts.webhookEvents, 3);
    assert.equal(summary.counts.mappings, 1);
  });
});
