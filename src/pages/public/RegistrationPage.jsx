import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { useCountdown } from '../../hooks/useCountdown';
import { useTrackEvent } from '../../hooks/useAnalytics';
import { BLOCK_TYPES, ANALYTICS_EVENTS, WAIT_ROOM_JIT_DELAY_SECONDS } from '../../lib/constants';
import { useSeo } from '../../hooks/useSeo';
import { sanitizeInput, isValidEmail } from '../../lib/sanitize';
import { CheckCircle, Clock, Quote, ArrowRight, ShieldCheck, CalendarDays, X, Users } from 'lucide-react';
import './RegistrationPage.css';

export default function RegistrationPage() {
  const { slug } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { trackEvent } = useTrackEvent();

  const [webinar, setWebinar] = useState(null);
  const [page, setPage] = useState(null);
  const [loginConfig, setLoginConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '' });
  const [emailValid, setEmailValid] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [showExitIntent, setShowExitIntent] = useState(false);
  const [hasShownExitIntent, setHasShownExitIntent] = useState(false);
  const nameInputRef = useRef(null);

  // SEO metadata optimization
  useSeo({
    title: webinar?.title ? `Inscrição: ${webinar.title}` : 'Webinário Gratuito',
    description: webinar?.description || 'Inscreva-se agora para assistir a este exclusivo webinário online.',
  });

  useEffect(() => {
    const handleMouseLeave = (e) => {
      if (e.clientY < 0 && !hasShownExitIntent && !success) {
        setShowExitIntent(true);
        setHasShownExitIntent(true);
      }
    };
    document.addEventListener('mouseleave', handleMouseLeave);
    return () => document.removeEventListener('mouseleave', handleMouseLeave);
  }, [hasShownExitIntent, success]);

  useEffect(() => {
    const fetch = async () => {
      const { data: webinarData } = await supabase.rpc('get_public_webinar_by_slug', {
        p_slug: slug,
      });

      if (webinarData) {
        setWebinar(webinarData);
        const regPage = webinarData.registration_pages?.[0];
        if (regPage) {
          setPage({
            ...regPage,
            blocks: typeof regPage.blocks === 'string' ? JSON.parse(regPage.blocks) : regPage.blocks,
            theme: typeof regPage.theme === 'string' ? JSON.parse(regPage.theme) : regPage.theme,
          });
        }
        setLoginConfig(webinarData.login_customizations || null);
        trackEvent(webinarData.id, null, ANALYTICS_EVENTS.PAGE_VIEW);
      }
      setLoading(false);
    };
    fetch();
  }, [slug]);

  const countdown = useCountdown(webinar?.scheduled_at);

  const scrollToForm = (e) => {
    e.preventDefault();
    const formElement = document.getElementById('reg-form');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => {
        if (nameInputRef.current) {
          nameInputRef.current.focus();
        }
      }, 500);
    }
  };

  const handleEmailChange = (e) => {
    const val = e.target.value;
    setFormData({ ...formData, email: val });
    if (val.length > 3) {
      setEmailValid(isValidEmail(val));
    } else {
      setEmailValid(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const cleanEmail = formData.email.trim().toLowerCase();
    const cleanName = sanitizeInput(formData.name);

    if (!isValidEmail(cleanEmail)) {
      setError('Por favor, informe um endereço de e-mail válido.');
      setSubmitting(false);
      return;
    }

    try {
      // Check if already registered (RPC — registrations no longer world-readable)
      const { data: alreadyRegistered, error: checkError } = await supabase.rpc(
        'check_registration_email',
        { p_webinar_id: webinar.id, p_email: cleanEmail }
      );

      if (checkError) {
        console.error('check_registration_email failed', checkError);
      }

      if (alreadyRegistered) {
        setError(t('registration.alreadyRegistered'));
        setSubmitting(false);
        return;
      }

      // Just-in-Time: cada lead tem seu próprio "relógio" a partir da entrada
      // (com aquecimento na sala de espera, se configurado)
      const jitDelayMs = webinar.use_wait_room ? WAIT_ROOM_JIT_DELAY_SECONDS * 1000 : 0;
      const sessionStartAt = webinar.is_just_in_time
        ? new Date(Date.now() + jitDelayMs).toISOString()
        : null;

      const { data: reg, error: regError } = await supabase
        .from('registrations')
        .insert({
          webinar_id: webinar.id,
          name: cleanName,
          email: cleanEmail,
          phone: formData.phone ? sanitizeInput(formData.phone) : null,
          session_start_at: sessionStartAt,
        })
        .select()
        .single();

      if (regError) throw regError;

      trackEvent(webinar.id, reg.id, ANALYTICS_EVENTS.REGISTRATION);

      // Enqueue confirmation email (durable queue → process-email-queue worker).
      // Capture the SPA origin so CTAs link here, not a marketing domain.
      supabase
        .rpc('enqueue_confirmation_email', {
          p_registration_id: reg.id,
          p_app_base_url: window.location.origin,
        })
        .then(({ error: enqueueError }) => {
          if (enqueueError) {
            console.error('enqueue_confirmation_email failed', enqueueError);
          }
        });

      // Store registration ID for room access
      localStorage.setItem(`webinar-reg-${webinar.id}`, reg.id);

      if (webinar.use_wait_room) {
        navigate(`/wait/${webinar.slug}`);
        return;
      }

      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Error registering');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="reg-loading">
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  if (!webinar) {
    return (
      <div className="reg-error">
        <h2>Webinar not found</h2>
      </div>
    );
  }

  if (success) {
    const generateGoogleCalendarUrl = () => {
      const start = new Date(webinar.scheduled_at);
      const end = new Date(start.getTime() + 2 * 60 * 60 * 1000); // 2 hours
      const formatTime = (d) => d.toISOString().replace(/-|:|\.\d\d\d/g, '');
      const details = encodeURIComponent(webinar.description || 'Webinário exclusivo.');
      return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(webinar.title)}&dates=${formatTime(start)}/${formatTime(end)}&details=${details}`;
    };

    return (
      <div className="reg-success-page">
        <div className="reg-success-card">
          <CheckCircle size={64} className="reg-success-icon" />
          <h1>{t('registration.successTitle')}</h1>
          <p>{t('registration.successMessage')}</p>
          <button
            className="btn btn-primary btn-lg"
            onClick={() => navigate(`/room/${webinar.slug}`)}
          >
            {t('room.title')}
            <ArrowRight size={18} />
          </button>
          
          <div className="reg-calendar-links" style={{ marginTop: '24px' }}>
            <a href={generateGoogleCalendarUrl()} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
              <CalendarDays size={16} />
              Adicionar ao Google Agenda
            </a>
          </div>
        </div>
      </div>
    );
  }

  const theme = page?.theme || {};
  const blocks = page?.blocks || [];
  const usesLegacyTheme = (
    (!theme.primaryColor || theme.primaryColor.toLowerCase() === '#3366ff')
    && (!theme.backgroundColor || theme.backgroundColor.toLowerCase() === '#ffffff')
  );
  const customStyle = {
    '--reg-primary': usesLegacyTheme ? '#E31C23' : theme.primaryColor,
    '--reg-bg': usesLegacyTheme ? '#0F0F10' : theme.backgroundColor,
    '--reg-text': usesLegacyTheme ? '#F4F4F5' : theme.textColor,
  };

  const renderBlock = (block, index) => {
    switch (block.type) {
      case BLOCK_TYPES.HERO:
        return (
          <section key={index} className="reg-block reg-hero">
            <span className="reg-eyebrow">WEBINAR GRATUITO</span>
            <h1 className="reg-hero-title">{block.data?.title || webinar.title}</h1>
            <p className="reg-hero-subtitle">{block.data?.subtitle || webinar.description}</p>
            {block.data?.cta && (
              <button onClick={scrollToForm} className="btn btn-primary btn-xl reg-hero-cta">
                {block.data.cta}
                <ArrowRight size={20} />
              </button>
            )}
          </section>
        );

      case BLOCK_TYPES.COUNTDOWN:
        return (
          <section key={index} className="reg-block reg-countdown-section">
            <p className="reg-countdown-label">
              <Clock size={18} />
              {t('registration.startsIn')}
            </p>
            <div className="reg-countdown">
              <div className="reg-countdown-unit">
                <span className="reg-countdown-value">{countdown.days}</span>
                <span className="reg-countdown-unit-label">{t('registration.days')}</span>
              </div>
              <span className="reg-countdown-separator">:</span>
              <div className="reg-countdown-unit">
                <span className="reg-countdown-value">{countdown.hours}</span>
                <span className="reg-countdown-unit-label">{t('registration.hours')}</span>
              </div>
              <span className="reg-countdown-separator">:</span>
              <div className="reg-countdown-unit">
                <span className="reg-countdown-value">{countdown.minutes}</span>
                <span className="reg-countdown-unit-label">{t('registration.minutes')}</span>
              </div>
              <span className="reg-countdown-separator">:</span>
              <div className="reg-countdown-unit">
                <span className="reg-countdown-value">{countdown.seconds}</span>
                <span className="reg-countdown-unit-label">{t('registration.seconds')}</span>
              </div>
            </div>
          </section>
        );

      case BLOCK_TYPES.BENEFITS:
        return (
          <section key={index} className="reg-block reg-benefits">
            <h2 className="reg-section-title">{block.data?.title || 'O que você vai aprender'}</h2>
            <div className="reg-benefits-grid">
              {(block.data?.items || []).map((item, i) => (
                <div key={i} className="reg-benefit-item">
                  <CheckCircle size={20} className="reg-benefit-icon" />
                  <div>
                    <h4>{item.title}</h4>
                    {item.description && <p>{item.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        );

      case BLOCK_TYPES.TESTIMONIALS:
        return (
          <section key={index} className="reg-block reg-testimonials">
            <h2 className="reg-section-title">{block.data?.title || 'Depoimentos'}</h2>
            <div className="reg-testimonials-grid">
              {(block.data?.items || []).map((item, i) => (
                <div key={i} className="reg-testimonial-card">
                  <Quote size={24} className="reg-testimonial-quote" />
                  <p className="reg-testimonial-text">{item.text}</p>
                  <div className="reg-testimonial-author">
                    <div className="avatar avatar-sm">
                      {item.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <span className="reg-testimonial-name">{item.name}</span>
                      {item.role && <span className="reg-testimonial-role">{item.role}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );

      case BLOCK_TYPES.FORM:
        return (
          <section key={index} id="reg-form" className="reg-block reg-form-section">
            <div className="reg-form-card">
              <span className="reg-form-kicker">INSCRIÇÃO GRATUITA</span>
              <h2 className="reg-form-title">{block.data?.title || t('registration.title')}</h2>

              {error && <div className="auth-error">{error}</div>}

              <form onSubmit={handleSubmit} className="reg-form">
                <div className="input-group">
                  <label className="input-label" htmlFor="reg-name">
                    {t('common.name')} {(loginConfig?.require_name ?? true) && <span className="required">*</span>}
                  </label>
                  <input
                    id="reg-name"
                    type="text"
                    className="input"
                    placeholder={loginConfig?.name_placeholder || t('auth.namePlaceholder')}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required={loginConfig?.require_name ?? true}
                    ref={nameInputRef}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label" htmlFor="reg-email">
                    {t('common.email')} {(loginConfig?.require_email ?? true) && <span className="required">*</span>}
                  </label>
                  <input
                    id="reg-email"
                    type="email"
                    className={`input ${emailValid === true ? 'input-valid' : ''} ${emailValid === false ? 'input-error' : ''}`}
                    placeholder={loginConfig?.email_placeholder || t('auth.emailPlaceholder')}
                    value={formData.email}
                    onChange={handleEmailChange}
                    required={loginConfig?.require_email ?? true}
                  />
                  {emailValid === false && <span className="input-error-msg" style={{color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block'}}>Formato de e-mail inválido</span>}
                </div>
                {((block.data?.fields || []).includes('phone') || loginConfig?.require_phone) && (
                  <div className="input-group">
                    <label className="input-label" htmlFor="reg-phone">
                      {t('common.phone')} {loginConfig?.require_phone ? <span className="required">*</span> : <span className="input-hint">({t('common.optional')})</span>}
                    </label>
                    <input
                      id="reg-phone"
                      type="tel"
                      className="input"
                      placeholder={loginConfig?.phone_placeholder}
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      required={loginConfig?.require_phone || false}
                    />
                  </div>
                )}
                <button
                  type="submit"
                  className="btn btn-primary btn-xl reg-submit"
                  disabled={submitting}
                >
                  {submitting ? (
                    <span className="spinner spinner-sm" />
                  ) : (
                    <>
                      {block.data?.buttonText || loginConfig?.button_text || t('registration.registerButton')}
                      <ArrowRight size={20} />
                    </>
                  )}
                </button>
              </form>
              <div className="reg-form-social-proof">
                <Users size={16} />
                <span>Mais de <strong>2.500 pessoas</strong> já garantiram a vaga.</span>
              </div>
              <p className="reg-form-trust">
                <ShieldCheck size={15} />
                Seus dados estão seguros. Não enviamos spam.
              </p>
            </div>
          </section>
        );

      case BLOCK_TYPES.TEXT:
        return (
          <section key={index} className="reg-block reg-text">
            <div dangerouslySetInnerHTML={{ __html: block.data?.content || '' }} />
          </section>
        );

      default:
        return null;
    }
  };

  return (
    <div className="reg-page" style={customStyle}>
      <header className="reg-header">
        <img
          src={loginConfig?.logo_url || '/logo-dark.svg'}
          alt={loginConfig?.logo_url ? webinar.title : 'GabLive'}
          className="reg-logo"
        />
        <span>Evento online e gratuito</span>
      </header>
      <main className="reg-content">
        {blocks.map(renderBlock)}
      </main>
      
      <button className="mobile-sticky-cta" onClick={scrollToForm}>
        Garantir Minha Vaga
      </button>

      {showExitIntent && (
        <div className="exit-intent-overlay" onClick={() => setShowExitIntent(false)}>
          <div className="exit-intent-modal" onClick={e => e.stopPropagation()}>
            <button className="exit-intent-close" onClick={() => setShowExitIntent(false)}>
              <X size={20} />
            </button>
            <h3>🚨 Espera aí!</h3>
            <p>Você vai mesmo perder a chance de aprender o conteúdo exclusivo deste webinário?</p>
            <button className="btn btn-primary btn-lg" onClick={(e) => {
              setShowExitIntent(false);
              scrollToForm(e);
            }} style={{ width: '100%', marginTop: '16px' }}>
              Quero garantir minha vaga
            </button>
          </div>
        </div>
      )}

      <footer className="reg-footer">
        <img src="/logo-dark.svg" alt="GabLive" />
        <span>© {new Date().getFullYear()} GabLive. Todos os direitos reservados.</span>
      </footer>
    </div>
  );
}
