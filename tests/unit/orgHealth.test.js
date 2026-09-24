/**
 * Unit tests for the org health score.
 * Run: node --test tests/unit/orgHealth.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  scoreOrgHealth,
  classifyScore,
  compareByUrgency,
  HEALTH_CLASS,
  HEALTH_CUTOFFS,
  HEALTH_WEIGHTS,
  NEW_ORG_GRACE_DAYS,
} from '../../src/lib/orgHealth.js';

const NOW = new Date('2026-09-24T12:00:00.000Z').getTime();
const daysAgo = (d) => new Date(NOW - d * 24 * 60 * 60 * 1000).toISOString();

const OLD_ORG = daysAgo(365);

const row = (overrides = {}) => ({
  created_at: OLD_ORG,
  last_registration_at: daysAgo(1),
  current: { registrations: 100, attendees: 40, cta_clicks: 10, approved_purchases: 3 },
  previous: { registrations: 100 },
  ...overrides,
});

describe('HEALTH_WEIGHTS', () => {
  it('sums to 1 so the score stays within 0–100', () => {
    const total = Object.values(HEALTH_WEIGHTS).reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(total - 1) < 1e-9);
  });
});

describe('scoreOrgHealth', () => {
  it('gives 100 and "healthy" to an active, growing, selling org', () => {
    const result = scoreOrgHealth(row(), NOW);
    assert.equal(result.score, 100);
    assert.equal(result.classification, HEALTH_CLASS.HEALTHY);
    assert.equal(result.complete, true);
  });

  it('returns the four signals in a stable order with raw values', () => {
    const { signals } = scoreOrgHealth(row(), NOW);
    assert.deepEqual(signals.map((s) => s.key), ['recency', 'trend', 'attendance', 'sales']);
    assert.equal(signals.find((s) => s.key === 'recency').value, 1);
    assert.equal(signals.find((s) => s.key === 'sales').value, 3);
  });

  it('gives 0 and "risk" to an org with no registrations ever', () => {
    const result = scoreOrgHealth(
      row({
        last_registration_at: null,
        current: { registrations: 0, attendees: 0, approved_purchases: 0 },
        previous: { registrations: 0 },
      }),
      NOW,
    );
    assert.equal(result.score, 0);
    assert.equal(result.classification, HEALTH_CLASS.RISK);
  });

  it('drops recency to zero after 30 days without registrations', () => {
    const { signals } = scoreOrgHealth(row({ last_registration_at: daysAgo(45) }), NOW);
    assert.equal(signals.find((s) => s.key === 'recency').ratio, 0);
  });

  it('decays recency linearly between 7 and 30 days', () => {
    const { signals } = scoreOrgHealth(row({ last_registration_at: daysAgo(18.5) }), NOW);
    const recency = signals.find((s) => s.key === 'recency').ratio;
    assert.ok(Math.abs(recency - 0.5) < 1e-9);
  });

  it('treats growth from an empty previous period as full trend', () => {
    const { signals } = scoreOrgHealth(row({ previous: { registrations: 0 } }), NOW);
    assert.equal(signals.find((s) => s.key === 'trend').ratio, 1);
  });

  it('scales trend by the drop against the previous period', () => {
    const { signals } = scoreOrgHealth(
      row({ current: { registrations: 25, attendees: 10, approved_purchases: 1 }, previous: { registrations: 100 } }),
      NOW,
    );
    assert.equal(signals.find((s) => s.key === 'trend').ratio, 0.25);
  });

  it('classifies an active org that stopped selling and halved as "attention"', () => {
    // recency 40 + trend 0.5*25 + attendance 0.5*15 + sales 0 = 60
    const result = scoreOrgHealth(
      row({ current: { registrations: 50, attendees: 10, approved_purchases: 0 }, previous: { registrations: 100 } }),
      NOW,
    );
    assert.equal(result.score, 60);
    assert.equal(result.classification, HEALTH_CLASS.ATTENTION);
  });

  it('marks orgs younger than the grace period as "new", even with a low score', () => {
    const result = scoreOrgHealth(
      row({
        created_at: daysAgo(NEW_ORG_GRACE_DAYS - 1),
        last_registration_at: null,
        current: { registrations: 0, attendees: 0, approved_purchases: 0 },
        previous: { registrations: 0 },
      }),
      NOW,
    );
    assert.equal(result.score, 0);
    assert.equal(result.classification, HEALTH_CLASS.NEW);
  });

  it('flags incomplete data instead of guessing a class', () => {
    const result = scoreOrgHealth({ created_at: OLD_ORG, current: null }, NOW);
    assert.equal(result.complete, false);
    assert.equal(result.score, null);
    assert.equal(result.classification, HEALTH_CLASS.UNKNOWN);
  });

  it('never exceeds 100 when attendance is above target', () => {
    const result = scoreOrgHealth(
      row({ current: { registrations: 10, attendees: 10, approved_purchases: 1 }, previous: { registrations: 10 } }),
      NOW,
    );
    assert.equal(result.score, 100);
  });
});

describe('classifyScore', () => {
  it('uses the configured cutoffs', () => {
    assert.equal(classifyScore(HEALTH_CUTOFFS.healthy), HEALTH_CLASS.HEALTHY);
    assert.equal(classifyScore(HEALTH_CUTOFFS.healthy - 1), HEALTH_CLASS.ATTENTION);
    assert.equal(classifyScore(HEALTH_CUTOFFS.attention), HEALTH_CLASS.ATTENTION);
    assert.equal(classifyScore(HEALTH_CUTOFFS.attention - 1), HEALTH_CLASS.RISK);
  });
});

describe('compareByUrgency', () => {
  it('puts risk first, then attention, and lower scores first within a class', () => {
    const items = [
      { id: 'healthy', health: { classification: HEALTH_CLASS.HEALTHY, score: 90 } },
      { id: 'risk-30', health: { classification: HEALTH_CLASS.RISK, score: 30 } },
      { id: 'attention', health: { classification: HEALTH_CLASS.ATTENTION, score: 50 } },
      { id: 'risk-10', health: { classification: HEALTH_CLASS.RISK, score: 10 } },
    ];
    assert.deepEqual(items.sort(compareByUrgency).map((i) => i.id), ['risk-10', 'risk-30', 'attention', 'healthy']);
  });
});
