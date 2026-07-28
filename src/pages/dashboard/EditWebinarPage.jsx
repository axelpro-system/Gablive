import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSupabase } from '../../contexts/SupabaseContext';
import { useOrg } from '../../contexts/OrgContext';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, Settings, Layout, MessageSquare, Mail, BarChart3, ExternalLink, LogIn, Radio, Calendar, Trash2 } from 'lucide-react';
import ConfigEditor from '../../components/editor/ConfigEditor';
import RegistrationEditor from '../../components/editor/RegistrationEditor';
import InteractionsEditor from '../../components/editor/InteractionsEditor';
import EmailsEditor from '../../components/editor/EmailsEditor';
import AnalyticsDashboard from '../../components/editor/AnalyticsDashboard';
import LoginCustomizationEditor from '../../components/editor/LoginCustomizationEditor';
import WebinarStatusControl from '../../components/editor/WebinarStatusControl';
import DeleteWebinarDialog from '../../components/webinars/DeleteWebinarDialog';
import { WEBINAR_STATUS } from '../../lib/constants';
import './EditWebinarPage.css';

const STATUS_BADGE = {
  [WEBINAR_STATUS.DRAFT]: { class: 'badge-gray', icon: null },
  [WEBINAR_STATUS.SCHEDULED]: { class: 'badge-primary', icon: Calendar },
  [WEBINAR_STATUS.LIVE]: { class: 'badge-success', icon: Radio },
  [WEBINAR_STATUS.ENDED]: { class: 'badge-gray', icon: null },
};

export default function EditWebinarPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const supabase = useSupabase();
  const { orgId } = useOrg();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [webinar, setWebinar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('config');
  const [showDelete, setShowDelete] = useState(false);

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
  }, [id, navigate, supabase]);

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
            <h1>
              {webinar.title}
              {(() => {
                const badge = STATUS_BADGE[webinar.status] || STATUS_BADGE[WEBINAR_STATUS.DRAFT];
                const BadgeIcon = badge.icon;
                return (
                  <span
                    className={`badge ${badge.class} badge-dot`}
                    style={{ marginLeft: 12, verticalAlign: 'middle' }}
                  >
                    {BadgeIcon && <BadgeIcon size={10} />}
                    {t(`webinar.status${webinar.status.charAt(0).toUpperCase() + webinar.status.slice(1)}`)}
                  </span>
                );
              })()}
            </h1>
            <p className="page-subtitle">Editando webinário</p>
          </div>
        </div>
        <div className="header-actions">
          <WebinarStatusControl
            webinar={webinar}
            orgId={orgId}
            userId={user?.id}
            onStatusChange={(updated) => setWebinar((prev) => ({ ...prev, ...updated }))}
          />
          <Link to={`/register/${webinar.slug}`} target="_blank" className="btn btn-secondary">
            <ExternalLink size={16} /> Ver Página
          </Link>
          <Link to={`/room/${webinar.slug}`} target="_blank" className="btn btn-secondary">
            <ExternalLink size={16} /> Ver Sala
          </Link>
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => setShowDelete(true)}
          >
            <Trash2 size={16} /> {t('common.delete')}
          </button>
        </div>
      </div>

      {showDelete && (
        <DeleteWebinarDialog
          webinar={webinar}
          orgId={orgId}
          userId={user?.id}
          onClose={() => setShowDelete(false)}
          onDeleted={() => navigate('/webinars')}
        />
      )}

      <div className="edit-layout">
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

        <div className="edit-content">
          {activeTab === 'config' && (
            <ConfigEditor webinar={webinar} setWebinar={setWebinar} id={id} />
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