import { useState, useEffect, useRef } from 'react';
import { AUDIENCE_MODE } from '../lib/constants';
import { supabase } from '../lib/supabase';

/**
 * Gerencia o contador de audiência exibido na sala.
 * - Modo FIXED: valor constante escolhido pelo operador.
 * - Modo DYNAMIC: flutua dentro do intervalo configurado pelo operador.
 * - Modo REAL: contagem genuína via Supabase Realtime Presence.
 *
 * @param {object} webinar - Dados do webinário (audience_configs).
 * @returns {{ audienceCount: number }}
 */
export function useSimulatedAudience(webinar) {
  const [audienceCount, setAudienceCount] = useState(0);
  const channelRef = useRef(null);

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

  // Modo REAL: presença via Supabase Realtime
  useEffect(() => {
    if (webinar?.audience_configs?.mode !== AUDIENCE_MODE.REAL || !webinar?.id) return;

    const channel = supabase.channel(`audience:${webinar.id}`, {
      config: { presence: { key: crypto.randomUUID() } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setAudienceCount(Object.keys(state).length);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [webinar?.id, webinar?.audience_configs?.mode]);

  return { audienceCount };
}