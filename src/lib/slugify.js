/**
 * URL-safe slug helpers for webinars (pure — safe for unit tests).
 */

export function slugify(text) {
  return (text || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

/**
 * Build a short public slug. Never slugify raw video URLs as the webinar path.
 */
export function slugBaseFromTitle(title, videoUrl = '') {
  const raw = (title || '').toString().trim();
  const looksLikeUrl =
    /^https?:\/\//i.test(raw) ||
    /youtube\.com|youtu\.be|vimeo\.com/i.test(raw);

  if (looksLikeUrl || !raw) {
    const fromVideo = (videoUrl || raw || '').toString();
    const yt =
      fromVideo.match(/[?&]v=([\w-]{6,})/i) ||
      fromVideo.match(/youtu\.be\/([\w-]{6,})/i);
    if (yt?.[1]) return `video-${yt[1].toLowerCase()}`;
    const vimeo = fromVideo.match(/vimeo\.com\/(\d+)/i);
    if (vimeo?.[1]) return `video-${vimeo[1]}`;
    return 'webinar';
  }

  return slugify(raw) || 'webinar';
}
