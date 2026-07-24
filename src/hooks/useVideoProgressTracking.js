import { useEffect, useRef } from 'react';
import { ANALYTICS_EVENTS } from '../lib/constants';
import {
  shouldEmitVideoProgress,
  DEFAULT_MIN_INTERVAL_SEC,
} from '../lib/videoProgressSampling';

/**
 * Emits sampled VIDEO_PROGRESS analytics while the participant watches.
 * One-shot milestones stay in useWatchMilestones.
 *
 * @param {object|null} webinar
 * @param {object|null} registration
 * @param {number} videoTime
 * @param {function} trackEvent
 * @param {number} [minIntervalSec]
 */
export function useVideoProgressTracking(
  webinar,
  registration,
  videoTime,
  trackEvent,
  minIntervalSec = DEFAULT_MIN_INTERVAL_SEC
) {
  const lastEmitAtSecRef = useRef(null);

  useEffect(() => {
    if (!webinar?.id || !registration?.id) return;
    if (!shouldEmitVideoProgress(lastEmitAtSecRef.current, videoTime, minIntervalSec)) {
      return;
    }

    lastEmitAtSecRef.current = videoTime;
    trackEvent(webinar.id, registration.id, ANALYTICS_EVENTS.VIDEO_PROGRESS, {
      seconds: videoTime,
    });
  }, [videoTime, webinar, registration, trackEvent, minIntervalSec]);
}
