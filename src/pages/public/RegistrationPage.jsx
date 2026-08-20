import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import DOMPurify from 'dompurify';
import { supabase } from '../../lib/supabase';
import { useCountdown } from '../../hooks/useCountdown';
import { useTrackEvent } from '../../hooks/useAnalytics';
import { BLOCK_TYPES, ANALYTICS_EVENTS } from '../../lib/constants';
import { useSeo } from '../../hooks/useSeo';
import { useRegistrationSubmit, requestAccessEmail } from '../../hooks/useRegistrationSubmit';
import { needsJitWait } from '../../lib/jitSession';
import { resolvePublicRegistrationPage, canAccessLiveSession } from '../../lib/publicRegistration';
import { buildGoogleCalendarUrl, formatConfirmedSignups } from '../../lib/sessionCalendar';
import { sanitizeInput, isValidEmail, isValidPhone } from '../../lib/sanitize';
import { CheckCircle, Clock, Quote, ArrowRight, ShieldCheck, CalendarDays, X, Users } from 'lucide-react';
import './RegistrationPage.css';

export default function RegistrationPage() {
  const { slug } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { trackEvent } = useTrackEvent();
  const [searchParams] = useSearchParams();
  const utm = {
    utm_source: searchParams.get('utm_source'),
    utm_medium: searchParams.get('utm_medium'),
    utm_campaign: searchParams.get('utm_campaign'),
    utm_term: searchParams.get('utm_term'),
    utm_content: searchParams.get('utm_content'),
  };

  const [webinar, setWebinar] = useState(null);
  const [page, setPage] = useState(null);
  const [loginConfig, setLoginConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '' });
  const [emailValid, setEmailValid] = useState(null);
  const [success, setSuccess] = useState(false);
  const [waitlisted, setWaitlisted] = useState(false);
  const [sessionRegistration, setSessionRegistration] = useState(null);
  const [showExitIntent, setShowExitIntent] = useState(false);
  const [hasShownExitIntent, setHasShownExitIntent] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [lgpdConsent, setLgpdConsent] = useState(false);
  const [showRecover, setShowRecover] = useState(false);
  const [recoverEmail, setRecoverEmail] = useState('');
  const [recoverSubmitting, setRecoverSubmitting] = useState(false);
  const [recoverSent, setRecoverSent] = useState(false);
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

  const loadWebinar = async () => {
    setLoading(true);
    setLoadError(false);

    const { data: webinarData, error: fetchError } = await supabase.rpc(
      'get_public_webinar_by_slug',
      { p_slug: slug }
    );

    if (fetchError) {
      setLoadError(true);
      setLoading(false);
      return;
    }

    if (webinarData) {
      setWebinar(webinarData);
      let bundle = webinarData;
      if (webinarData.registration_page_template_id && !webinarData.registration_page_template) {
        const { data: template } = await supabase
          .from('page_templates')
          .select('id, name, type, subtype, blocks, theme')
          .eq('id', webinarData.registration_page_template_id)
          .maybeSingle();
        if (template) bundle = { ...webinarData, registration_page_template: template };
      }
      const resolved = resolvePublicRegistrationPage(bundle);
      if (resolved) setPage(resolved);
      setLoginConfig(webinarData.login_customizations || null);
      trackEvent(webinarData.id, null, ANALYTICS_EVENTS.PAGE_VIEW);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadWebinar();
  }, [slug]);

  const handleRecoverSubmit = async (e) => {
    e.preventDefault();
    if (!isValidEmail(recoverEmail.trim().toLowerCase()) || !webinar) return;
    setRecoverSubmitting(true);
    await requestAccessEmail(webinar.id, recoverEmail.trim().toLowerCase());
    setRecoverSubmitting(false);
    setRecoverSent(true);
  };

  const { submitRegistration, submitting, error, setError } = useRegistrationSubmit(webinar);
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

    const cleanEmail = formData.email.trim().toLowerCase();
    const cleanName = sanitizeInput(formData.name);

    if (!isValidEmail(cleanEmail)) {
      setError('Por favor, informe um endereço de e-mail válido.');
      return;
    }

    if (formData.phone.trim() && !isValidPhone(formData.phone)) {
      setError('Por favor, informe um número de telefone válido.');
      return;
    }

    if (!lgpdConsent) {
      setError(t('registration.consentRequired'));
      return;
    }

    const result = await submitRegistration(
      cleanName,
      cleanEmail,
      formData.phone ? sanitizeInput(formData.phone) : null,
      utm,
    );

    if (!result.success || !result.reg?.id) {
      if (result.error === 'alreadyRegistered') {
        setError(t('registration.alreadyRegistered'));
      }
      return;
    }

    trackEvent(webinar.id, result.reg.id, ANALYTICS_EVENTS.REGISTRATION);
    localStorage.setItem(`webinar-reg-${webinar.id}`, result.reg.id);
    const isWaitlisted = Boolean(result.reg.waitlisted);
    setWaitlisted(isWaitlisted);
    setSessionRegistration(result.reg);

    if (isWaitlisted || !canAccessLiveSession(result.reg)) {
      setSuccess(true);
      return;
    }

    const goToWait = webinar.use_wait_room || needsJitWait(webinar, result.reg.session_start_at);
    const accessPath = goToWait
      ? `/wait/${webinar.slug}?reg=${result.reg.id}`
      : `/room/${webinar.slug}?reg=${result.reg.id}`;

    if (goToWait) {
      navigate(accessPath);
      return;
    }

    setSuccess(true);
  };

  if (loading) {
    return (
      <div className="reg-loading">
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="reg-error">
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
      <div className="reg-error">
        <h2>{t('registration.notFoundTitle')}</h2>
        <p>{t('registration.notFoundMessage')}</p>
      </div>
    );
  }

  if (success) {
    const calendarUrl = !waitlisted ? buildGoogleCalendarUrl(webinar, sessionRegistration) : null;

    return (
      <div className="reg-success-page">
        <div className="reg-success-card">
          <CheckCircle size={64} className="reg-success-icon" />
          <h1>{t('registration.successTitle')}</h1>
          <p>{t('registration.successMessage')}</p>
          {waitlisted && <p className="reg-waitlist-notice">{t('registration.waitlistedMessage')}</p>}
          {!waitlisted && (
            <button
              className="btn btn-primary btn-lg"
              onClick={() => {
                const regId = localStorage.getItem(`webinar-reg-${webinar.id}`);
                navigate(regId ? `/room/${webinar.slug}?reg=${regId}` : `/room/${webinar.slug}`);
              }}
            >
              {loginConfig?.button_text || t('room.title')}
              <ArrowRight size={18} />
            </button>
          )}

          {calendarUrl && (
            <div className="reg-calendar-links" style={{ marginTop: '24px' }}>
              <a href={calendarUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
                <CalendarDays size={16} />
                Adicionar ao Google Agenda
              </a>
            </div>
          )}
        </div>
      </div>
    );
  }

  const theme = page?.theme || {};
  const storedBlocks = page?.blocks || [];
  const blocks = storedBlocks.some((block) => block.type === BLOCK_TYPES.FORM)
    ? storedBlocks
    : [...storedBlocks, { type: BLOCK_TYPES.FORM, data: { fields: ['name', 'email'] } }];
  const usesLegacyTheme = (
    (!theme.primaryColor || theme.primaryColor.toLowerCase() === '#3366ff')
    && (!theme.backgroundColor || theme.backgroundColor.toLowerCase() === '#ffffff')
  );
  const customStyle = {
    '--reg-primary': usesLegacyTheme ? '#E31C23' : theme.primaryColor,
    '--reg-bg': usesLegacyTheme ? '#0F0F10' : theme.backgroundColor,
    '--reg-text': usesLegacyTheme ? '#F4F4F5' : theme.textColor,
    '--reg-progress': loginConfig?.progress_bar_color || (usesLegacyTheme ? '#E31C23' : theme.primaryColor),
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
                <label className="reg-consent-checkbox">
                  <input
                    type="checkbox"
                    checked={lgpdConsent}
                    onChange={(e) => setLgpdConsent(e.target.checked)}
                    required
                  />
                  <span>{t('registration.consentLabel')}</span>
                </label>
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
              {formatConfirmedSignups(webinar.confirmed_registration_count) && (
                <div className="reg-form-social-proof">
                  <Users size={16} />
                  <span>{formatConfirmedSignups(webinar.confirmed_registration_count)}</span>
                </div>
              )}
              <p className="reg-form-trust">
                <ShieldCheck size={15} />
                Seus dados estão seguros. Não enviamos spam.
              </p>

              {!showRecover ? (
                <button
                  type="button"
                  className="reg-recover-toggle"
                  onClick={() => setShowRecover(true)}
                >
                  {t('registration.recoverAccessPrompt')} {t('registration.recoverAccessButton')}
                </button>
              ) : recoverSent ? (
                <p className="reg-recover-success">{t('registration.recoverAccessSuccess')}</p>
              ) : (
                <form className="reg-recover-form" onSubmit={handleRecoverSubmit}>
                  <input
                    type="email"
                    className="input"
                    placeholder={t('registration.recoverAccessEmailLabel')}
                    value={recoverEmail}
                    onChange={(e) => setRecoverEmail(e.target.value)}
                    required
                  />
                  <button type="submit" className="btn btn-secondary" disabled={recoverSubmitting}>
                    {recoverSubmitting ? <span className="spinner spinner-sm" /> : t('registration.recoverAccessSubmit')}
                  </button>
                  <button type="button" className="btn btn-link" onClick={() => setShowRecover(false)}>
                    {t('registration.recoverAccessCancel')}
                  </button>
                </form>
              )}
            </div>
          </section>
        );

      case BLOCK_TYPES.TEXT:
        return (
          <section key={index} className="reg-block reg-text">
            <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(block.data?.content || '') }} />
          </section>
        );

      default:
        return null;
    }
  };

  // Split blocks for Bootstrap grid layout
  const sidebarTypes = [BLOCK_TYPES.HERO, BLOCK_TYPES.COUNTDOWN, BLOCK_TYPES.FORM];
  const sidebarBlocks = blocks.filter(b => sidebarTypes.includes(b.type));
  const restBlocks = blocks.filter(b => !sidebarTypes.includes(b.type));

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
      {loginConfig?.show_progress_bar !== false && (
        <div className="reg-progress" aria-hidden="true">
          <div className="reg-progress-bar" />
        </div>
      )}
      <main>
        <div className="container">
          {/* Two-column row: hero + countdown (left) | form (right) */}
          <div className="row">
            <div className="col-12 col-lg-7 reg-col-left">
              {sidebarBlocks
                .filter(b => b.type !== BLOCK_TYPES.FORM)
                .map((block, i) => renderBlock(block, `side-left-${i}`))}
            </div>
            <div className="col-12 col-lg-5 reg-col-right">
              {sidebarBlocks
                .filter(b => b.type === BLOCK_TYPES.FORM)
                .map((block, i) => renderBlock(block, `side-right-${i}`))}
            </div>
          </div>

          {/* Full-width rows: benefits, testimonials, text, etc. */}
          {restBlocks.map((block, i) => (
            <div className="row" key={`rest-${i}`}>
              <div className="col-12">{renderBlock(block, `rest-${i}`)}</div>
            </div>
          ))}
        </div>
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
