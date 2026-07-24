import { useState, useRef, useCallback } from 'react';
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
import { WEBINAR_STATUS, WEBINAR_TYPE, ANALYTICS_EVENTS } from '../../lib/constants';
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

  const [isMuted, setIsMuted] = useState(true);
  const [activeMobileTab, setActiveMobileTab] = useState('chat');
  const [chatInput, setChatInput] = useState('');
  const [liked, setLiked] = useState(() => {
    const stored = localStorage.getItem(`webinar-like-${slug}`);
    return stored === 'true';
  });

  const iframeRef = useRef(null);
  const chatEndRef = useRef(null);

  // Chat
  const { messages: chatMessages, sendMessage } = useChat(webinar?.id, registration?.name);
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
    if (!chatInput.trim()) return;
    const result = await sendMessage(sanitizeInput(chatInput));
    if (!result?.ok) return;
    setChatInput('');
    if (webinar && registration) {
      trackEvent(webinar.id, registration.id, ANALYTICS_EVENTS.CHAT_MESSAGE);
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
    if (!webinar?.video_url) return null;
    const url = webinar.video_url;
    const ytMatch = url.match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    );
    if (ytMatch) {
      const origin = window.location.origin;
      return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&mute=1&enablejsapi=1&origin=${encodeURIComponent(origin)}&rel=0&controls=0&modestbranding=1&showinfo=0&fs=0&iv_load_policy=3&disablekb=1`;
    }
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`;
    return url;
  }, [webinar]);

  const countdown = useCountdown(webinar?.scheduled_at);

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

  const isLive = webinar.status === WEBINAR_STATUS.LIVE;
  const isScheduled = webinar.status === WEBINAR_STATUS.SCHEDULED;
  const isRecorded = webinar.type === WEBINAR_TYPE.RECORDED;

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
            {isScheduled && !isRecorded ? (
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
            ) : (
              <div className="room-video-wrapper">
                {getVideoEmbed() ? (
                  <>
                    <iframe
                      ref={iframeRef}
                      className="room-video-iframe"
                      src={getVideoEmbed()}
                      title={webinar.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                    <div className="room-video-overlay-blocker" />
                    {isMuted && (
                      <button className="room-unmute-overlay" onClick={handleUnmute} aria-label="Ativar som">
                        <Volume2 size={24} className="unmute-icon" />
                        <span>Sua transmissão começou! Clique para ativar o som 🔊</span>
                      </button>
                    )}
                  </>
                ) : (
                  <div className="room-video-placeholder">
                    <VideoIcon size={64} />
                    <p>Video will appear here</p>
                  </div>
                )}

                <div className="room-sales-toasts">
                  {visibleSaleToasts.map((sale) => (
                    <div key={sale.id} className="room-sale-toast">
                      <strong>{sale.buyer_name}{sale.buyer_location ? ` (${sale.buyer_location})` : ''}</strong>
                      <span> acabou de comprar {sale.product_name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="room-video-meta" aria-label="Informações do webinar">
            <div className="room-video-meta-copy">
              <div className="room-video-status">
                {isLive && (
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
            <section key={cta.id} className="room-cta-banner" aria-label={`Oferta: ${cta.title}`}>
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
                  <div key={msg.id} className={`room-chat-message ${msg.isSimulated ? 'simulated' : ''}`}>
                    <div className="room-chat-avatar">{msg.user_name?.[0]?.toUpperCase() || '?'}</div>
                    <div className="room-chat-bubble">
                      <span className="room-chat-name">{msg.user_name}</span>
                      <span className="room-chat-text">{msg.message}</span>
                    </div>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>
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
