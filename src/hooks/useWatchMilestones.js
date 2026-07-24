import { useEffect, useRef } from 'react';
import { WATCH_MILESTONES } from '../lib/constants';

/**
 * Dispara eventos de milestone de assistência (15/30/45/60 min)
 * quando o participante atinge cada marco.
 *
 * @param {object|null} webinar - Dados do webinário.
 * @param {object|null} registration - Registro do participante.
 * @param {number} videoTime - Tempo atual do vídeo em segundos.
 * @param {function} trackEvent - Função de tracking de analytics.
 */
export function useWatchMilestones(webinar, registration, videoTime, trackEvent) {
  const firedMilestonesRef = useRef(new Set());

  useEffect(() => {
    if (!webinar || !registration) return;
    WATCH_MILESTONES.forEach(({ seconds, event }) => {
      if (videoTime >= seconds && !firedMilestonesRef.current.has(event)) {
        firedMilestonesRef.current.add(event);
        trackEvent(webinar.id, registration.id, event, { seconds: videoTime });
      }
    });
  }, [videoTime, webinar, registration, trackEvent]);
}