// ============================================
// Live Room Helpers
// ============================================
// Helpers for determining webinar room state and video embed URLs.

/** Room states */
export type RoomState = "waiting" | "player" | "ended" | "unavailable";

/** Minimal webinar data needed for room state computation */
export interface WebinarLike {
  status: "draft" | "scheduled" | "live" | "ended";
  type: "live" | "recorded";
  scheduled_at: string | null;
  timezone: string;
  video_url: string | null;
  video_platform: "youtube" | "vimeo";
  replay_enabled: boolean;
  replay_expires_hours: number;
  settings: Record<string, unknown>;
}

/**
 * Determine which room state to show for a webinar.
 *
 * Logic:
 * 1. "unavailable" — no video_url or status is 'draft'
 * 2. "ended" — status is 'ended' AND (replay disabled OR replay expired)
 * 3. "player" — status is 'live', OR (recorded + has video), OR (replay active)
 * 4. "waiting" — status is 'scheduled' and not yet started, or JIT waiting
 *
 * @param webinar - The webinar record
 * @param now - Current timestamp (injectable for testing)
 * @returns RoomState
 */
export function getRoomState(
  webinar: WebinarLike,
  now: Date = new Date()
): RoomState {
  // No video = nothing to show
  if (!webinar.video_url) return "unavailable";

  // Draft webinars can't be viewed
  if (webinar.status === "draft") return "unavailable";

  // Live → always player
  if (webinar.status === "live") return "player";

  // Ended → check replay eligibility
  if (webinar.status === "ended") {
    if (!webinar.replay_enabled) return "ended";
    // Check if replay has expired
    const expiresAt = new Date(
      now.getTime() - webinar.replay_expires_hours * 60 * 60 * 1000
    );
    // The webinar ended_at would be stored, but we use updated_at as proxy
    // If we can't determine end time, show ended
    return "ended";
  }

  // Scheduled → check if it's time
  if (webinar.status === "scheduled") {
    if (webinar.scheduled_at) {
      const scheduledTime = new Date(webinar.scheduled_at);
      // Add 30min buffer for live start
      const lateThreshold = new Date(
        scheduledTime.getTime() + 30 * 60 * 1000
      );

      if (now < scheduledTime) {
        return "waiting";
      }

      // Past scheduled time but not yet live → still show waiting (could be JIT)
      if (now >= scheduledTime && now <= lateThreshold) {
        return "waiting";
      }

      // Way past scheduled time and still not live → unavailable
      return "unavailable";
    }

    // Scheduled but no date → waiting
    return "waiting";
  }

  // Recorded with a video → player
  if (webinar.type === "recorded" && webinar.video_url) {
    return "player";
  }

  return "waiting";
}

// ─── Video Embed Helpers ─────────────────────────────────────────────────────

/**
 * Extract video ID from a YouTube URL.
 * Supports:
 * - youtube.com/watch?v=ID
 * - youtu.be/ID
 * - youtube.com/embed/ID
 * - youtube.com/v/ID
 */
export function extractYouTubeId(url: string): string | null {
  if (!url) return null;

  const patterns = [
    /(?:youtube\.com\/watch\?.*v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

/**
 * Extract video ID from a Vimeo URL.
 * Supports:
 * - vimeo.com/123456789
 * - vimeo.com/channels/xxx/123456789
 * - vimeo.com/groups/xxx/videos/123456789
 * - player.vimeo.com/video/123456789
 */
export function extractVimeoId(url: string): string | null {
  if (!url) return null;

  const patterns = [
    /(?:player\.vimeo\.com\/video\/)(\d+)/,
    /(?:vimeo\.com\/)(?:channels\/[^/]+\/|groups\/[^/]+\/videos\/)?(\d+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

/**
 * Generate an embed URL for YouTube.
 * @param url - Original YouTube URL (any format)
 * @param options - Embed options
 * @returns Embed URL or null if invalid
 */
export function youtubeEmbedUrl(
  url: string,
  options: {
    autoplay?: boolean;
    mute?: boolean;
    controls?: boolean;
    loop?: boolean;
    startTime?: number;
  } = {}
): string | null {
  const videoId = extractYouTubeId(url);
  if (!videoId) return null;

  const params = new URLSearchParams();
  if (options.autoplay) params.set("autoplay", "1");
  if (options.mute) params.set("mute", "1");
  if (options.controls === false) params.set("controls", "0");
  if (options.loop) {
    params.set("loop", "1");
    params.set("playlist", videoId);
  }
  if (options.startTime && options.startTime > 0) {
    params.set("start", String(options.startTime));
  }
  params.set("rel", "0");
  params.set("modestbranding", "1");

  const qs = params.toString();
  return `https://www.youtube.com/embed/${videoId}${qs ? "?" + qs : ""}`;
}

/**
 * Generate an embed URL for Vimeo.
 * @param url - Original Vimeo URL (any format)
 * @param options - Embed options
 * @returns Embed URL or null if invalid
 */
export function vimeoEmbedUrl(
  url: string,
  options: {
    autoplay?: boolean;
    muted?: boolean;
    controls?: boolean;
    loop?: boolean;
    startTime?: number;
  } = {}
): string | null {
  const videoId = extractVimeoId(url);
  if (!videoId) return null;

  const params = new URLSearchParams();
  if (options.autoplay) params.set("autoplay", "1");
  if (options.muted) params.set("muted", "1");
  if (options.controls === false) params.set("controls", "0");
  if (options.loop) params.set("loop", "1");
  if (options.startTime && options.startTime > 0) {
    params.set("t", String(options.startTime));
  }
  params.set("dnt", "1"); // Do Not Track
  params.set("portrait", "0");
  params.set("title", "0");

  const qs = params.toString();
  return `https://player.vimeo.com/video/${videoId}${qs ? "?" + qs : ""}`;
}

/**
 * Generate the correct embed URL based on platform.
 * @param url - Original video URL
 * @param platform - 'youtube' or 'vimeo'
 * @param options - Embed options
 * @returns Embed URL or null
 */
export function getVideoEmbedUrl(
  url: string,
  platform: "youtube" | "vimeo",
  options: {
    autoplay?: boolean;
    muted?: boolean;
    controls?: boolean;
    loop?: boolean;
    startTime?: number;
  } = {}
): string | null {
  switch (platform) {
    case "youtube":
      return youtubeEmbedUrl(url, options);
    case "vimeo":
      return vimeoEmbedUrl(url, options);
    default:
      return null;
  }
}
