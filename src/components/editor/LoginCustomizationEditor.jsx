import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { LogIn, Save, RotateCcw } from 'lucide-react';
import InlineAlert from '../ui/InlineAlert';

const DEFAULTS = {
  logo_url: '',
  show_progress_bar: true,
  progress_bar_color: '#3366ff',
  button_text: 'Assistir Transmissão',
  require_name: true,
  require_email: true,
  require_phone: false,
  name_placeholder: 'Seu nome completo',
  email_placeholder: 'Seu melhor e-mail',
  phone_placeholder: 'WhatsApp com DDD',
};

export default function LoginCustomizationEditor({ webinarId }) {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const fetchConfig = async () => {
      setLoading(true);
      setLoadError(false);

      const { data, error } = await supabase
        .from('login_customizations')
        .select('*')
        .eq('webinar_id', webinarId)
        .maybeSingle();

      if (error) {
        console.error('Erro ao carregar a Tela de Entrada:', error);
        setLoadError(true);
        setLoading(false);
        return;
      }

      if (data) {
        setConfig(data);
      } else {
        const { data: created, error: createError } = await supabase
          .from('login_customizations')
          .insert({ webinar_id: webinarId, ...DEFAULTS })
          .select()
          .single();
        if (createError || !created) {
          console.error('Erro ao criar a Tela de Entrada:', createError);
          setLoadError(true);
        } else {
          setConfig(created);
        }
      }
      setLoading(false);
    };
    fetchConfig();
  }, [webinarId, reloadKey]);

  const updateField = (field, value) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    const { error } = await supabase
      .from('login_customizations')
      .update({
        logo_url: config.logo_url,
        show_progress_bar: config.show_progress_bar,
        progress_bar_color: config.progress_bar_color,
        button_text: config.button_text,
        require_name: config.require_name,
        require_email: config.require_email,
        require_phone: config.require_phone,
        name_placeholder: config.name_placeholder,
        email_placeholder: config.email_placeholder,
        phone_placeholder: config.phone_placeholder,
      })
      .eq('id', config.id);
    setSaving(false);
    if (error) {
      console.error('Erro ao salvar a Tela de Entrada:', error);
      setFeedback({ type: 'error', text: 'Não foi possível salvar a Tela de Entrada. Tente novamente.' });
      return;
    }
    setFeedback({ type: 'success', text: 'Tela de Entrada salva.' });
  };

  if (loading) return <div className="spinner spinner-sm" />;

  if (loadError || !config) {
    return (
      <div className="card">
        <div className="card-body">
          <InlineAlert type="error" className="mb-3">
            Não foi possível carregar a Tela de Entrada.
          </InlineAlert>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setReloadKey((k) => k + 1)}
          >
            <RotateCcw size={16} /> Tentar de novo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center gap-2">
          <LogIn size={20} className="text-gray-400" />
          <h3>Tela de Entrada (Login)</h3>
        </div>
      </div>
      <div className="card-body">
        <form onSubmit={handleSave} className="config-form">
          <div className="input-group">
            <label className="input-label">URL do logo</label>
            <input
              type="url"
              className="input"
              placeholder="https://..."
              value={config.logo_url || ''}
              onChange={(e) => updateField('logo_url', e.target.value)}
            />
          </div>

          <div className="form-row">
            <div className="input-group">
              <label className="input-label toggle-label">
                <input
                  type="checkbox"
                  className="toggle"
                  checked={config.show_progress_bar}
                  onChange={(e) => updateField('show_progress_bar', e.target.checked)}
                />
                Exibir barra de progresso
              </label>
            </div>
            {config.show_progress_bar && (
              <div className="input-group">
                <label className="input-label">Cor da barra</label>
                <input
                  type="color"
                  className="input"
                  value={config.progress_bar_color}
                  onChange={(e) => updateField('progress_bar_color', e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="input-group">
            <label className="input-label">Texto do botão</label>
            <input
              type="text"
              className="input"
              value={config.button_text}
              onChange={(e) => updateField('button_text', e.target.value)}
            />
          </div>

          <h4 className="mt-4">Campos obrigatórios</h4>
          <div className="form-row">
            <label className="input-label toggle-label">
              <input
                type="checkbox"
                className="toggle"
                checked={config.require_name}
                onChange={(e) => updateField('require_name', e.target.checked)}
              />
              Nome obrigatório
            </label>
            <label className="input-label toggle-label">
              <input
                type="checkbox"
                className="toggle"
                checked={config.require_email}
                onChange={(e) => updateField('require_email', e.target.checked)}
              />
              E-mail obrigatório
            </label>
            <label className="input-label toggle-label">
              <input
                type="checkbox"
                className="toggle"
                checked={config.require_phone}
                onChange={(e) => updateField('require_phone', e.target.checked)}
              />
              WhatsApp obrigatório
            </label>
          </div>

          <h4 className="mt-4">Placeholders</h4>
          <div className="form-row">
            <input
              type="text"
              className="input"
              placeholder="Placeholder do nome"
              value={config.name_placeholder}
              onChange={(e) => updateField('name_placeholder', e.target.value)}
            />
            <input
              type="text"
              className="input"
              placeholder="Placeholder do e-mail"
              value={config.email_placeholder}
              onChange={(e) => updateField('email_placeholder', e.target.value)}
            />
            <input
              type="text"
              className="input"
              placeholder="Placeholder do WhatsApp"
              value={config.phone_placeholder}
              onChange={(e) => updateField('phone_placeholder', e.target.value)}
            />
          </div>

          {feedback && (
            <InlineAlert type={feedback.type} onClose={() => setFeedback(null)} className="mt-4">
              {feedback.text}
            </InlineAlert>
          )}

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="spinner spinner-sm" /> : <><Save size={16} /> Salvar</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
