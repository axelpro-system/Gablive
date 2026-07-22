import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { useOrg } from '../../contexts/OrgContext';
import { ArrowLeft, Settings, Layout, MessageSquare, Mail, BarChart3, Save, ExternalLink, LogIn } from 'lucide-react';
import RegistrationEditor from '../../components/editor/RegistrationEditor';
import InteractionsEditor from '../../components/editor/InteractionsEditor';
import EmailsEditor from '../../components/editor/EmailsEditor';
import AnalyticsDashboard from '../../components/editor/AnalyticsDashboard';
import LoginCustomizationEditor from '../../components/editor/LoginCustomizationEditor';
import { RECURRENCE_TYPE } from '../../lib/constants';
import './EditWebinarPage.css';

export default function EditWebinarPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const { orgId } = useOrg();
  const navigate = useNavigate();

  const [webinar, setWebinar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('config');
  const [templates, setTemplates] = useState([]);

  useEffect(() => {
    const fetch = async () => {
      const { data, error } = await supabase
        .from('webinars')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        console.error(error);
        navigate('/webinars');
        return;
      }
      
      setWebinar(data);
      setLoading(false);
    };
    
    fetch();
  }, [id, navigate]);

  // Fetch page templates for the org
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
  }, [orgId]);

  const handleSaveConfig = async (e) => {
    e.preventDefault();
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
        registration_page_template_id: webinar.registration_page_template_id || null,
        wait_page_template_id: webinar.wait_page_template_id || null,
      })
      .eq('id', id);
      
    setSaving(false);
    if (!error) {
      alert(t('common.saved'));
    }
  };

  if (loading) {
    return (
      <div className="edit-page-loading">
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  const tabs = [
    { id: 'config', label: 'Configuração', icon: Settings },
    { id: 'registration', label: 'Página de Registro', icon: Layout },
    { id: 'login', label: 'Tela de Entrada', icon: LogIn },
    { id: 'interactions', label: 'Interações (Chat, Oferta, Vendas)', icon: MessageSquare },
    { id: 'emails', label: 'E-mails', icon: Mail },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  return (
    <div className="edit-webinar-page">
      <div className="page-header">
        <div className="header-left">
          <button className="btn btn-ghost" onClick={() => navigate('/webinars')}>
            <ArrowLeft size={18} />
            {t('common.back')}
          </button>
          <div className="header-titles">
            <h1>{webinar.title}</h1>
            <p className="page-subtitle">Editando webinário</p>
          </div>
        </div>
        <div className="header-actions">
          <Link to={`/register/${webinar.slug}`} target="_blank" className="btn btn-secondary">
            <ExternalLink size={16} />
            Ver Página
          </Link>
          <Link to={`/room/${webinar.slug}`} target="_blank" className="btn btn-secondary">
            <ExternalLink size={16} />
            Ver Sala
          </Link>
        </div>
      </div>

      <div className="edit-layout">
        {/* Sidebar Tabs */}
        <div className="edit-sidebar">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`edit-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="edit-content">
          {activeTab === 'config' && (
            <div className="card">
              <div className="card-header">
                <h3>Configurações Básicas</h3>
              </div>
              <div className="card-body">
                <form onSubmit={handleSaveConfig} className="config-form">
                  <div className="input-group">
                    <label className="input-label">Título</label>
                    <input 
                      type="text" 
                      className="input" 
                      value={webinar.title || ''}
                      onChange={e => setWebinar({...webinar, title: e.target.value})}
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Descrição</label>
                    <textarea 
                      className="input textarea" 
                      value={webinar.description || ''}
                      onChange={e => setWebinar({...webinar, description: e.target.value})}
                      rows={3}
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">URL do Vídeo (YouTube/Vimeo)</label>
                    <input 
                      type="url" 
                      className="input" 
                      value={webinar.video_url || ''}
                      onChange={e => setWebinar({...webinar, video_url: e.target.value})}
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Nome do apresentador</label>
                    <input
                      type="text"
                      className="input"
                      value={webinar.presenter_name || ''}
                      onChange={e => setWebinar({...webinar, presenter_name: e.target.value})}
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label toggle-label">
                      <input
                        type="checkbox"
                        className="toggle"
                        checked={webinar.is_just_in_time || false}
                        onChange={(e) => setWebinar({...webinar, is_just_in_time: e.target.checked})}
                      />
                      Just in Time (evergreen — inicia na entrada do lead)
                    </label>
                  </div>
                  {!webinar.is_just_in_time && (
                    <div className="form-row">
                      <div className="input-group">
                        <label className="input-label">Data e Hora</label>
                        <input
                          type="datetime-local"
                          className="input"
                          value={webinar.scheduled_at ? new Date(webinar.scheduled_at).toISOString().slice(0, 16) : ''}
                          onChange={e => setWebinar({...webinar, scheduled_at: new Date(e.target.value).toISOString()})}
                        />
                      </div>
                    </div>
                  )}
                  {webinar.is_just_in_time && (
                    <div className="form-row">
                      <div className="input-group">
                        <label className="input-label">Recorrência das sessões</label>
                        <select
                          className="input select"
                          value={webinar.recurrence_type || RECURRENCE_TYPE.NONE}
                          onChange={e => setWebinar({...webinar, recurrence_type: e.target.value})}
                        >
                          <option value={RECURRENCE_TYPE.NONE}>Sempre disponível</option>
                          <option value={RECURRENCE_TYPE.DAILY}>Sessões diárias</option>
                          <option value={RECURRENCE_TYPE.WEEKLY}>Sessões semanais</option>
                        </select>
                      </div>
                      <div className="input-group">
                        <label className="input-label">Duração da sessão (min)</label>
                        <input
                          type="number"
                          className="input"
                          min={1}
                          value={webinar.session_duration_minutes || 60}
                          onChange={e => setWebinar({...webinar, session_duration_minutes: parseInt(e.target.value, 10) || 60})}
                        />
                      </div>
                    </div>
                  )}
                  <div className="input-group">
                    <label className="input-label toggle-label">
                      <input
                        type="checkbox"
                        className="toggle"
                        checked={webinar.use_wait_room || false}
                        onChange={(e) => setWebinar({...webinar, use_wait_room: e.target.checked})}
                      />
                      Usar sala de espera antes do início
                    </label>
                  </div>
                  <div className="form-row">
                    <div className="input-group">
                      <label className="input-label toggle-label">
                        <input
                          type="checkbox"
                          className="toggle"
                          checked={webinar.replay_enabled}
                          onChange={(e) => setWebinar({...webinar, replay_enabled: e.target.checked})}
                        />
                        Habilitar Replay
                      </label>
                    </div>
                    {webinar.replay_enabled && (
                      <div className="input-group">
                        <label className="input-label">Expiração (horas)</label>
                        <input 
                          type="number" 
                          className="input" 
                          value={webinar.replay_expires_hours || 48}
                          onChange={e => setWebinar({...webinar, replay_expires_hours: parseInt(e.target.value, 10)})}
                        />
                      </div>
                    )}
                  </div>

                  {/* Template Selector */}
                  {templates.length > 0 && (
                    <div className="card" style={{ marginTop: 20, padding: 16, background: 'var(--color-gray-50)' }}>
                      <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Layout size={16} style={{ color: 'var(--color-primary-500)' }} />
                        Templates de Página
                      </h4>
                      <div className="form-row">
                        <div className="input-group">
                          <label className="input-label">Template de Registro</label>
                          <select
                            className="input select"
                            value={webinar.registration_page_template_id || ''}
                            onChange={e => setWebinar({...webinar, registration_page_template_id: e.target.value || null})}
                          >
                            <option value="">Personalizado (editor abaixo)</option>
                            {templates.filter(t => t.type === 'registration').map(tpl => (
                              <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="input-group">
                          <label className="input-label">Template da Sala de Espera</label>
                          <select
                            className="input select"
                            value={webinar.wait_page_template_id || ''}
                            onChange={e => setWebinar({...webinar, wait_page_template_id: e.target.value || null})}
                          >
                            <option value="">Padrão do sistema</option>
                            {templates.filter(t => t.type === 'wait').map(tpl => (
                              <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      {templates.length === 0 && (
                        <p style={{ fontSize: 12, color: 'var(--color-gray-500)' }}>
                          Nenhum template disponível. Crie templates na seção Templates.
                        </p>
                      )}
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
          )}

          {activeTab === 'registration' && (
            <RegistrationEditor webinarId={webinar.id} />
          )}

          {activeTab === 'login' && (
            <LoginCustomizationEditor webinarId={webinar.id} />
          )}

          {activeTab === 'interactions' && (
            <InteractionsEditor webinarId={webinar.id} />
          )}

          {activeTab === 'emails' && (
            <EmailsEditor webinarId={webinar.id} />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsDashboard webinarId={webinar.id} />
          )}
        </div>
      </div>
    </div>
  );
}
