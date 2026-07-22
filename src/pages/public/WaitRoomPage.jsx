import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { useCountdown } from '../../hooks/useCountdown';
import { useSeo } from '../../hooks/useSeo';
import { Clock, Users } from 'lucide-react';
import './WaitRoomPage.css';

export default function WaitRoomPage() {
  const { slug } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [webinar, setWebinar] = useState(null);
  const [registration, setRegistration] = useState(null);
  const [loading, setLoading] = useState(true);

  useSeo({
    title: webinar?.title ? `Sala de espera: ${webinar.title}` : 'Sala de espera',
  });

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('webinars')
        .select('*')
        .eq('slug', slug)
        .single();

      if (data) {
        setWebinar(data);
        const regId = localStorage.getItem(`webinar-reg-${data.id}`);
        if (regId) {
          const { data: reg } = await supabase
            .from('registrations')
            .select('*')
            .eq('id', regId)
            .single();
          if (reg) setRegistration(reg);
        } else {
          navigate(`/register/${slug}`, { replace: true });
          return;
        }
      }
      setLoading(false);
    };
    fetch();
  }, [slug, navigate]);

  const target = webinar?.is_just_in_time ? registration?.session_start_at : webinar?.scheduled_at;
  const countdown = useCountdown(target);

  useEffect(() => {
    if (countdown.isExpired && webinar && registration) {
      navigate(`/room/${webinar.slug}`, { replace: true });
    }
  }, [countdown.isExpired, webinar, registration, navigate]);

  if (loading) {
    return (
      <div className="wait-loading">
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  if (!webinar) {
    return (
      <div className="wait-error">
        <h2>Webinar not found</h2>
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
