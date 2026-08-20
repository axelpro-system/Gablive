/**
 * Shared clock for reminder/replay queue.
 * Unique webinars and JIT daily/weekly use scheduled_at.
 * JIT always-available has no shared start — skip those sends.
 */
export function getEmailScheduleAnchor(webinar) {
  if (!webinar) return null;
  const at = webinar.scheduled_at;
  if (!at) return null;
  const ms = new Date(at).getTime();
  return Number.isFinite(ms) ? at : null;
}

export function shouldEnqueueTimedEmail(webinar, registration) {
  if (!getEmailScheduleAnchor(webinar)) return false;
  if (registration?.waitlisted === true) return false;
  return true;
}

export function buildEmailAccessUrls({ base, slug, registrationId, waitlisted }) {
  const origin = String(base || '').replace(/\/$/, '');
  if (!origin || !slug) {
    return { wait_url: origin, room_url: origin, replay_url: origin };
  }
  if (waitlisted) {
    const registerUrl = `${origin}/register/${slug}`;
    return { wait_url: registerUrl, room_url: registerUrl, replay_url: registerUrl };
  }
  const q = registrationId ? `?reg=${registrationId}` : '';
  return {
    wait_url: `${origin}/wait/${slug}${q}`,
    room_url: `${origin}/room/${slug}${q}`,
    replay_url: `${origin}/replay/${slug}${q}`,
  };
}
