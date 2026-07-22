import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { useCountdown } from '../../hooks/useCountdown';
import { useTrackEvent } from '../../hooks/useAnalytics';
import { BLOCK_TYPES, ANALYTICS_EVENTS, WAIT_ROOM_JIT_DELAY_SECONDS } from '../../lib/constants';
import { useSeo } from '../../hooks/useSeo';
import { sanitizeInput, isValidEmail } from '../../lib/sanitize';
import { CheckCircle, Clock, Star, Quote, ArrowRight, Users } from 'lucide-react';
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
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // SEO metadata optimization
  useSeo({
    title: webinar?.title ? `Inscrição: ${webinar.title}` : 'Webinário Gratuito',
    description: webinar?.description || 'Inscreva-se agora para assistir a este exclusivo webinário online.',
  });

  useEffect(() => {
    const fetch = async () => {
      const { data: webinarData } = await supabase
        .from('webinars')
        .select('*, registration_pages(*), login_customizations(*)')
        .eq('slug', slug)
        .single();

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const countdown = useCountdown(webinar?.scheduled_at);

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
      // Check if already registered
      const { data: existing } = await supabase
        .from('registrations')
        .select('id')
        .eq('webinar_id', webinar.id)
        .eq('email', cleanEmail)
        .single();

      if (existing) {
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
        </div>
      </div>
    );
  }

  const theme = page?.theme || {};
  const blocks = page?.blocks || [];
  const customStyle = {
    '--reg-primary': theme.primaryColor || 'var(--color-primary-600)',
    '--reg-bg': theme.backgroundColor || 'var(--color-white)',
    '--reg-text': theme.textColor || 'var(--color-text)',
  };

  const renderBlock = (block, index) => {
    switch (block.type) {
      case BLOCK_TYPES.HERO:
        return (
          <section key={index} className="reg-block reg-hero">
            <h1 className="reg-hero-title">{block.data?.title || webinar.title}</h1>
            <p className="reg-hero-subtitle">{block.data?.subtitle || webinar.description}</p>
            {block.data?.cta && (
              <a href="#reg-form" className="btn btn-primary btn-xl reg-hero-cta">
                {block.data.cta}
                <ArrowRight size={20} />
              </a>
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
              <h2 className="reg-form-title">{t('registration.title')}</h2>

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
                  />
                </div>
                <div className="input-group">
                  <label className="input-label" htmlFor="reg-email">
                    {t('common.email')} {(loginConfig?.require_email ?? true) && <span className="required">*</span>}
                  </label>
                  <input
                    id="reg-email"
                    type="email"
                    className="input"
                    placeholder={loginConfig?.email_placeholder || t('auth.emailPlaceholder')}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required={loginConfig?.require_email ?? true}
                  />
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
                      {loginConfig?.button_text || t('registration.registerButton')}
                      <ArrowRight size={20} />
                    </>
                  )}
                </button>
              </form>
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
      {loginConfig?.logo_url && (
        <img src={loginConfig.logo_url} alt={webinar.title} className="reg-logo" />
      )}
      {blocks.map(renderBlock)}
    </div>
  );
}
