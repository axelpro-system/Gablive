import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { computeJitSessionStartAt } from '../lib/jitSession';

export async function requestAccessEmail(webinarId, email) {
  const { error: recoverError } = await supabase.rpc('recover_registration', {
    p_webinar_id: webinarId,
    p_email: email,
  });

  if (recoverError) {
    logger.error('recover_registration failed', recoverError, { webinarId, email });
    return false;
  }

  return true;
}

export function useRegistrationSubmit(webinar) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submitRegistration = async (cleanName, cleanEmail, cleanPhone, utm = {}) => {
    setSubmitting(true);
    setError('');

    try {
      const { data: alreadyRegistered, error: checkError } = await supabase.rpc(
        'check_registration_email',
        { p_webinar_id: webinar.id, p_email: cleanEmail }
      );

      if (checkError) {
        logger.error('check_registration_email failed', checkError, { email: cleanEmail });
      }

      if (alreadyRegistered) {
        await requestAccessEmail(webinar.id, cleanEmail);
        setError('Você já está inscrito neste webinário. Enviamos o link de acesso para o seu e-mail.');
        return { success: false, error: 'alreadyRegistered' };
      }

      const sessionStartAt = computeJitSessionStartAt(webinar);

      // SECURITY DEFINER RPC — anon can INSERT but cannot SELECT the row back
      // (org-scoped RLS), so insert().select() fails as an RLS violation.
      const { data: created, error: regError } = await supabase.rpc('register_participant', {
        p_webinar_id: webinar.id,
        p_name: cleanName,
        p_email: cleanEmail,
        p_phone: cleanPhone || null,
        p_session_start_at: sessionStartAt,
        p_utm_source: utm.utm_source || null,
        p_utm_medium: utm.utm_medium || null,
        p_utm_campaign: utm.utm_campaign || null,
        p_utm_term: utm.utm_term || null,
        p_utm_content: utm.utm_content || null,
      });

      if (regError) {
        const isDuplicate = /duplicate|unique|23505/i.test(regError.message || '');
        if (isDuplicate) {
          await requestAccessEmail(webinar.id, cleanEmail);
          setError('Você já está inscrito neste webinário. Enviamos o link de acesso para o seu e-mail.');
          return { success: false, error: 'alreadyRegistered' };
        }
        throw regError;
      }

      const reg = Array.isArray(created) ? created[0] : created;
      if (!reg?.id) throw new Error('Registration failed');

      // Enqueue confirmation email
      supabase
        .rpc('enqueue_confirmation_email', {
          p_registration_id: reg.id,
          p_app_base_url: window.location.origin,
        })
        .then(({ error: enqueueError }) => {
          if (enqueueError) {
            logger.error('enqueue_confirmation_email failed', enqueueError, { regId: reg.id });
          }
        });

      return { success: true, reg };
    } catch (err) {
      logger.error('Registration process failed', err, { webinarId: webinar.id, email: cleanEmail });
      setError('Não foi possível concluir sua inscrição. Tente novamente em instantes.');
      return { success: false, error: 'unexpected' };
    } finally {
      setSubmitting(false);
    }
  };

  return { submitRegistration, submitting, error, setError };
}
