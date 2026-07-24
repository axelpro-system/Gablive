import { useState, useEffect } from 'react';
import { AUDIENCE_MODE } from '../lib/constants';

/**
 * Gerencia o contador de audiência simulada.
 * - Modo FIXED: valor constante.
 * - Modo DYNAMIC: flutua dentro do intervalo configurado.
 *
 * @param {object} webinar - Dados do webinário (audience_configs).
 * @returns {{ audienceCount: number }}
 */
export function useSimulatedAudience(webinar) {
  const [audienceCount, setAudienceCount] = useState(0);

  useEffect(() => {
    const audience = webinar?.audience_configs;
    if (!audience) return;

    if (audience.mode === AUDIENCE_MODE.FIXED) {
      setAudienceCount(audience.fixed_count);
    } else if (audience.mode === AUDIENCE_MODE.DYNAMIC) {
      const { dynamic_min: min, dynamic_max: max } = audience;
      setAudienceCount(Math.floor(Math.random() * (max - min + 1)) + min);
    }
  }, [webinar]);

  // Flutuação dinâmica
  useEffect(() => {
    const audience = webinar?.audience_configs;
    if (audience?.mode !== AUDIENCE_MODE.DYNAMIC) return;

    const interval = setInterval(() => {
      setAudienceCount((prev) => {
        const delta = Math.floor(Math.random() * 5) - 2;
        return Math.min(audience.dynamic_max, Math.max(audience.dynamic_min, prev + delta));
      });
    }, 8000);

    return () => clearInterval(interval);
  }, [webinar]);

  return { audienceCount };
}