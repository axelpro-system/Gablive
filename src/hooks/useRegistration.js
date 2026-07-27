import { useState, useEffect } from 'react';
import { ANALYTICS_EVENTS } from '../lib/constants';

/**
 * Busca os dados do webinário e do registro do participante.
 * Marca o participante como "compareceu" (attended) na primeira carga.
 *
 * @param {string} slug - Slug do webinário.
 * @param {object} supabase - Cliente Supabase (injetado).
 * @param {function} trackEvent - Função de tracking de analytics.
 * @returns {{ webinar: object|null, registration: object|null, loading: boolean }}
 */
export function useRegistration(slug, supabase, trackEvent) {
  const [webinar, setWebinar] = useState(null);
  const [registration, setRegistration] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWebinar = async () => {
      // Leitura pública via RPC SECURITY DEFINER (as tabelas do funil deixaram
      // de ser world-readable — ver migration 008). O bundle vem no mesmo
      // formato aninhado dos embedded-selects anteriores.
      const { data } = await supabase.rpc('get_public_webinar_by_slug', {
        p_slug: slug,
      });

      if (data) {
        setWebinar(data);

        // Check registration from localStorage
        const regId = localStorage.getItem(`webinar-reg-${data.id}`);
        if (regId) {
          const { data: regRows } = await supabase.rpc('get_registration_by_id', {
            p_id: regId,
          });
          const reg = Array.isArray(regRows) ? regRows[0] : regRows;

          if (reg) {
            setRegistration(reg);
            // Mark as attended via SECURITY DEFINER RPC (anon cannot UPDATE via RLS)
            if (!reg.attended) {
              const { data: updated } = await supabase.rpc('mark_registration_attended', {
                p_id: regId,
              });
              if (updated) setRegistration(updated);
            }
            trackEvent(data.id, regId, ANALYTICS_EVENTS.JOIN);
            trackEvent(data.id, regId, ANALYTICS_EVENTS.WEBINAR_ENTERED);
          }
        }
      }
      setLoading(false);
    };

    fetchWebinar();
  }, [slug, supabase, trackEvent]);

  return { webinar, registration, loading };
}