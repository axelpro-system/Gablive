import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { Mail, Lock, User, Building2, ArrowRight, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import './AuthPages.css';

export default function RegisterPage() {
  const { t } = useTranslation();
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError(t('auth.passwordMismatch'));
      return;
    }

    setLoading(true);

    try {
      const data = await signUp({ email, password, name, orgName });
      // Sessão presente = confirmação de e-mail desligada, entra direto.
      // Sem sessão = confirmação exigida, mostra "verifique seu e-mail".
      if (data?.session) {
        navigate('/dashboard');
      } else {
        setConfirmationSent(true);
      }
    } catch (err) {
      setError(t('auth.registerError'));
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
            <h1 className="auth-title">{t('auth.registerTitle')}</h1>
            <p className="auth-subtitle">{t('auth.registerSubtitle')}</p>
          </div>

          {confirmationSent ? (
            <div className="auth-confirmation">
              <CheckCircle2 size={48} className="auth-confirmation-icon" aria-hidden="true" />
              <p className="auth-confirmation-text" role="status">
                {t('auth.checkEmailTitle')}
              </p>
              <p className="auth-subtitle">{t('auth.checkEmailSubtitle', { email })}</p>
              <Link to="/auth/login" className="btn btn-primary btn-lg auth-submit">
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

            <div className="auth-form-row">
              <div className="input-group">
                <label className="input-label" htmlFor="register-name">
                  {t('auth.nameLabel')} <span className="required">*</span>
                </label>
                <div className="input-with-icon">
                  <User size={18} className="input-icon" />
                  <input
                    id="register-name"
                    type="text"
                    className="input input-icon-left"
                    placeholder={t('auth.namePlaceholder')}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label" htmlFor="register-org">
                  {t('auth.orgNameLabel')} <span className="required">*</span>
                </label>
                <div className="input-with-icon">
                  <Building2 size={18} className="input-icon" />
                  <input
                    id="register-org"
                    type="text"
                    className="input input-icon-left"
                    placeholder={t('auth.orgNamePlaceholder')}
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="register-email">
                {t('auth.emailLabel')} <span className="required">*</span>
              </label>
              <div className="input-with-icon">
                <Mail size={18} className="input-icon" />
                <input
                  id="register-email"
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

            <div className="auth-form-row">
              <div className="input-group">
                <label className="input-label" htmlFor="register-password">
                  {t('auth.passwordLabel')} <span className="required">*</span>
                </label>
                <div className="input-with-icon">
                  <Lock size={18} className="input-icon" />
                  <input
                    id="register-password"
                    type={showPassword ? 'text' : 'password'}
                    className="input input-icon-left"
                    placeholder={t('auth.passwordPlaceholder')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    className="input-toggle-password"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="input-group">
                <label className="input-label" htmlFor="register-confirm">
                  {t('auth.confirmPasswordLabel')} <span className="required">*</span>
                </label>
                <div className="input-with-icon">
                  <Lock size={18} className="input-icon" />
                  <input
                    id="register-confirm"
                    type={showPassword ? 'text' : 'password'}
                    className="input input-icon-left"
                    placeholder={t('auth.confirmPasswordPlaceholder')}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
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
                  {t('auth.register')}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
          )}

          <div className="auth-footer">
            <p>
              {t('auth.hasAccount')}{' '}
              <Link to="/auth/login">{t('auth.login')}</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
