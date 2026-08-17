/**
 * Unit tests for lead KPI derivation.
 * Run: node --test tests/unit/leadKpis.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeLeadKpis, formatWatchDuration, reduceWatchSeconds } from '../../src/lib/leadKpis.js';

describe('computeLeadKpis', () => {
  it('returns zeros when there are no leads', () => {
    assert.deepEqual(computeLeadKpis({ total: 0, attended: 0 }), {
      total: 0,
      attended: 0,
      noShow: 0,
      attendanceRate: 0,
      avgWatchSeconds: 0,
    });
  });

  it('splits attended vs no-show and rounds the rate', () => {
    assert.deepEqual(computeLeadKpis({ total: 10, attended: 7 }), {
      total: 10,
      attended: 7,
      noShow: 3,
      attendanceRate: 70,
      avgWatchSeconds: 0,
    });
  });

  it('clamps attended above total and negative inputs', () => {
    assert.deepEqual(computeLeadKpis({ total: 4, attended: 9 }), {
      total: 4,
      attended: 4,
      noShow: 0,
      attendanceRate: 100,
      avgWatchSeconds: 0,
    });
    assert.deepEqual(computeLeadKpis({ total: -2, attended: -1 }), {
      total: 0,
      attended: 0,
      noShow: 0,
      attendanceRate: 0,
      avgWatchSeconds: 0,
    });
  });

  it('treats missing counts as zero', () => {
    assert.deepEqual(computeLeadKpis({}), {
      total: 0,
      attended: 0,
      noShow: 0,
      attendanceRate: 0,
      avgWatchSeconds: 0,
    });
  });

  it('keeps average watch seconds non-negative', () => {
    assert.equal(computeLeadKpis({ total: 2, attended: 1, avgWatchSeconds: 125 }).avgWatchSeconds, 125);
    assert.equal(computeLeadKpis({ avgWatchSeconds: -8 }).avgWatchSeconds, 0);
  });
});

describe('formatWatchDuration', () => {
  it('shows a dash when there is no watch time', () => {
    assert.equal(formatWatchDuration(0), '—');
    assert.equal(formatWatchDuration(null), '—');
  });

  it('formats seconds, minutes and hours', () => {
    assert.equal(formatWatchDuration(42), '42s');
    assert.equal(formatWatchDuration(125), '2 min');
    assert.equal(formatWatchDuration(3725), '1h 02min');
  });
});

describe('reduceWatchSeconds', () => {
  it('uses the greater of video progress and event dwell', () => {
    const map = reduceWatchSeconds([
      {
        registration_id: 'a',
        event_type: 'webinar_entered',
        event_data: {},
        created_at: '2026-08-17T10:00:00.000Z',
      },
      {
        registration_id: 'a',
        event_type: 'video_progress',
        event_data: { seconds: 90 },
        created_at: '2026-08-17T10:03:00.000Z',
      },
    ]);
    assert.equal(map.a, 180);
  });
});
