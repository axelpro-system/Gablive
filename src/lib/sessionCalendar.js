function toDate(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isFinite(d.getTime()) ? d : null;
}

export function getSessionStartAt(webinar, registration) {
  return toDate(registration?.session_start_at) || toDate(webinar?.scheduled_at);
}

export function getSessionEndAt(webinar, registration) {
  const start = getSessionStartAt(webinar, registration);
  if (!start) return null;
  const minutes = Math.max(1, Number(webinar?.session_duration_minutes) || 120);
  return new Date(start.getTime() + minutes * 60 * 1000);
}

export function getReplayExpiresAt(webinar, registration) {
  if (!webinar?.replay_enabled) return new Date(0);
  const hours = Number(webinar.replay_expires_hours);
  if (!hours) return null;
  const start = getSessionStartAt(webinar, registration);
  if (!start) return null;
  return new Date(start.getTime() + hours * 60 * 60 * 1000);
}

export function isReplayAvailable(webinar, registration, now = new Date()) {
  if (!webinar?.replay_enabled) return false;
  const expiresAt = getReplayExpiresAt(webinar, registration);
  if (!expiresAt) return true;
  return expiresAt.getTime() > toDate(now).getTime();
}

export function buildGoogleCalendarUrl(webinar, registration) {
  const start = getSessionStartAt(webinar, registration);
  const end = getSessionEndAt(webinar, registration);
  if (!start || !end || !webinar?.title) return null;

  const stamp = (d) => d.toISOString().replace(/-|:|\.\d{3}/g, '');
  const details = encodeURIComponent(webinar.description || 'Webinário exclusivo.');
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(webinar.title)}&dates=${stamp(start)}/${stamp(end)}&details=${details}`;
}

export function formatConfirmedSignups(count) {
  const n = Math.max(0, Number(count) || 0);
  if (n <= 0) return null;
  if (n === 1) return '1 pessoa já garantiu a vaga.';
  return `${n} pessoas já garantiram a vaga.`;
}
