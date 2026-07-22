export const APP_NAME = 'Webinar SaaS';

export const ROLES = {
  ADMIN: 'admin',
  PRESENTER: 'presenter',
  ATTENDEE: 'attendee',
};

export const WEBINAR_STATUS = {
  DRAFT: 'draft',
  SCHEDULED: 'scheduled',
  LIVE: 'live',
  ENDED: 'ended',
};

export const WEBINAR_TYPE = {
  LIVE: 'live',
  RECORDED: 'recorded',
};

export const VIDEO_PLATFORM = {
  YOUTUBE: 'youtube',
  VIMEO: 'vimeo',
};

export const EMAIL_TYPE = {
  CONFIRMATION: 'confirmation',
  REMINDER: 'reminder',
  REPLAY: 'replay',
};

export const ANALYTICS_EVENTS = {
  PAGE_VIEW: 'page_view',
  REGISTRATION: 'registration',
  JOIN: 'join',
  LEAVE: 'leave',
  CTA_CLICK: 'cta_click',
  CTA_VIEW: 'cta_view',
  POLL_RESPONSE: 'poll_response',
  CHAT_MESSAGE: 'chat_message',
  VIDEO_PROGRESS: 'video_progress',
  // Funil canônico (PRD): marcos de assistência e oferta
  WEBINAR_ENTERED: 'webinar_entered',
  WATCH_15: 'watch_15',
  WATCH_30: 'watch_30',
  WATCH_45: 'watch_45',
  WATCH_60: 'watch_60',
  PITCH_REACHED: 'pitch_reached',
  OFFER_SHOWN: 'offer_shown',
};

// Marcos de assistência (minutos -> segundos) usados para disparar WATCH_15/30/45/60
export const WATCH_MILESTONES = [
  { seconds: 15 * 60, event: ANALYTICS_EVENTS.WATCH_15 },
  { seconds: 30 * 60, event: ANALYTICS_EVENTS.WATCH_30 },
  { seconds: 45 * 60, event: ANALYTICS_EVENTS.WATCH_45 },
  { seconds: 60 * 60, event: ANALYTICS_EVENTS.WATCH_60 },
];

export const RECURRENCE_TYPE = {
  NONE: 'none',
  DAILY: 'daily',
  WEEKLY: 'weekly',
};

export const AUDIENCE_MODE = {
  NONE: 'none',
  FIXED: 'fixed',
  DYNAMIC: 'dynamic',
};

export const BLOCK_TYPES = {
  HERO: 'hero',
  BENEFITS: 'benefits',
  TESTIMONIALS: 'testimonials',
  FORM: 'form',
  COUNTDOWN: 'countdown',
  TEXT: 'text',
  IMAGE: 'image',
};

export const DEFAULT_THEME = {
  primaryColor: '#3366ff',
  backgroundColor: '#ffffff',
  textColor: '#101828',
  accentColor: '#f79009',
  fontFamily: 'Inter',
  borderRadius: '12px',
};

export const LOCALES = {
  PT_BR: 'pt-BR',
  EN: 'en',
};

export const DEFAULT_REPLAY_HOURS = 48;
export const DEFAULT_REMINDER_MINUTES = [1440, 60, 15]; // 24h, 1h, 15min

// Tempo de aquecimento na sala de espera antes de um webinar Just-in-Time começar
export const WAIT_ROOM_JIT_DELAY_SECONDS = 120;
