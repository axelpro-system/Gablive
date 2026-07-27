import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { Mail, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';
import './AuthPages.css';

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await resetPassword(email);
      setSent(true);
    } catch (err) {
      setError(t('auth.resetError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo">
              <img src="/gablive-logo.svg" alt="Gablive" className="auth-logo-img" />
            </div>
            <h1 className="auth-title">{t('auth.forgotPasswordTitle')}</h1>
            <p className="auth-subtitle">{t('auth.forgotPasswordSubtitle')}</p>
          </div>

          {sent ? (
            <div className="auth-confirmation">
              <CheckCircle2 size={48} className="auth-confirmation-icon" aria-hidden="true" />
              <p className="auth-confirmation-text" role="status">
                {t('auth.resetEmailSent')}
              </p>
              <Link to="/auth/login" className="btn btn-primary btn-lg auth-submit">
                <ArrowLeft size={18} />
                {t('auth.backToLogin')}
              </Link>
            </div>
          ) : (
            <form className="auth-form" onSubmit={handleSubmit}>
              {error && (
                <div className="auth-error" role="alert">
                  {error}
                </div>
              )}

              <div className="input-group">
                <label className="input-label" htmlFor="forgot-email">
                  {t('auth.emailLabel')}
                </label>
                <div className="input-with-icon">
                  <Mail size={18} className="input-icon" />
                  <input
                    id="forgot-email"
                    type="email"
                    className="input input-icon-left"
                    placeholder={t('auth.emailPlaceholder')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-lg auth-submit"
                disabled={loading}
              >
                {loading ? (
                  <span className="spinner spinner-sm" />
                ) : (
                  <>
                    {t('auth.sendResetLink')}
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>
          )}

          <div className="auth-footer">
            <p>
              <Link to="/auth/login">{t('auth.backToLogin')}</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
