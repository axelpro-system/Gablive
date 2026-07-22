import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { useChat, useSimulatedChat } from '../../hooks/useChat';
import { useTrackEvent } from '../../hooks/useAnalytics';
import { useCountdown } from '../../hooks/useCountdown';
import { WEBINAR_STATUS, WEBINAR_TYPE, ANALYTICS_EVENTS, WATCH_MILESTONES, AUDIENCE_MODE } from '../../lib/constants';
import { useSeo } from '../../hooks/useSeo';
import { sanitizeInput } from '../../lib/sanitize';
import {
  Send,
  Users,
  Radio,
  Clock,
  ExternalLink,
  X,
  ThumbsUp,
  MessageCircle,
  BarChart3,
  Volume2,
} from 'lucide-react';
import './WebinarRoomPage.css';

export default function WebinarRoomPage() {
  const { slug } = useParams();
  const { t } = useTranslation();
  const { trackEvent } = useTrackEvent();

  const [webinar, setWebinar] = useState(null);
  const [registration, setRegistration] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chatInput, setChatInput] = useState('');
  const [videoTime, setVideoTime] = useState(0);
  const [activeCtas, setActiveCtas] = useState([]);
  const [activePoll, setActivePoll] = useState(null);
  const [selectedPollOption, setSelectedPollOption] = useState(null);
  const [pollSubmitted, setPollSubmitted] = useState(false);
  const [showCtaBanner, setShowCtaBanner] = useState(false);
  const [dismissedCtas, setDismissedCtas] = useState(new Set());
  const [isMuted, setIsMuted] = useState(true);
  const [activeMobileTab, setActiveMobileTab] = useState('chat');
  const [visibleSaleToasts, setVisibleSaleToasts] = useState([]);
  const [audienceCount, setAudienceCount] = useState(0);

  const chatEndRef = useRef(null);
  const videoIntervalRef = useRef(null);
  const iframeRef = useRef(null);
  const firedMilestonesRef = useRef(new Set());
  const firedPitchRef = useRef(false);
  const firedOfferRef = useRef(new Set());
  const firedSalesRef = useRef(new Set());

  const handleUnmute = () => {
    setIsMuted(false);
    if (iframeRef.current && iframeRef.current.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: 'unMute', args: [] }),
          '*'
        );
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: 'playVideo', args: [] }),
          '*'
        );
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: 'setVolume', args: [100] }),
          '*'
        );
      } catch (err) {
        console.error('Error unmuting YouTube iframe:', err);
      }
    }
  };

  // Fetch webinar data
  useEffect(() => {
    const fetchWebinar = async () => {
      const { data, error } = await supabase
        .from('webinars')
        .select(`
          *,
          simulated_messages(*, order: sort_order),
          cta_configs(*, order: sort_order),
          polls(*, poll_responses(*)),
          sales_notifications(*, order: show_at_seconds),
          audience_configs(*)
        `)
        .eq('slug', slug)
        .single();

      if (data) {
        setWebinar(data);

        const audience = data.audience_configs;
        if (audience?.mode === AUDIENCE_MODE.FIXED) {
          setAudienceCount(audience.fixed_count);
        } else if (audience?.mode === AUDIENCE_MODE.DYNAMIC) {
          const { dynamic_min: min, dynamic_max: max } = audience;
          setAudienceCount(Math.floor(Math.random() * (max - min + 1)) + min);
        }

        // Check registration from localStorage
        const regId = localStorage.getItem(`webinar-reg-${data.id}`);
        if (regId) {
          const { data: reg } = await supabase
            .from('registrations')
            .select('*')
            .eq('id', regId)
            .single();

          if (reg) {
            setRegistration(reg);
            // Mark as attended
            if (!reg.attended) {
              await supabase
                .from('registrations')
                .update({ attended: true, attended_at: new Date().toISOString() })
                .eq('id', regId);
            }
            trackEvent(data.id, regId, ANALYTICS_EVENTS.JOIN);
            trackEvent(data.id, regId, ANALYTICS_EVENTS.WEBINAR_ENTERED);
          }
        }
      }
      setLoading(false);
    };

    fetchWebinar();
  }, [slug, trackEvent]);

  // Real chat
  const { messages: chatMessages, sendMessage } = useChat(
    webinar?.id,
    registration?.name
  );

  // Simulated chat
  const { messages: simulatedMessages } = useSimulatedChat(
    webinar?.id,
    videoTime
  );

  // All chat messages (real + simulated), merged and sorted
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

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [allMessages.length]);

  // Track video progress
  useEffect(() => {
    videoIntervalRef.current = setInterval(() => {
      setVideoTime((prev) => prev + 1);
    }, 1000);

    return () => {
      if (videoIntervalRef.current) {
        clearInterval(videoIntervalRef.current);
      }
    };
  }, []);

  // Audiência dinâmica: leve flutuação dentro do intervalo configurado
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

  // Marcos de assistência (15/30/45/60 min) do funil canônico
  useEffect(() => {
    if (!webinar || !registration) return;
    WATCH_MILESTONES.forEach(({ seconds, event }) => {
      if (videoTime >= seconds && !firedMilestonesRef.current.has(event)) {
        firedMilestonesRef.current.add(event);
        trackEvent(webinar.id, registration.id, event, { seconds: videoTime });
      }
    });
  }, [videoTime, webinar, registration, trackEvent]);

  // Pitch reached (início do pitch configurado na oferta)
  useEffect(() => {
    if (!webinar?.cta_configs || !registration || firedPitchRef.current) return;
    const pitchStarts = webinar.cta_configs
      .map((c) => c.pitch_start_seconds)
      .filter((s) => s != null && s >= 0);
    if (pitchStarts.length === 0) return;
    const earliestPitch = Math.min(...pitchStarts);
    if (videoTime >= earliestPitch) {
      firedPitchRef.current = true;
      trackEvent(webinar.id, registration.id, ANALYTICS_EVENTS.PITCH_REACHED, { seconds: videoTime });
    }
  }, [videoTime, webinar, registration, trackEvent]);

  // Notificações de venda (prova social) — toasts temporários no timeline
  useEffect(() => {
    const sales = webinar?.sales_notifications || [];
    sales.forEach((sale) => {
      if (videoTime >= sale.show_at_seconds && !firedSalesRef.current.has(sale.id)) {
        firedSalesRef.current.add(sale.id);
        setVisibleSaleToasts((prev) => [...prev, sale]);
        setTimeout(() => {
          setVisibleSaleToasts((prev) => prev.filter((s) => s.id !== sale.id));
        }, 6000);
      }
    });
  }, [videoTime, webinar]);

  // Track progress every 30 seconds
  useEffect(() => {
    if (videoTime > 0 && videoTime % 30 === 0 && webinar && registration) {
      trackEvent(webinar.id, registration.id, ANALYTICS_EVENTS.VIDEO_PROGRESS, {
        seconds: videoTime,
      });
    }
  }, [videoTime, webinar, registration, trackEvent]);

  // Check CTA visibility based on video time
  useEffect(() => {
    if (!webinar?.cta_configs) return;

    const visible = webinar.cta_configs.filter(
      (cta) =>
        videoTime >= cta.show_at_seconds &&
        (cta.hide_at_seconds === null || videoTime <= cta.hide_at_seconds) &&
        !dismissedCtas.has(cta.id)
    );

    setActiveCtas(visible);
    setShowCtaBanner(visible.length > 0);

    if (registration) {
      visible.forEach((cta) => {
        if (!firedOfferRef.current.has(cta.id)) {
          firedOfferRef.current.add(cta.id);
          trackEvent(webinar.id, registration.id, ANALYTICS_EVENTS.OFFER_SHOWN, { cta_id: cta.id });
        }
      });
    }
  }, [videoTime, webinar, dismissedCtas, registration, trackEvent]);

  // Check polls based on video time
  useEffect(() => {
    if (!webinar?.polls || pollSubmitted) return;

    const active = webinar.polls.find(
      (poll) => poll.show_at_seconds <= videoTime && poll.active
    );

    if (active && !activePoll) {
      setActivePoll(active);
    }
  }, [videoTime, webinar, activePoll, pollSubmitted]);

  // SEO Optimization
  useSeo({
    title: webinar?.title ? `Sala: ${webinar.title}` : 'Sala do Webinário',
    description: webinar?.description || 'Assista ao vivo ao webinário.',
  });

  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const sanitizedMsg = sanitizeInput(chatInput);
    await sendMessage(sanitizedMsg);
    setChatInput('');

    if (webinar && registration) {
      trackEvent(webinar.id, registration.id, ANALYTICS_EVENTS.CHAT_MESSAGE);
    }
  };

  const handleCtaClick = (cta) => {
    if (webinar && registration) {
      trackEvent(webinar.id, registration.id, ANALYTICS_EVENTS.CTA_CLICK, {
        cta_id: cta.id,
      });
    }
    window.open(cta.button_url, '_blank');
  };

  const handleDismissCta = (ctaId) => {
    setDismissedCtas((prev) => new Set([...prev, ctaId]));
  };

  const handlePollVote = async () => {
    if (!activePoll || selectedPollOption === null || !registration) return;

    await supabase.from('poll_responses').insert({
      poll_id: activePoll.id,
      registration_id: registration.id,
      selected_option: selectedPollOption,
    });

    trackEvent(webinar.id, registration.id, ANALYTICS_EVENTS.POLL_RESPONSE, {
      poll_id: activePoll.id,
      option: selectedPollOption,
    });

    setPollSubmitted(true);
  };

  const getVideoEmbed = useCallback(() => {
    if (!webinar?.video_url) return null;

    const url = webinar.video_url;

    // YouTube
    const ytMatch = url.match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    );
    if (ytMatch) {
      const origin = window.location.origin;
      return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&mute=1&enablejsapi=1&origin=${encodeURIComponent(origin)}&rel=0&controls=0&modestbranding=1&showinfo=0&fs=0&iv_load_policy=3&disablekb=1`;
    }

    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`;
    }

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
  const isEnded = webinar.status === WEBINAR_STATUS.ENDED;
  const isRecorded = webinar.type === WEBINAR_TYPE.RECORDED;

  return (
    <div className="room-page">
      {/* Header */}
      <header className="room-header">
        <div className="room-header-left">
          <h1 className="room-title">{webinar.title}</h1>
          {isLive && (
            <span className="room-live-badge">
              <Radio size={14} />
              {t('room.liveNow')}
            </span>
          )}
        </div>
        <div className="room-header-right">
          {webinar.audience_configs?.mode !== 'none' && (
            <span className="room-viewers">
              <Users size={14} />
              {t('room.watching', { count: audienceCount })}
            </span>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="room-content">
        {/* Video Area */}
        <div className="room-video-area">
          {isScheduled && !isRecorded ? (
            <div className="room-waiting">
              <Clock size={48} />
              <h2>{t('room.waitingToStart')}</h2>
              <div className="room-countdown">
                <div className="countdown-unit">
                  <span className="countdown-value">{countdown.days}</span>
                  <span className="countdown-label">{t('registration.days')}</span>
                </div>
                <div className="countdown-unit">
                  <span className="countdown-value">{countdown.hours}</span>
                  <span className="countdown-label">{t('registration.hours')}</span>
                </div>
                <div className="countdown-unit">
                  <span className="countdown-value">{countdown.minutes}</span>
                  <span className="countdown-label">{t('registration.minutes')}</span>
                </div>
                <div className="countdown-unit">
                  <span className="countdown-value">{countdown.seconds}</span>
                  <span className="countdown-label">{t('registration.seconds')}</span>
                </div>
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
                  {/* Transparent overlay to block YouTube hover/clicks & enforce live feel */}
                  <div className="room-video-overlay-blocker" />

                  {/* Unmute Overlay Banner */}
                  {isMuted && (
                    <button
                      className="room-unmute-overlay"
                      onClick={handleUnmute}
                      aria-label="Ativar som do webinário"
                    >
                      <Volume2 size={24} className="unmute-icon" />
                      <span>Sua transmissão começou! Clique para ativar o som 🔊</span>
                    </button>
                  )}
                </>
              ) : (
                <div className="room-video-placeholder">
                  <Video size={64} />
                  <p>Video will appear here</p>
                </div>
              )}

              {/* CTA Banner Overlay */}
              {showCtaBanner && activeCtas.map((cta) => (
                <div key={cta.id} className="room-cta-banner">
                  <button
                    className="room-cta-dismiss"
                    onClick={() => handleDismissCta(cta.id)}
                  >
                    <X size={16} />
                  </button>
                  {cta.banner_desktop_url && (
                    <img src={cta.banner_desktop_url} alt={cta.title} className="room-cta-banner-img" />
                  )}
                  <div className="room-cta-content">
                    <div className="room-cta-info">
                      <h3 className="room-cta-title">{cta.title}</h3>
                      {cta.description && (
                        <p className="room-cta-description">{cta.description}</p>
                      )}
                      {cta.sale_price != null && (
                        <p className="room-cta-price">
                          {cta.original_price != null && (
                            <s className="room-cta-price-original">R$ {Number(cta.original_price).toFixed(2)}</s>
                          )}
                          <span className="room-cta-price-sale">R$ {Number(cta.sale_price).toFixed(2)}</span>
                        </p>
                      )}
                    </div>
                    <button
                      className="btn btn-primary btn-lg room-cta-button"
                      onClick={() => handleCtaClick(cta)}
                    >
                      {cta.button_text}
                      <ExternalLink size={16} />
                    </button>
                  </div>
                </div>
              ))}

              {/* Toasts de prova social (vendas) */}
              <div className="room-sales-toasts">
                {visibleSaleToasts.map((sale) => (
                  <div key={sale.id} className="room-sale-toast">
                    <strong>{sale.buyer_name}{sale.buyer_location ? ` (${sale.buyer_location})` : ''}</strong>
                    <span>acabou de comprar {sale.product_name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar: Chat + Polls */}
        <div className="room-sidebar">
          {/* Mobile Tab Selector */}
          <div className="room-mobile-tabs">
            <button
              className={`room-mobile-tab ${activeMobileTab === 'chat' ? 'active' : ''}`}
              onClick={() => setActiveMobileTab('chat')}
            >
              <MessageCircle size={16} />
              <span>{t('chat.title')} ({allMessages.length})</span>
            </button>
            <button
              className={`room-mobile-tab ${activeMobileTab === 'polls' ? 'active' : ''}`}
              onClick={() => setActiveMobileTab('polls')}
            >
              <BarChart3 size={16} />
              <span>{t('polls.title')}</span>
            </button>
          </div>

          {/* Poll Widget */}
          {activePoll && (
            <div className={`room-poll-section ${activeMobileTab !== 'polls' ? 'mobile-hidden' : ''}`}>
              {!pollSubmitted ? (
                <div className="room-poll">
                  <div className="room-poll-header">
                    <BarChart3 size={16} />
                    <span>{t('polls.title')}</span>
                  </div>
                  <h4 className="room-poll-question">{activePoll.question}</h4>
                  <div className="room-poll-options">
                    {(activePoll.options || []).map((option, idx) => (
                      <button
                        key={idx}
                        className={`room-poll-option ${selectedPollOption === idx ? 'selected' : ''}`}
                        onClick={() => setSelectedPollOption(idx)}
                      >
                        <span className="room-poll-option-radio" />
                        {option}
                      </button>
                    ))}
                  </div>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={handlePollVote}
                    disabled={selectedPollOption === null}
                    style={{ width: '100%' }}
                  >
                    {t('polls.vote')}
                  </button>
                </div>
              ) : (
                <div className="room-poll room-poll-submitted">
                  <div className="room-poll-header">
                    <ThumbsUp size={16} />
                    <span>{t('polls.results')}</span>
                  </div>
                  <p className="room-poll-thanks">
                    {t('polls.totalVotes', { count: activePoll.poll_responses?.length || 1 })}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Chat */}
          <div className={`room-chat ${activeMobileTab !== 'chat' ? 'mobile-hidden' : ''}`}>
            <div className="room-chat-header">
              <MessageCircle size={16} />
              <span>{t('chat.title')}</span>
              <span className="room-chat-count">{allMessages.length}</span>
            </div>

            <div className="room-chat-messages" aria-live="polite" aria-label="Mensagens do Chat">
              {allMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`room-chat-message ${msg.isSimulated ? 'simulated' : ''}`}
                >
                  <div className="room-chat-avatar">
                    {msg.user_name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="room-chat-bubble">
                    <span className="room-chat-name">{msg.user_name}</span>
                    <span className="room-chat-text">{msg.message}</span>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {registration && (
              <form className="room-chat-input" onSubmit={handleSendChat}>
                <input
                  type="text"
                  className="input"
                  placeholder={t('chat.placeholder')}
                  aria-label="Digite sua mensagem"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                />
                <button
                  type="submit"
                  className="btn btn-primary btn-icon"
                  aria-label="Enviar mensagem"
                  disabled={!chatInput.trim()}
                >
                  <Send size={16} />
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Video({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  );
}
