import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSupabase } from '../../contexts/SupabaseContext';
import { useOrg } from '../../contexts/OrgContext';
import { Layout, Save, MonitorPlay } from 'lucide-react';
import { RECURRENCE_TYPE } from '../../lib/constants';
import { buildCinemaPath } from '../video/CinemaScreenVideo';
import './ConfigEditor.css';

const PRESENTATION_DEFAULTS = {
  enabled: false,
  shape: 'concave',
  curveV: 36,    // % da altura
  curveH: 0,     // % da largura
  corner: 24,    // px
  shadow: true,
  vignette: 65,  // 0–100
  vignetteColor: 'rgba(0, 0, 0, 0.85)',
  controls: true,
};

const getPresentation = (webinar) => ({
  ...PRESENTATION_DEFAULTS,
  ...(webinar?.settings?.presentation || {}),
});

/** Preview estático ao vivo usando a MESMA geometria do player real. */
function CinemaPreview({ presentation }) {
  // Mesma proporção 16:9; path recalcula a cada splash de estado.
  const w = 480;
  const h = 270;
  const clipPath = buildCinemaPath(
    w,
    h,
    presentation.shape,
    (Math.min(presentation.curveV, 100) / 100) * h,
    (Math.min(presentation.curveH, 100) / 100) * w,
    presentation.corner,
  );
  const vignetteStyle = {
    opacity: Math.max(0, Math.min(100, presentation.vignette)) / 100,
    background: `radial-gradient(120% 120% at 50% 50%, transparent 52%, ${presentation.vignetteColor} 100%)`,
  };

  return (
    <div className="cinema-preview" aria-hidden="true">
      <div
        className="cinema-preview__frame"
        style={{
          clipPath: `path('${clipPath}')`,
          WebkitClipPath: `path('${clipPath}')`,
          filter: presentation.shadow ? 'drop-shadow(0 16px 36px rgba(0, 0, 0, 0.5))' : undefined,
        }}
      >
        <div className="cinema-preview__stage" />
        <div className="cinema-video__vignette" style={vignetteStyle} />
      </div>
    </div>
  );
}

/**
 * Editor de configurações básicas do webinário.
 * Extraído do EditWebinarPage para reduzir acoplamento.
 *
 * @param {{ webinar: object, setWebinar: Function, id: string }} props
 */
export default function ConfigEditor({ webinar, setWebinar, id }) {
  const { t } = useTranslation();
  const supabase = useSupabase();
  const { orgId } = useOrg();

  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState([]);

  useEffect(() => {
    if (!orgId) return;
    const fetchTemplates = async () => {
      const { data } = await supabase
        .from('page_templates')
        .select('id, name, type, subtype')
        .eq('org_id', orgId)
        .order('name');
      if (data) setTemplates(data);
    };
    fetchTemplates();
  }, [orgId, supabase]);

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    const needsSessionClock = webinar.is_just_in_time
      && webinar.recurrence_type
      && webinar.recurrence_type !== RECURRENCE_TYPE.NONE;
    if (needsSessionClock && !webinar.scheduled_at) {
      alert('Informe o horário das sessões diárias ou semanais.');
      return;
    }
    setSaving(true);

    const { error } = await supabase
      .from('webinars')
      .update({
        title: webinar.title,
        description: webinar.description,
        video_url: webinar.video_url,
        scheduled_at: webinar.scheduled_at,
        replay_enabled: webinar.replay_enabled,
        replay_expires_hours: webinar.replay_expires_hours,
        presenter_name: webinar.presenter_name,
        is_just_in_time: webinar.is_just_in_time,
        use_wait_room: webinar.use_wait_room,
        recurrence_type: webinar.recurrence_type,
        session_duration_minutes: webinar.session_duration_minutes,
        capacity: webinar.capacity ? parseInt(webinar.capacity, 10) : null,
        registration_page_template_id: webinar.registration_page_template_id || null,
        wait_page_template_id: webinar.wait_page_template_id || null,
        ai_agent_enabled: webinar.ai_agent_enabled || false,
        ai_agent_prompt: webinar.ai_agent_prompt || null,
        settings: webinar.settings || {},
      })
      .eq('id', id);

    setSaving(false);
    if (!error) {
      alert(t('common.saved'));
    }
  };

  /** Atualiza apenas a subconfiguração de apresentação (settings.presentation). */
  const updatePresentation = (patch) => {
    const current = getPresentation(webinar);
    setWebinar({
      ...webinar,
      settings: {
        ...(webinar.settings || {}),
        presentation: { ...current, ...patch },
      },
    });
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3>Configurações Básicas</h3>
      </div>
      <div className="card-body">
        <form onSubmit={handleSaveConfig} className="config-form">
          <div className="input-group">
            <label className="input-label">Título</label>
            <input
              type="text" className="input"
              value={webinar.title || ''}
              onChange={e => setWebinar({ ...webinar, title: e.target.value })}
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label">Descrição</label>
            <textarea className="input textarea" rows={3}
              value={webinar.description || ''}
              onChange={e => setWebinar({ ...webinar, description: e.target.value })}
            />
          </div>

          <div className="input-group">
            <label className="input-label">URL do Vídeo (YouTube/Vimeo)</label>
            <input type="url" className="input"
              value={webinar.video_url || ''}
              onChange={e => setWebinar({ ...webinar, video_url: e.target.value })}
            />
          </div>

          <div className="card" style={{ marginTop: 20, padding: 16, background: 'var(--color-gray-50)', marginBottom: 20 }}>
            <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <MonitorPlay size={16} style={{ color: 'var(--color-primary-500)' }} />
              Tela de Cinema
            </h4>

            <div className="input-group">
              <label className="input-label toggle-label">
                <input type="checkbox" className="toggle"
                  checked={getPresentation(webinar).enabled}
                  onChange={e => updatePresentation({ enabled: e.target.checked })}
                />
                Exibir vídeo em tela de cinema (bordas curvas)
              </label>
            </div>

            {getPresentation(webinar).enabled && (
              <>
                <CinemaPreview presentation={getPresentation(webinar)} />

                <div className="input-group">
                  <label className="input-label">Formato da curvatura</label>
                  <select className="input select"
                    value={getPresentation(webinar).shape}
                    onChange={e => updatePresentation({ shape: e.target.value })}
                  >
                    <option value="concave">Côncavo (curva para dentro)</option>
                    <option value="convex">Convexo (curva para fora)</option>
                  </select>
                </div>

                <div className="input-group">
                  <label className="input-label">
                    Curvatura vertical: {getPresentation(webinar).curveV}%
                  </label>
                  <input type="range" className="input range"
                    min={0} max={60} step={1}
                    value={getPresentation(webinar).curveV}
                    onChange={e => updatePresentation({ curveV: parseInt(e.target.value, 10) })}
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">
                    Curvatura horizontal: {getPresentation(webinar).curveH}%
                  </label>
                  <input type="range" className="input range"
                    min={0} max={60} step={1}
                    value={getPresentation(webinar).curveH}
                    onChange={e => updatePresentation({ curveH: parseInt(e.target.value, 10) })}
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">
                    Raio dos cantos: {getPresentation(webinar).corner}px
                  </label>
                  <input type="range" className="input range"
                    min={0} max={48} step={2}
                    value={getPresentation(webinar).corner}
                    onChange={e => updatePresentation({ corner: parseInt(e.target.value, 10) })}
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">
                    Vinheta (escurecer bordas): {getPresentation(webinar).vignette}%
                  </label>
                  <input type="range" className="input range"
                    min={0} max={100} step={5}
                    value={getPresentation(webinar).vignette}
                    onChange={e => updatePresentation({ vignette: parseInt(e.target.value, 10) })}
                  />
                </div>

                <div className="input-group">
                  <label className="input-label toggle-label">
                    <input type="checkbox" className="toggle"
                      checked={getPresentation(webinar).shadow}
                      onChange={e => updatePresentation({ shadow: e.target.checked })}
                    />
                    Sombra abaixo da tela
                  </label>
                </div>
              </>
            )}
          </div>

          <div className="input-group">
            <label className="input-label">Nome do apresentador</label>
            <input type="text" className="input"
              value={webinar.presenter_name || ''}
              onChange={e => setWebinar({ ...webinar, presenter_name: e.target.value })}
            />
          </div>

          <div className="input-group">
            <label className="input-label toggle-label">
              <input type="checkbox" className="toggle"
                checked={webinar.is_just_in_time || false}
                onChange={e => setWebinar({ ...webinar, is_just_in_time: e.target.checked })}
              />
              Just in Time (evergreen — inicia na entrada do lead)
            </label>
          </div>

          {(!webinar.is_just_in_time || (webinar.recurrence_type && webinar.recurrence_type !== RECURRENCE_TYPE.NONE)) && (
            <div className="form-row">
              <div className="input-group">
                <label className="input-label">{webinar.is_just_in_time ? 'Horário das sessões' : 'Data e Hora'}</label>
                <input type="datetime-local" className="input"
                  value={webinar.scheduled_at ? new Date(webinar.scheduled_at).toISOString().slice(0, 16) : ''}
                  onChange={e => setWebinar({ ...webinar, scheduled_at: new Date(e.target.value).toISOString() })}
                />
              </div>
            </div>
          )}

          {webinar.is_just_in_time && (
            <div className="form-row">
              <div className="input-group">
                <label className="input-label">Recorrência das sessões</label>
                <select className="input select"
                  value={webinar.recurrence_type || RECURRENCE_TYPE.NONE}
                  onChange={e => setWebinar({ ...webinar, recurrence_type: e.target.value })}
                >
                  <option value={RECURRENCE_TYPE.NONE}>Sempre disponível</option>
                  <option value={RECURRENCE_TYPE.DAILY}>Sessões diárias</option>
                  <option value={RECURRENCE_TYPE.WEEKLY}>Sessões semanais</option>
                </select>
                <p className="input-hint">
                  {(webinar.recurrence_type || RECURRENCE_TYPE.NONE) === RECURRENCE_TYPE.NONE
                    ? 'Cada lead começa a sessão na hora em que entra.'
                    : 'O lead espera o próximo horário e assiste a sessão desde o início.'}
                </p>
              </div>
              <div className="input-group">
                <label className="input-label">Duração da sessão (min)</label>
                <input type="number" className="input" min={1}
                  value={webinar.session_duration_minutes || 60}
                  onChange={e => setWebinar({ ...webinar, session_duration_minutes: parseInt(e.target.value, 10) || 60 })}
                />
                <p className="input-hint">Depois desse tempo a sessão termina.</p>
              </div>
            </div>
          )}

          <div className="input-group">
            <label className="input-label toggle-label">
              <input type="checkbox" className="toggle"
                checked={webinar.use_wait_room || false}
                onChange={e => setWebinar({ ...webinar, use_wait_room: e.target.checked })}
              />
              Usar sala de espera antes do início
            </label>
          </div>

          <div className="input-group">
            <label className="input-label">Capacidade máxima (opcional)</label>
            <input
              type="number"
              className="input"
              min={1}
              placeholder="Deixe em branco para ilimitado"
              value={webinar.capacity ?? ''}
              onChange={(e) => setWebinar({
                ...webinar,
                capacity: e.target.value ? parseInt(e.target.value, 10) : null,
              })}
            />
            <p className="input-hint">Quando encher, novas inscrições entram na lista de espera e não acessam a sala.</p>
          </div>

          <div className="form-row">
            <div className="input-group">
              <label className="input-label toggle-label">
                <input type="checkbox" className="toggle"
                  checked={webinar.replay_enabled}
                  onChange={e => setWebinar({ ...webinar, replay_enabled: e.target.checked })}
                />
                Habilitar Replay
              </label>
            </div>
            {webinar.replay_enabled && (
              <div className="input-group">
                <label className="input-label">Expiração (horas)</label>
                <input type="number" className="input"
                  value={webinar.replay_expires_hours || 48}
                  onChange={e => setWebinar({ ...webinar, replay_expires_hours: parseInt(e.target.value, 10) })}
                />
              </div>
            )}
          </div>

          <div className="card" style={{ marginTop: 20, padding: 16, background: 'var(--color-gray-50)', marginBottom: 20 }}>
            <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              Assistente de IA (Gemini)
            </h4>
            <div className="input-group">
              <label className="input-label toggle-label">
                <input type="checkbox" className="toggle"
                  checked={webinar.ai_agent_enabled || false}
                  onChange={e => setWebinar({ ...webinar, ai_agent_enabled: e.target.checked })}
                />
                Ativar agente de IA no chat ao vivo
              </label>
            </div>
            {webinar.ai_agent_enabled && (
              <div className="input-group">
                <label className="input-label">Prompt (Instruções do Agente)</label>
                <textarea className="input textarea" rows={4}
                  value={webinar.ai_agent_prompt || ''}
                  placeholder="Ex: Você é o suporte oficial. Responda dúvidas curtas sobre o webinar de forma educada."
                  onChange={e => setWebinar({ ...webinar, ai_agent_prompt: e.target.value })}
                />
              </div>
            )}
          </div>

          {templates.length > 0 && (
            <div className="card" style={{ marginTop: 20, padding: 16, background: 'var(--color-gray-50)' }}>
              <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Layout size={16} style={{ color: 'var(--color-primary-500)' }} />
                Templates de Página
              </h4>
              <div className="form-row">
                <div className="input-group">
                  <label className="input-label">Template de Registro</label>
                  <select className="input select"
                    value={webinar.registration_page_template_id || ''}
                    onChange={e => setWebinar({ ...webinar, registration_page_template_id: e.target.value || null })}
                  >
                    <option value="">Personalizado (editor abaixo)</option>
                    {templates.filter(t => t.type === 'registration').map(tpl => (
                      <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
                    ))}
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Template da Sala de Espera</label>
                  <select className="input select"
                    value={webinar.wait_page_template_id || ''}
                    onChange={e => setWebinar({ ...webinar, wait_page_template_id: e.target.value || null })}
                  >
                    <option value="">Padrão do sistema</option>
                    {templates.filter(t => t.type === 'wait').map(tpl => (
                      <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
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