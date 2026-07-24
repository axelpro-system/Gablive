import { useState, useEffect, useRef } from 'react';
import { ANALYTICS_EVENTS } from '../lib/constants';

/**
 * Gerencia a visibilidade de CTAs com base no tempo do vídeo.
 * Dispara eventos de OFER_SHOWN quando uma CTA aparece pela primeira vez.
 *
 * @param {object} webinar - Dados do webinário (cta_configs).
 * @param {number} videoTime - Tempo atual do vídeo em segundos.
 * @param {Set} dismissedCtas - Conjunto de IDs de CTAs dispensadas.
 * @param {object|null} registration - Registro do participante (para trackEvent).
 * @param {function} trackEvent - Função de tracking de analytics.
 * @returns {{ activeCtas: Array, showCtaBanner: boolean, setDismissedCtas: Function }}
 */
export function useCtaTiming(webinar, videoTime, dismissedCtas, registration, trackEvent) {
  const [activeCtas, setActiveCtas] = useState([]);
  const [showCtaBanner, setShowCtaBanner] = useState(false);
  const firedOfferRef = useRef(new Set());

  useEffect(() => {
    if (!webinar?.cta_configs) return;

    const visible = webinar.cta_configs.filter(
      (cta) =>
        videoTime >= cta.show_at_seconds &&
        (cta.hide_at_seconds === null || videoTime <= cta.hide_at_seconds) &&
        !dismissedCtas.has(cta.id)
    );

    setActiveCtas(visible);
    setShowCtaBanner(visible.length > 0);

    if (registration) {
      visible.forEach((cta) => {
        if (!firedOfferRef.current.has(cta.id)) {
          firedOfferRef.current.add(cta.id);
          trackEvent(webinar.id, registration.id, ANALYTICS_EVENTS.OFFER_SHOWN, { cta_id: cta.id });
        }
      });
    }
  }, [videoTime, webinar, dismissedCtas, registration, trackEvent]);

  return { activeCtas, showCtaBanner };
}