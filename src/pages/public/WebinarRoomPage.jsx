import { useState, useRef, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSupabase } from '../../contexts/SupabaseContext';
import { useChat, useSimulatedChat } from '../../hooks/useChat';
import { useTrackEvent } from '../../hooks/useAnalytics';
import { useCountdown } from '../../hooks/useCountdown';
import { useSeo } from '../../hooks/useSeo';
import { useVideoTimer } from '../../hooks/useVideoTimer';
import { useCtaTiming } from '../../hooks/useCtaTiming';
import { usePollActivation } from '../../hooks/usePollActivation';
import { useSalesToasts } from '../../hooks/useSalesToasts';
import { useWatchMilestones } from '../../hooks/useWatchMilestones';
import { useVideoProgressTracking } from '../../hooks/useVideoProgressTracking';
import { useSimulatedAudience } from '../../hooks/useSimulatedAudience';
import { useRegistration } from '../../hooks/useRegistration';
import { WEBINAR_STATUS, ANALYTICS_EVENTS } from '../../lib/constants';
import { buildVideoEmbedUrl, getLiveRoomState, LIVE_ROOM_STATE } from '../../lib/liveRoomState';
import { waitRoomTarget } from '../../lib/countdown';
import { canAccessLiveSession } from '../../lib/publicRegistration';
import CinemaScreenVideo from '../../components/video/CinemaScreenVideo';
import { sanitizeInput } from '../../lib/sanitize';
import {
  Send, Users, Radio, Clock, ExternalLink, X,
  ThumbsUp, MessageCircle, BarChart3, Volume2, Heart,
} from 'lucide-react';
import './WebinarRoomPage.css';

export default function WebinarRoomPage() {
  const { slug } = useParams();
  const { t } = useTranslation();
  const supabase = useSupabase();
  const { trackEvent } = useTrackEvent();

  // Hooks extraídos
  const { webinar, registration, loading } = useRegistration(slug, supabase, trackEvent);
  const { videoTime } = useVideoTimer();
  const { audienceCount } = useSimulatedAudience(webinar);

  const [dismissedCtas, setDismissedCtas] = useState(new Set());
  const { activeCtas, showCtaBanner } = useCtaTiming(
    webinar, videoTime, dismissedCtas, registration, trackEvent
  );

  const [selectedPollOption, setSelectedPollOption] = useState(null);
  const [pollSubmitted, setPollSubmitted] = useState(false);
  const { activePoll } = usePollActivation(webinar, videoTime, pollSubmitted);

  const { visibleSaleToasts } = useSalesToasts(webinar, videoTime);
  useWatchMilestones(webinar, registration, videoTime, trackEvent);
  useVideoProgressTracking(webinar, registration, videoTime, trackEvent);

  useEffect(() => {
    if (!webinar?.id || !registration?.id) return undefined;

    const leave = () => {
      trackEvent(webinar.id, registration.id, ANALYTICS_EVENTS.LEAVE);
    };

    window.addEventListener('pagehide', leave);
    return () => {
      leave();
      window.removeEventListener('pagehide', leave);
    };
  }, [webinar?.id, registration?.id, trackEvent]);

  const [isMuted, setIsMuted] = useState(true);
  const [activeMobileTab, setActiveMobileTab] = useState('chat');
  const [chatInput, setChatInput] = useState('');
  const [chatError, setChatError] = useState('');
  const [aiTyping, setAiTyping] = useState(false);
  const aiPendingCountRef = useRef(0);
  const [liked, setLiked] = useState(() => {
    const stored = localStorage.getItem(`webinar-like-${slug}`);
    return stored === 'true';
  });

  const iframeRef = useRef(null);
  const chatEndRef = useRef(null);

  // Chat
  const { messages: chatMessages, sendMessage } = useChat(webinar?.id, registration?.name, registration?.email);
  const { messages: simulatedMessages } = useSimulatedChat(webinar?.id, videoTime);

  const allMessages = [
    ...chatMessages.map((m) => ({ ...m, isSimulated: false })),
    ...simulatedMessages.map((m) => ({
      id: `sim-${m.id}`,
      user_name: m.author_name,
      message: m.message,
      sent_at: new Date(Date.now() - (videoTime - m.timestamp_seconds) * 1000).toISOString(),
      isSimulated: true,
    })),
  ].sort((a, b) => new Date(a.sent_at) - new Date(b.sent_at));

  // SEO
  useSeo({
    title: webinar?.title ? `Sala: ${webinar.title}` : 'Sala do Webinário',
    description: webinar?.description || 'Assista ao vivo ao webinário.',
  });

  const handleUnmute = () => {
    setIsMuted(false);
    if (iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: 'unMute', args: [] }), '*'
        );
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), '*'
        );
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: 'setVolume', args: [100] }), '*'
        );
      } catch (err) {
        console.error('Error unmuting YouTube iframe:', err);
      }
    }
  };

  const handleSendChat = async (e) => {
    e.preventDefault();
    const input = chatInput.trim();
    if (!input) return;
    const sanitized = sanitizeInput(input);
    const result = await sendMessage(sanitized);
    if (!result?.ok) {
      if (result?.reason === 'banned') {
        setChatError('Você não pode enviar mensagens nesta sala.');
      }
      return;
    }
    setChatError('');
    setChatInput('');
    if (webinar && registration) {
      trackEvent(webinar.id, registration.id, ANALYTICS_EVENTS.CHAT_MESSAGE);
    }

    // AI Agent integration — the agent now watches every message and decides
    // for itself (server-side) whether a reply is warranted, so no keyword gate here.
    if (webinar?.ai_agent_enabled) {
      aiPendingCountRef.current += 1;
      setAiTyping(true);
      supabase.functions
        .invoke('gemini-chat', {
          body: {
            webinar_id: webinar.id,
            user_message: sanitized,
            user_name: registration?.name || 'Participante',
          },
        })
        .catch((err) => console.error('Failed to invoke AI agent', err))
        .finally(() => {
          aiPendingCountRef.current = Math.max(0, aiPendingCountRef.current - 1);
          if (aiPendingCountRef.current === 0) setAiTyping(false);
        });
    }
  };

  const handleCtaClick = (cta) => {
    if (webinar && registration) {
      trackEvent(webinar.id, registration.id, ANALYTICS_EVENTS.CTA_CLICK, { cta_id: cta.id });
    }
    window.open(cta.button_url, '_blank');
  };

  const handleDismissCta = (ctaId) => {
    setDismissedCtas((prev) => new Set([...prev, ctaId]));
  };

  const handleLike = () => {
    if (liked) return;
    setLiked(true);
    localStorage.setItem(`webinar-like-${slug}`, 'true');
    if (webinar && registration) {
      trackEvent(webinar.id, registration.id, ANALYTICS_EVENTS.LIKE, { seconds: videoTime });
    }
  };

  const handlePollVote = async () => {
    if (!activePoll || selectedPollOption === null || !registration) return;
    await supabase.from('poll_responses').insert({
      poll_id: activePoll.id,
      registration_id: registration.id,
      selected_option: selectedPollOption,
    });
    trackEvent(webinar.id, registration.id, ANALYTICS_EVENTS.POLL_RESPONSE, {
      poll_id: activePoll.id, option: selectedPollOption,
    });
    setPollSubmitted(true);
  };

  const getVideoEmbed = useCallback(() => {
    if (!webinar) return null;
    return buildVideoEmbedUrl(
      webinar.video_url,
      typeof window !== 'undefined' ? window.location.origin : '',
    );
  }, [webinar]);

  const countdown = useCountdown(waitRoomTarget(webinar, registration));

  if (loading) {
    return (
      <div className="room-loading">
        <div className="spinner spinner-lg" />
        <p>{t('common.loading')}</p>
      </div>
    );
  }

  if (!webinar) {
    return (
      <div className="room-error">
        <h2>Webinar not found</h2>
      </div>
    );
  }

  if (registration && !canAccessLiveSession(registration)) {
    return (
      <div className="room-error">
        <h2>{webinar.title}</h2>
        <p>{t('registration.waitlistedMessage')}</p>
      </div>
    );
  }

  // LIVE-01: live status OR scheduled live with scheduled_at <= now opens player
  const roomState = getLiveRoomState(webinar, new Date(), registration);
  const isWaiting = roomState.state === LIVE_ROOM_STATE.WAITING || roomState.showWaiting;
  const isEnded = roomState.state === LIVE_ROOM_STATE.ENDED;
  const isUnavailable = roomState.state === LIVE_ROOM_STATE.UNAVAILABLE;
  const showPlayer = roomState.state === LIVE_ROOM_STATE.PLAYER || roomState.showPlayer;
  const embedUrl = getVideoEmbed();
  const isLiveBadge =
    showPlayer &&
    (webinar.status === WEBINAR_STATUS.LIVE ||
      roomState.reason === 'scheduled_time_reached' ||
      roomState.reason === 'status_live' ||
      roomState.reason === 'playable');

  // Tela de Cinema: silhueta curva habilitada no dashboard (settings.presentation)
  const presentation = webinar.settings?.presentation || {};
  const cinemaEnabled = !!(showPlayer && embedUrl && presentation?.enabled);
  const durationSec = (webinar.session_duration_minutes || 60) * 60;
  const cinemaProgress =
    cinemaEnabled && durationSec > 0
      ? Math.max(0, Math.min(1, videoTime / durationSec))
      : null;

  const videoOverlays = (
    <>
      <div className="room-video-overlay-blocker" />
      {isMuted && (
        <button className="room-unmute-overlay" onClick={handleUnmute} aria-label="Ativar som">
          <Volume2 size={24} className="unmute-icon" />
          <span>Sua transmissão começou! Clique para ativar o som 🔊</span>
        </button>
      )}

      <div className="room-sales-toasts">
        {visibleSaleToasts.map((sale) => (
          <div key={sale.id} className="room-sale-toast">
            <strong>{sale.buyer_name}{sale.buyer_location ? ` (${sale.buyer_location})` : ''}</strong>
            <span> acabou de comprar {sale.product_name}</span>
          </div>
        ))}
      </div>
    </>
  );

  return (
    <div className="room-page">
      <header className="room-header">
        <div className="room-header-left">
          <a className="room-brand" href="/" aria-label="Ir para a página inicial da GabLive">
            <img src="/logo-dark.svg" alt="GabLive" />
          </a>
        </div>
      </header>

      <main className="room-content">
        <div className="room-stage">
          <section className="room-video-area" aria-label="Transmissão do webinar">
            {isWaiting ? (
              <div className="room-waiting">
                <Clock size={48} />
                <h2>{t('room.waitingToStart')}</h2>
                <div className="room-countdown">
                  {['days', 'hours', 'minutes', 'seconds'].map((unit) => (
                    <div key={unit} className="countdown-unit">
                      <span className="countdown-value">{countdown[unit]}</span>
                      <span className="countdown-label">{t(`registration.${unit}`)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : isEnded ? (
              <div className="room-waiting">
                <Clock size={48} />
                <h2>{t('room.ended', { defaultValue: 'Este webinário foi encerrado.' })}</h2>
                {webinar.replay_enabled && (
                  <a className="btn btn-primary" href={`/replay/${webinar.slug}${registration?.id ? `?reg=${registration.id}` : ''}`}>
                    Assistir replay
                  </a>
                )}
              </div>
            ) : isUnavailable || !embedUrl ? (
              <div className="room-video-placeholder">
                <VideoIcon size={64} />
                <p>{t('room.videoUnavailable', { defaultValue: 'Transmissão indisponível. Verifique a URL do vídeo.' })}</p>
              </div>
            ) : (
              <div className="room-video-wrapper">
                {cinemaEnabled ? (
                  <CinemaScreenVideo
                    src={embedUrl}
                    title={webinar.title}
                    progress={cinemaProgress}
                    mediaRef={iframeRef}
                    shape={presentation.shape}
                    curveV={presentation.curveV}
                    curveH={presentation.curveH}
                    corner={presentation.corner}
                    shadow={presentation.shadow}
                    vignette={presentation.vignette}
                    vignetteColor={presentation.vignetteColor}
                  >
                    {videoOverlays}
                  </CinemaScreenVideo>
                ) : (
                  <>
                    <iframe
                      ref={iframeRef}
                      className="room-video-iframe"
                      src={embedUrl}
                      title={webinar.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                    {videoOverlays}
                  </>
                )}
              </div>
            )}
          </section>

          <section className="room-video-meta" aria-label="Informações do webinar">
            <div className="room-video-meta-copy">
              <div className="room-video-status">
                {isLiveBadge && (
                  <span className="room-live-badge">
                    <Radio size={14} /> {t('room.liveNow')}
                  </span>
                )}
                {webinar.audience_configs?.mode !== 'none' && (
                  <span className="room-viewers">
                    <Users size={14} /> {t('room.watching', { count: audienceCount })}
                  </span>
                )}
              </div>
              <h1 className="room-title">{webinar.title}</h1>
              {webinar.description && <p className="room-description">{webinar.description}</p>}
            </div>
            <button
              className={`room-like-button ${liked ? 'room-like-button--liked' : ''}`}
              onClick={handleLike}
              aria-label={liked ? 'Você curtiu este webinar' : 'Curtir este webinar'}
            >
              <Heart size={20} className={liked ? 'room-like-icon--filled' : ''} />
              <span>{liked ? 'Curtido' : 'Curtir'}</span>
            </button>
          </section>

          {showCtaBanner && activeCtas.map((cta) => (
            <section
              key={cta.id}
              className={`room-cta-banner ${cta.banner_desktop_url ? '' : 'room-cta-banner--no-image'}`}
              aria-label={`Oferta: ${cta.title}`}
            >
              <button className="room-cta-dismiss" onClick={() => handleDismissCta(cta.id)}
                aria-label="Fechar oferta">
                <X size={16} />
              </button>
              {cta.banner_desktop_url && (
                <img src={cta.banner_desktop_url} alt="" className="room-cta-banner-img" />
              )}
              <div className="room-cta-content">
                <div className="room-cta-info">
                  <h2 className="room-cta-title">{cta.title}</h2>
                  {cta.description && <p className="room-cta-description">{cta.description}</p>}
                  {cta.sale_price != null && (
                    <p className="room-cta-price">
                      {cta.original_price != null && (
                        <s className="room-cta-price-original">R$ {Number(cta.original_price).toFixed(2)}</s>
                      )}
                      <span className="room-cta-price-sale">R$ {Number(cta.sale_price).toFixed(2)}</span>
                    </p>
                  )}
                </div>
                <button className="btn btn-primary btn-lg room-cta-button" onClick={() => handleCtaClick(cta)}>
                  {cta.button_text} <ExternalLink size={16} />
                </button>
              </div>
            </section>
          ))}
        </div>

        <aside className="room-sidebar" aria-label="Interações do webinar">
          <div className="room-interaction-tabs" role="tablist" aria-label="Interações">
            <button
              id="room-chat-tab"
              className={`room-interaction-tab ${activeMobileTab === 'chat' ? 'active' : ''}`}
              type="button"
              role="tab"
              aria-selected={activeMobileTab === 'chat'}
              aria-controls="room-chat-panel"
              onClick={() => setActiveMobileTab('chat')}
            >
              <MessageCircle size={17} /> <span>{t('chat.title')}</span>
              <span className="room-tab-count">{allMessages.length}</span>
            </button>
            <button
              id="room-polls-tab"
              className={`room-interaction-tab ${activeMobileTab === 'polls' ? 'active' : ''}`}
              type="button"
              role="tab"
              aria-selected={activeMobileTab === 'polls'}
              aria-controls="room-polls-panel"
              disabled={!activePoll}
              onClick={() => setActiveMobileTab('polls')}
            >
              <BarChart3 size={16} /> <span>{t('polls.title')}</span>
            </button>
          </div>

          {activePoll && (
            <div
              id="room-polls-panel"
              className={`room-poll-section ${activeMobileTab !== 'polls' ? 'room-panel-hidden' : ''}`}
              role="tabpanel"
              aria-labelledby="room-polls-tab"
            >
              {!pollSubmitted ? (
                <div className="room-poll">
                  <div className="room-poll-header"><BarChart3 size={16} /><span>{t('polls.title')}</span></div>
                  <h4 className="room-poll-question">{activePoll.question}</h4>
                  <div className="room-poll-options">
                    {(activePoll.options || []).map((option, idx) => (
                      <button key={idx}
                        className={`room-poll-option ${selectedPollOption === idx ? 'selected' : ''}`}
                        onClick={() => setSelectedPollOption(idx)}>
                        <span className="room-poll-option-radio" />{option}
                      </button>
                    ))}
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={handlePollVote}
                    disabled={selectedPollOption === null} style={{ width: '100%' }}>
                    {t('polls.vote')}
                  </button>
                </div>
              ) : (
                <div className="room-poll room-poll-submitted">
                  <div className="room-poll-header"><ThumbsUp size={16} /><span>{t('polls.results')}</span></div>
                  <p className="room-poll-thanks">
                    {t('polls.totalVotes', { count: activePoll.poll_responses?.length || 1 })}
                  </p>
                </div>
              )}
            </div>
          )}

          <div
            id="room-chat-panel"
            className={`room-chat ${activeMobileTab !== 'chat' ? 'room-panel-hidden' : ''}`}
            role="tabpanel"
            aria-labelledby="room-chat-tab"
          >
            <div className="room-chat-header">
              <span>Chat ao vivo</span>
              <span className="room-chat-presence"><span aria-hidden="true" /> Em tempo real</span>
            </div>
            <div className="room-chat-messages" aria-live="polite" aria-label="Mensagens do Chat">
              {allMessages.length === 0 ? (
                <div className="room-chat-empty">
                  <MessageCircle size={28} aria-hidden="true" />
                  <strong>O chat está pronto</strong>
                  <span>Seja a primeira pessoa a enviar uma mensagem.</span>
                </div>
              ) : (
                allMessages.map((msg) => (
                  <div key={msg.id} className={`room-chat-message ${msg.isSimulated ? 'simulated' : ''} ${msg.is_ai ? 'ai-message' : ''}`}>
                    <div className="room-chat-avatar">{msg.is_ai ? '🤖' : msg.user_name?.[0]?.toUpperCase() || '?'}</div>
                    <div className="room-chat-bubble">
                      <span className="room-chat-name">{msg.user_name}</span>
                      <span className="room-chat-text">{msg.message}</span>
                    </div>
                  </div>
                ))
              )}
              {aiTyping && (
                <div className="room-chat-message ai-message ai-typing">
                  <div className="room-chat-avatar">🤖</div>
                  <div className="room-chat-bubble">
                    <span className="room-chat-name">Gablive AI</span>
                    <span className="room-chat-typing-dots" aria-label="IA está digitando">
                      <span /><span /><span />
                    </span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            {chatError && <p className="room-chat-error">{chatError}</p>}
            {registration && (
              <form className="room-chat-input" onSubmit={handleSendChat}>
                <input type="text" className="input" placeholder={t('chat.placeholder')}
                  aria-label="Digite sua mensagem" value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)} />
                <button type="submit" className="btn btn-primary btn-icon"
                  aria-label="Enviar mensagem" disabled={!chatInput.trim()}>
                  <Send size={16} />
                </button>
              </form>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}

function VideoIcon({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  );
}
