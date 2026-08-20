import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { useCountdownSeconds } from '../../hooks/useCountdown';
import { buildVideoEmbedUrl } from '../../lib/liveRoomState';
import { getReplayExpiresAt, isReplayAvailable } from '../../lib/sessionCalendar';
import { canAccessLiveSession } from '../../lib/publicRegistration';
import CinemaScreenVideo from '../../components/video/CinemaScreenVideo';
import { Clock, AlertTriangle, PlayCircle } from 'lucide-react';
import { differenceInSeconds } from 'date-fns';
import './ReplayPage.css';

export default function ReplayPage() {
  const { slug } = useParams();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const regParam = searchParams.get('reg');

  const [webinar, setWebinar] = useState(null);
  const [registration, setRegistration] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [expired, setExpired] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

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
      if (regParam) localStorage.setItem(`webinar-reg-${data.id}`, regParam);
      const regId = regParam || localStorage.getItem(`webinar-reg-${data.id}`);
      let reg = null;
      if (regId) {
        const { data: regRows } = await supabase.rpc('get_registration_by_id', { p_id: regId });
        reg = Array.isArray(regRows) ? regRows[0] : regRows;
        if (reg) setRegistration(reg);
      }

      if (!isReplayAvailable(data, reg) || (reg && !canAccessLiveSession(reg))) {
        setExpired(true);
      } else {
        const expiresAt = getReplayExpiresAt(data, reg);
        setRemainingSeconds(expiresAt ? Math.max(0, differenceInSeconds(expiresAt, new Date())) : 0);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    loadWebinar();
  }, [slug, regParam]);

  const countdown = useCountdownSeconds(remainingSeconds);

  // Check for expiration
  useEffect(() => {
    if (countdown.isExpired && remainingSeconds > 0) {
      setExpired(true);
    }
  }, [countdown.isExpired, remainingSeconds]);

  if (loading) {
    return (
      <div className="replay-loading">
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="replay-error">
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
      <div className="replay-error">
        <h2>{t('registration.notFoundTitle')}</h2>
        <p>{t('registration.notFoundMessage')}</p>
      </div>
    );
  }

  if (registration && !canAccessLiveSession(registration)) {
    return (
      <div className="replay-error">
        <h2>{webinar.title}</h2>
        <p>{t('registration.waitlistedMessage')}</p>
      </div>
    );
  }

  const getVideoEmbed = () => {
    if (!webinar?.video_url) return null;
    return buildVideoEmbedUrl(webinar.video_url, globalThis?.location?.origin || '');
  };

  const embedUrl = getVideoEmbed();
  const presentation = webinar.settings?.presentation || {};
  const cinemaEnabled = !!(embedUrl && presentation?.enabled);

  if (expired) {
    return (
      <div className="replay-expired">
        <AlertTriangle size={64} className="replay-expired-icon" />
        <h1>{t('room.replayExpired')}</h1>
        <p>This replay is no longer available.</p>
      </div>
    );
  }

  return (
    <div className="replay-page">
      <div className="replay-container">
        {/* Expiration countdown */}
        {remainingSeconds > 0 && (
          <div className="replay-expiry-bar">
            <Clock size={16} />
            <span>
              {t('room.replayExpiresIn', {
                time: `${countdown.hours}h ${countdown.minutes}m ${countdown.seconds}s`,
              })}
            </span>
          </div>
        )}

        <div className="replay-header">
          <div className="replay-badge">
            <PlayCircle size={16} />
            {t('room.replayAvailable')}
          </div>
          <h1 className="replay-title">{webinar.title}</h1>
          {webinar.description && (
            <p className="replay-description">{webinar.description}</p>
          )}
        </div>

        <div className="replay-video">
          {embedUrl ? (
            cinemaEnabled ? (
              <CinemaScreenVideo
                src={embedUrl}
                title={webinar.title}
                shape={presentation.shape}
                curveV={presentation.curveV}
                curveH={presentation.curveH}
                corner={presentation.corner}
                shadow={presentation.shadow}
                vignette={presentation.vignette}
                vignetteColor={presentation.vignetteColor}
              />
            ) : (
              <iframe
                className="replay-iframe"
                src={embedUrl}
                title={webinar.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            )
          ) : (
            <div className="replay-placeholder">
              <PlayCircle size={64} />
              <p>Video not available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
