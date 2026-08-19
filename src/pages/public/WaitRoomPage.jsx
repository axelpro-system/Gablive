import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { useCountdown } from '../../hooks/useCountdown';
import { useSeo } from '../../hooks/useSeo';
import { Clock, Users } from 'lucide-react';
import { shouldLeaveWaitRoom, waitRoomTarget } from '../../lib/countdown';
import './WaitRoomPage.css';

export default function WaitRoomPage() {
  const { slug } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const regParam = searchParams.get('reg');

  const [webinar, setWebinar] = useState(null);
  const [registration, setRegistration] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useSeo({
    title: webinar?.title ? `Sala de espera: ${webinar.title}` : 'Sala de espera',
  });

  const loadWebinar = async () => {
    setLoading(true);
    setLoadError(false);

    const { data, error: fetchError } = await supabase.rpc('get_public_webinar_by_slug', {
      p_slug: slug,
    });

    if (fetchError) {
      setLoadError(true);
      setLoading(false);
      return;
    }

    if (data) {
      setWebinar(data);
      // Token de acesso: ?reg=<id> na URL (link de e-mail, cross-device),
      // com fallback pro localStorage (mesmo aparelho). Persiste o da URL.
      if (regParam) localStorage.setItem(`webinar-reg-${data.id}`, regParam);
      const regId = regParam || localStorage.getItem(`webinar-reg-${data.id}`);
      if (regId) {
        const { data: regRows } = await supabase.rpc('get_registration_by_id', {
          p_id: regId,
        });
        const reg = Array.isArray(regRows) ? regRows[0] : regRows;
        if (reg) setRegistration(reg);
      } else {
        navigate(`/register/${slug}`, { replace: true });
        return;
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    loadWebinar();
  }, [slug, navigate, regParam]);

  const target = waitRoomTarget(webinar, registration);
  const countdown = useCountdown(target);

  useEffect(() => {
    if (!shouldLeaveWaitRoom({ webinar, registration })) return;
    navigate(`/room/${webinar.slug}`, { replace: true });
  }, [countdown.isExpired, webinar, registration, navigate]);

  if (loading) {
    return (
      <div className="wait-loading">
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="wait-error">
        <h2>{t('registration.loadErrorTitle')}</h2>
        <p>{t('registration.loadErrorMessage')}</p>
        <button type="button" className="btn btn-primary" onClick={loadWebinar}>
          {t('registration.retry')}
        </button>
      </div>
    );
  }

  if (!webinar) {
    return (
      <div className="wait-error">
        <h2>{t('registration.notFoundTitle')}</h2>
        <p>{t('registration.notFoundMessage')}</p>
      </div>
    );
  }

  return (
    <div className="wait-room-page">
      <div className="wait-room-card">
        <span className="wait-room-badge">
          <Users size={14} />
          Sala de espera
        </span>
        <h1>{webinar.title}</h1>
        <p>{t('registration.startsIn')}</p>
        <div className="wait-countdown">
          <div className="wait-countdown-unit">
            <span className="wait-countdown-value">{countdown.hours}</span>
            <span className="wait-countdown-label">{t('registration.hours')}</span>
          </div>
          <span className="wait-countdown-separator">:</span>
          <div className="wait-countdown-unit">
            <span className="wait-countdown-value">{countdown.minutes}</span>
            <span className="wait-countdown-label">{t('registration.minutes')}</span>
          </div>
          <span className="wait-countdown-separator">:</span>
          <div className="wait-countdown-unit">
            <span className="wait-countdown-value">{countdown.seconds}</span>
            <span className="wait-countdown-label">{t('registration.seconds')}</span>
          </div>
        </div>
        <p className="wait-room-hint">
          <Clock size={14} />
          Você será levado à sala automaticamente quando o webinário começar.
        </p>
      </div>
    </div>
  );
}
