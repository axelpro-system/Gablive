import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { useCountdownSeconds } from '../../hooks/useCountdown';
import { Clock, AlertTriangle, PlayCircle } from 'lucide-react';
import { differenceInSeconds, addHours, isPast } from 'date-fns';
import './ReplayPage.css';

export default function ReplayPage() {
  const { slug } = useParams();
  const { t } = useTranslation();

  const [webinar, setWebinar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expired, setExpired] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('webinars')
        .select('*')
        .eq('slug', slug)
        .single();

      if (data) {
        setWebinar(data);

        if (!data.replay_enabled) {
          setExpired(true);
        } else if (data.replay_expires_hours && data.scheduled_at) {
          const expiresAt = addHours(new Date(data.scheduled_at), data.replay_expires_hours);
          if (isPast(expiresAt)) {
            setExpired(true);
          } else {
            setRemainingSeconds(differenceInSeconds(expiresAt, new Date()));
          }
        }
      }
      setLoading(false);
    };
    fetch();
  }, [slug]);

  const countdown = useCountdownSeconds(remainingSeconds);

  // Check for expiration
  useEffect(() => {
    if (countdown.isExpired && remainingSeconds > 0) {
      setExpired(true);
    }
  }, [countdown.isExpired, remainingSeconds]);

  const getVideoEmbed = () => {
    if (!webinar?.video_url) return null;
    const url = webinar.video_url;
    const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?rel=0&controls=0&modestbranding=1&showinfo=0&fs=0&iv_load_policy=3&disablekb=1`;
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    return url;
  };

  if (loading) {
    return (
      <div className="replay-loading">
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  if (!webinar) {
    return (
      <div className="replay-error">
        <h2>Webinar not found</h2>
      </div>
    );
  }

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
          {getVideoEmbed() ? (
            <iframe
              className="replay-iframe"
              src={getVideoEmbed()}
              title={webinar.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
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
