/**
 * Unit tests for seat usage summary and Edge Function error parsing.
 * Run: node --test tests/unit/seats.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { summarizeSeats, SUBSCRIPTION_STATUS } from '../../src/lib/seats.js';
import { readFunctionErrorBody } from '../../src/lib/functionErrors.js';

const NOW = new Date('2026-09-24T12:00:00.000Z').getTime();
const inDays = (d) => new Date(NOW + d * 24 * 60 * 60 * 1000).toISOString();

const usage = (overrides = {}) => ({
  has_subscription: true,
  plan: { code: 'starter', name: 'Entrada' },
  status: SUBSCRIPTION_STATUS.ACTIVE,
  trial_ends_at: null,
  used: 1,
  limit: 2,
  can_invite: true,
  ...overrides,
});

describe('summarizeSeats', () => {
  it('returns null when there is no usage payload', () => {
    assert.equal(summarizeSeats(null, NOW), null);
  });

  it('reports remaining seats under the limit', () => {
    const s = summarizeSeats(usage(), NOW);
    assert.equal(s.used, 1);
    assert.equal(s.limit, 2);
    assert.equal(s.remaining, 1);
    assert.equal(s.canInvite, true);
    assert.equal(s.unlimited, false);
    assert.equal(s.planName, 'Entrada');
  });

  it('blocks invites exactly at the limit', () => {
    const s = summarizeSeats(usage({ used: 2, can_invite: false }), NOW);
    assert.equal(s.remaining, 0);
    assert.equal(s.canInvite, false);
    assert.equal(s.overLimit, false);
  });

  it('flags usage above the limit after a downgrade without negative remaining', () => {
    const s = summarizeSeats(usage({ used: 5, can_invite: false }), NOW);
    assert.equal(s.overLimit, true);
    assert.equal(s.remaining, 0);
  });

  it('treats a null limit (Legado) as unlimited', () => {
    const s = summarizeSeats(usage({ limit: null, used: 40, can_invite: true }), NOW);
    assert.equal(s.unlimited, true);
    assert.equal(s.limit, null);
    assert.equal(s.remaining, null);
    assert.equal(s.canInvite, true);
  });

  it('treats an org without subscription as unlimited', () => {
    const s = summarizeSeats(usage({ has_subscription: false, limit: null, plan: null, status: null }), NOW);
    assert.equal(s.unlimited, true);
    assert.equal(s.canInvite, true);
  });

  it('trusts the server decision over its own arithmetic', () => {
    const s = summarizeSeats(usage({ used: 1, limit: 2, can_invite: false }), NOW);
    assert.equal(s.canInvite, false);
  });

  it('computes trial days left while the trial is running', () => {
    const s = summarizeSeats(usage({ status: SUBSCRIPTION_STATUS.TRIAL, trial_ends_at: inDays(3.2) }), NOW);
    assert.equal(s.trialExpired, false);
    assert.equal(s.trialDaysLeft, 4);
  });

  it('reports an expired trial without blocking invites', () => {
    const s = summarizeSeats(usage({ status: SUBSCRIPTION_STATUS.TRIAL, trial_ends_at: inDays(-1) }), NOW);
    assert.equal(s.trialExpired, true);
    assert.equal(s.trialDaysLeft, null);
    assert.equal(s.canInvite, true);
  });

  it('ignores trial dates when the subscription is no longer in trial', () => {
    const s = summarizeSeats(usage({ status: SUBSCRIPTION_STATUS.ACTIVE, trial_ends_at: inDays(-10) }), NOW);
    assert.equal(s.trialExpired, false);
  });
});

describe('readFunctionErrorBody', () => {
  it('parses the JSON body of a FunctionsHttpError-like error', async () => {
    const error = { context: new Response(JSON.stringify({ error: 'seat_limit_reached', used: 2, limit: 2 }), { status: 403 }) };
    assert.deepEqual(await readFunctionErrorBody(error), { error: 'seat_limit_reached', used: 2, limit: 2 });
  });

  it('returns null when there is no response context', async () => {
    assert.equal(await readFunctionErrorBody(new Error('network')), null);
    assert.equal(await readFunctionErrorBody(null), null);
  });

  it('returns null when the body is not JSON', async () => {
    const error = { context: new Response('Internal Server Error', { status: 500 }) };
    assert.equal(await readFunctionErrorBody(error), null);
  });
});
