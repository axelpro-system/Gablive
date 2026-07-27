import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useSupabase } from '../../contexts/SupabaseContext';
import { Lock, ArrowRight, Eye, EyeOff, CheckCircle2, AlertTriangle } from 'lucide-react';
import './AuthPages.css';

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const { updatePassword } = useAuth();
  const supabase = useSupabase();
  const navigate = useNavigate();

  // null = verificando o link; true = sessão de recuperação válida; false = link inválido/expirado
  const [linkValid, setLinkValid] = useState(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  // O link do e-mail cria uma sessão de recuperação (detectSessionInUrl). Sem
  // ela, updateUser falharia — então bloqueamos o formulário e oferecemos um
  // caminho para pedir um novo link, em vez de deixar o usuário sem saída.
  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) setLinkValid(Boolean(data.session));
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (active && (event === 'PASSWORD_RECOVERY' || session)) setLinkValid(true);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError(t('auth.passwordMismatch'));
      return;
    }

    setLoading(true);

    try {
      await updatePassword(password);
      setDone(true);
      // Encerra a sessão de recuperação para forçar um login limpo depois.
      // Fire-and-forget: uma falha aqui não invalida a troca de senha.
      supabase.auth.signOut().catch(() => {});
    } catch (err) {
      setError(t('auth.updatePasswordError'));
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
            <h1 className="auth-title">{t('auth.resetPasswordTitle')}</h1>
            <p className="auth-subtitle">{t('auth.resetPasswordSubtitle')}</p>
          </div>

          {linkValid === null ? (
            <div className="auth-confirmation">
              <span className="spinner spinner-lg" />
            </div>
          ) : linkValid === false ? (
            <div className="auth-confirmation">
              <AlertTriangle size={48} className="auth-confirmation-icon-warn" aria-hidden="true" />
              <p className="auth-confirmation-text" role="alert">
                {t('auth.resetLinkInvalidTitle')}
              </p>
              <p className="auth-subtitle">{t('auth.resetLinkInvalidText')}</p>
              <Link to="/auth/forgot-password" className="btn btn-primary btn-lg auth-submit">
                {t('auth.requestNewLink')}
              </Link>
            </div>
          ) : done ? (
            <div className="auth-confirmation">
              <CheckCircle2 size={48} className="auth-confirmation-icon" aria-hidden="true" />
              <p className="auth-confirmation-text" role="status">
                {t('auth.passwordUpdated')}
              </p>
              <p className="auth-subtitle">{t('auth.passwordUpdatedSubtitle')}</p>
              <button
                type="button"
                className="btn btn-primary btn-lg auth-submit"
                onClick={() => navigate('/auth/login')}
              >
                {t('auth.login')}
                <ArrowRight size={18} />
              </button>
            </div>
          ) : (
            <form className="auth-form" onSubmit={handleSubmit}>
              {error && (
                <div className="auth-error" role="alert">
                  {error}
                </div>
              )}

              <div className="input-group">
                <label className="input-label" htmlFor="reset-password">
                  {t('auth.newPasswordLabel')}
                </label>
                <div className="input-with-icon">
                  <Lock size={18} className="input-icon" />
                  <input
                    id="reset-password"
                    type={showPassword ? 'text' : 'password'}
                    className="input input-icon-left"
                    placeholder={t('auth.newPasswordPlaceholder')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="input-toggle-password"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                  >
                    {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                  </button>
                </div>
              </div>

              <div className="input-group">
                <label className="input-label" htmlFor="reset-confirm">
                  {t('auth.confirmPasswordLabel')}
                </label>
                <div className="input-with-icon">
                  <Lock size={18} className="input-icon" />
                  <input
                    id="reset-confirm"
                    type={showPassword ? 'text' : 'password'}
                    className="input input-icon-left"
                    placeholder={t('auth.confirmPasswordPlaceholder')}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    autoComplete="new-password"
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
                    {t('auth.updatePassword')}
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>
          )}

          <div className="auth-footer">
            <p>
              {t('auth.rememberedPassword')}{' '}
              <Link to="/auth/login">{t('auth.login')}</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
