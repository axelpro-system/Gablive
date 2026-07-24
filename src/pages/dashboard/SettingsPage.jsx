import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Building, User, Save, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import './SettingsPage.css';

const TOAST_DURATION = 4000;

export default function SettingsPage() {
  const { user, profile } = useAuth();

  // Form state
  const [orgName, setOrgName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [locale, setLocale] = useState('pt-BR');

  // Original values (para detectar mudanças)
  const [original, setOriginal] = useState({ orgName: '', displayName: '', locale: 'pt-BR' });

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [errors, setErrors] = useState({});

  const toastTimerRef = useRef(null);
  const orgNameRef = useRef(null);

  // Auto-dismiss toast
  useEffect(() => {
    if (message) {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => setMessage(null), TOAST_DURATION);
      return () => clearTimeout(toastTimerRef.current);
    }
  }, [message]);

  // Carrega profile
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setLocale(profile.locale || 'pt-BR');
    }
  }, [profile]);

  // Carrega organização
  useEffect(() => {
    const fetchOrg = async () => {
      if (!profile?.org_id) {
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', profile.org_id)
          .single();

        if (error) throw error;
        if (data) {
          setOrgName(data.name);
          setOriginal((prev) => ({ ...prev, orgName: data.name }));
        }
      } catch {
        setMessage({ type: 'error', text: 'Erro ao carregar dados da organização.' });
      } finally {
        setLoading(false);
      }
    };
    fetchOrg();
  }, [profile]);

  // Sincroniza original quando profile carrega
  useEffect(() => {
    if (profile) {
      setOriginal((prev) => ({
        ...prev,
        displayName: profile.display_name || '',
        locale: profile.locale || 'pt-BR',
      }));
    }
  }, [profile]);

  // Detecta se há mudanças não salvas
  const isDirty =
    orgName !== original.orgName ||
    displayName !== original.displayName ||
    locale !== original.locale;

  // Validação
  const validate = useCallback(() => {
    const newErrors = {};

    if (!orgName.trim()) {
      newErrors.orgName = 'Nome da empresa é obrigatório.';
    } else if (orgName.trim().length < 2) {
      newErrors.orgName = 'Nome deve ter pelo menos 2 caracteres.';
    }

    if (displayName.trim().length > 100) {
      newErrors.displayName = 'Nome deve ter no máximo 100 caracteres.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [orgName, displayName]);

  // Limpa erro do campo ao digitar
  const handleOrgNameChange = (e) => {
    setOrgName(e.target.value);
    if (errors.orgName) setErrors((prev) => ({ ...prev, orgName: undefined }));
  };

  const handleDisplayNameChange = (e) => {
    setDisplayName(e.target.value);
    if (errors.displayName) setErrors((prev) => ({ ...prev, displayName: undefined }));
  };

  const handleLocaleChange = (e) => {
    setLocale(e.target.value);
  };

  // Submit
  const handleSave = async (e) => {
    e.preventDefault();
    setMessage(null);

    if (!validate()) {
      orgNameRef.current?.focus();
      return;
    }

    setSaving(true);

    try {
      const updates = [];

      if (profile?.id) {
        updates.push(
          supabase
            .from('profiles')
            .update({ display_name: displayName.trim(), locale })
            .eq('id', profile.id)
        );
      }

      if (profile?.org_id && orgName.trim()) {
        updates.push(
          supabase
            .from('organizations')
            .update({ name: orgName.trim() })
            .eq('id', profile.org_id)
        );
      }

      const results = await Promise.all(updates);
      const failed = results.find((r) => r.error);
      if (failed) throw failed.error;

      // Atualiza valores originais após salvar
      setOriginal({ orgName: orgName.trim(), displayName: displayName.trim(), locale });
      setMessage({ type: 'success', text: 'Configurações salvas com sucesso!' });
    } catch (err) {
      const isNetwork = err?.message?.includes('fetch') || err?.code === 'PGRST301';
      setMessage({
        type: 'error',
        text: isNetwork
          ? 'Sem conexão. Verifique sua internet e tente novamente.'
          : 'Erro ao salvar configurações. Tente novamente.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dashboard-page">
      <header className="page-header mb-6">
        <h1 className="page-title">Configurações da Conta</h1>
        <p className="page-subtitle">Gerencie os dados da sua organização e preferências do perfil.</p>
      </header>

      {message && (
        <div
          className={`settings-alert settings-alert--${message.type} mb-4`}
          role={message.type === 'error' ? 'alert' : 'status'}
          aria-live="polite"
        >
          {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{message.text}</span>
          <button
            className="settings-alert-dismiss"
            onClick={() => setMessage(null)}
            aria-label="Fechar aviso"
          >
            ×
          </button>
        </div>
      )}

      <form onSubmit={handleSave} className="settings-card" noValidate>
        {/* Seção: Organização */}
        <div className="settings-section">
          <div className="settings-section-header">
            <Building size={20} className="settings-section-icon" />
            <h3>Organização</h3>
          </div>

          {loading ? (
            <div className="settings-skeleton">
              <div className="skeleton skeleton-label" />
              <div className="skeleton skeleton-input" />
            </div>
          ) : (
            <div className="input-group">
              <label className="input-label" htmlFor="settings-org-name">
                Nome da Empresa / Conta
              </label>
              <input
                ref={orgNameRef}
                id="settings-org-name"
                type="text"
                className={`input ${errors.orgName ? 'input-error' : ''}`}
                value={orgName}
                onChange={handleOrgNameChange}
                aria-invalid={!!errors.orgName}
                aria-describedby={errors.orgName ? 'org-name-error' : undefined}
                maxLength={100}
              />
              {errors.orgName && (
                <p id="org-name-error" className="input-error-message" role="alert">
                  {errors.orgName}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Seção: Perfil do Usuário */}
        <div className="settings-section">
          <div className="settings-section-header">
            <User size={20} className="settings-section-icon" />
            <h3>Perfil do Usuário</h3>
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="settings-email">E-mail (Login)</label>
            <input
              id="settings-email"
              type="text"
              className="input input--disabled"
              value={user?.email || ''}
              disabled
              aria-label="E-mail de login (não editável)"
            />
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="settings-display-name">Nome de Exibição</label>
            <input
              id="settings-display-name"
              type="text"
              className={`input ${errors.displayName ? 'input-error' : ''}`}
              value={displayName}
              onChange={handleDisplayNameChange}
              aria-invalid={!!errors.displayName}
              aria-describedby={errors.displayName ? 'display-name-error' : undefined}
              maxLength={100}
            />
            {errors.displayName && (
              <p id="display-name-error" className="input-error-message" role="alert">
                {errors.displayName}
              </p>
            )}
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="settings-locale">Idioma Padrão</label>
            <select
              id="settings-locale"
              className="select"
              value={locale}
              onChange={handleLocaleChange}
            >
              <option value="pt-BR">Português (Brasil)</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="settings-footer">
          {isDirty && !saving && (
            <span className="settings-dirty-indicator" aria-live="polite">
              Alterações não salvas
            </span>
          )}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving || loading || !isDirty}
            aria-disabled={saving || loading || !isDirty}
          >
            {saving ? (
              <>
                <Loader2 size={16} className="spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save size={16} />
                Salvar Alterações
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
