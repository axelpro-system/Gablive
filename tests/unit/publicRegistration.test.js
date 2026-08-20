/**
 * Unit tests for public registration page resolution and waitlist access.
 * Run: node --test tests/unit/publicRegistration.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolvePublicRegistrationPage,
  canAccessLiveSession,
} from '../../src/lib/publicRegistration.js';
import { getEmailScheduleAnchor, shouldEnqueueTimedEmail, buildEmailAccessUrls } from '../../src/lib/emailSchedule.js';

describe('resolvePublicRegistrationPage', () => {
  it('prefers the org registration template over the editor page', () => {
    const page = resolvePublicRegistrationPage({
      registration_page_template: {
        blocks: [{ type: 'hero', data: { title: 'Template' } }],
        theme: { primaryColor: '#E31C23' },
      },
      registration_pages: [{
        blocks: [{ type: 'hero', data: { title: 'Editor' } }],
        theme: { primaryColor: '#000000' },
      }],
    });
    assert.equal(page.blocks[0].data.title, 'Template');
    assert.equal(page.theme.primaryColor, '#E31C23');
  });

  it('falls back to the editor page when no template is linked', () => {
    const page = resolvePublicRegistrationPage({
      registration_pages: [{
        blocks: '[{"type":"form","data":{}}]',
        theme: '{"textColor":"#111"}',
      }],
    });
    assert.equal(page.blocks[0].type, 'form');
    assert.equal(page.theme.textColor, '#111');
  });
});

describe('canAccessLiveSession', () => {
  it('blocks waitlisted registrations from wait/room', () => {
    assert.equal(canAccessLiveSession({ id: 'r1', waitlisted: true }), false);
    assert.equal(canAccessLiveSession({ id: 'r1', waitlisted: false }), true);
    assert.equal(canAccessLiveSession(null), false);
  });
});

describe('email schedule anchor', () => {
  it('skips timed emails when the webinar has no shared clock', () => {
    assert.equal(getEmailScheduleAnchor({ is_just_in_time: true, scheduled_at: null }), null);
    assert.equal(shouldEnqueueTimedEmail({ scheduled_at: null }, { waitlisted: false }), false);
  });

  it('skips waitlisted leads even when a clock exists', () => {
    assert.equal(
      shouldEnqueueTimedEmail({ scheduled_at: '2026-08-20T20:00:00.000Z' }, { waitlisted: true }),
      false
    );
  });

  it('allows reminder/replay when scheduled_at is set and the lead is confirmed', () => {
    assert.equal(
      shouldEnqueueTimedEmail({ scheduled_at: '2026-08-20T20:00:00.000Z' }, { waitlisted: false }),
      true
    );
  });
});

describe('buildEmailAccessUrls', () => {
  it('omits the registration token for waitlisted leads', () => {
    const urls = buildEmailAccessUrls({
      base: 'https://app.test',
      slug: 'funil',
      registrationId: 'reg-1',
      waitlisted: true,
    });
    assert.equal(urls.room_url, 'https://app.test/register/funil');
    assert.equal(urls.wait_url.includes('reg='), false);
  });

  it('includes ?reg= for confirmed leads', () => {
    const urls = buildEmailAccessUrls({
      base: 'https://app.test/',
      slug: 'funil',
      registrationId: 'reg-1',
      waitlisted: false,
    });
    assert.equal(urls.room_url, 'https://app.test/room/funil?reg=reg-1');
  });
});
