import { WEBINAR_STATUS, WEBINAR_TYPE } from './constants.js';

export const LIVE_ROOM_STATE = {
  WAITING: 'waiting',
  PLAYER: 'player',
  ENDED: 'ended',
  UNAVAILABLE: 'unavailable',
};

function isDue(scheduledAt, now) {
  if (!scheduledAt) return false;
  const scheduled = new Date(scheduledAt).getTime();
  const current = now instanceof Date ? now.getTime() : new Date(now).getTime();
  return Number.isFinite(scheduled) && Number.isFinite(current) && scheduled <= current;
}

export function buildVideoEmbedUrl(videoUrl, origin = '') {
  if (!videoUrl) return null;

  const url = String(videoUrl).trim();
  const youtubeMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );

  if (youtubeMatch) {
    const encodedOrigin = encodeURIComponent(origin || globalThis?.location?.origin || '');
    return `https://www.youtube.com/embed/${youtubeMatch[1]}?autoplay=1&mute=1&enablejsapi=1&origin=${encodedOrigin}&rel=0&controls=0&modestbranding=1&showinfo=0&fs=0&iv_load_policy=3&disablekb=1`;
  }

  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`;

  return null;
}

export function getLiveRoomState(webinar, now = new Date()) {
  if (!webinar) {
    return {
      state: LIVE_ROOM_STATE.UNAVAILABLE,
      reason: 'missing_webinar',
      showPlayer: false,
      showWaiting: false,
    };
  }

  const status = webinar.status;
  const type = webinar.type || webinar.webinar_type;
  const hasEmbed = Boolean(buildVideoEmbedUrl(webinar.video_url, 'https://gablive.local'));

  if (status === WEBINAR_STATUS.ENDED) {
    return {
      state: LIVE_ROOM_STATE.ENDED,
      reason: 'webinar_ended',
      showPlayer: false,
      showWaiting: false,
    };
  }

  const shouldPlay =
    status === WEBINAR_STATUS.LIVE ||
    type === WEBINAR_TYPE.RECORDED ||
    (type === WEBINAR_TYPE.LIVE &&
      status === WEBINAR_STATUS.SCHEDULED &&
      (webinar.is_just_in_time || isDue(webinar.scheduled_at, now)));

  if (shouldPlay) {
    if (hasEmbed) {
      const reason =
        status === WEBINAR_STATUS.LIVE
          ? 'status_live'
          : type === WEBINAR_TYPE.LIVE && status === WEBINAR_STATUS.SCHEDULED
            ? 'scheduled_time_reached'
            : 'playable';
      return {
        state: LIVE_ROOM_STATE.PLAYER,
        reason,
        showPlayer: true,
        showWaiting: false,
      };
    }
    return {
      state: LIVE_ROOM_STATE.UNAVAILABLE,
      reason: 'missing_supported_video_url',
      showPlayer: false,
      showWaiting: false,
    };
  }

  if (type === WEBINAR_TYPE.LIVE && status === WEBINAR_STATUS.SCHEDULED) {
    return {
      state: LIVE_ROOM_STATE.WAITING,
      reason: 'scheduled_future',
      showPlayer: false,
      showWaiting: true,
    };
  }

  if (hasEmbed) {
    return {
      state: LIVE_ROOM_STATE.PLAYER,
      reason: 'default_playable',
      showPlayer: true,
      showWaiting: false,
    };
  }

  return {
    state: LIVE_ROOM_STATE.UNAVAILABLE,
    reason: 'missing_supported_video_url',
    showPlayer: false,
    showWaiting: false,
  };
}
