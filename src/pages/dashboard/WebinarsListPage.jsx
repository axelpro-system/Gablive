import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useWebinars } from '../../hooks/useWebinar';
import { useOrg } from '../../contexts/OrgContext';
import { useAuth } from '../../contexts/AuthContext';
import DeleteWebinarDialog from '../../components/webinars/DeleteWebinarDialog';
import { WEBINAR_STATUS, WEBINAR_TYPE } from '../../lib/constants';
import { format } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';
import {
  Plus,
  Video,
  Radio,
  Calendar,
  Users,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Copy,
  BarChart3,
  Files,
  Archive,
  ArchiveRestore,
  Star,
  StarOff,
} from 'lucide-react';
import { useState } from 'react';
import './WebinarsListPage.css';

const VIEWS = [
  { id: 'active', label: 'Ativos' },
  { id: 'templates', label: 'Templates' },
  { id: 'archived', label: 'Arquivados' },
];

export default function WebinarsListPage() {
  const { t, i18n } = useTranslation();
  const [view, setView] = useState('active');
  const { webinars, loading, refetch, archiveWebinar, setTemplate, duplicateWebinar } = useWebinars({ view });
  const { orgId } = useOrg();
  const { user } = useAuth();
  const [openMenu, setOpenMenu] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [busyAction, setBusyAction] = useState(null);

  const dateLocale = i18n.language === 'pt-BR' ? ptBR : enUS;

  const statusConfig = {
    [WEBINAR_STATUS.DRAFT]: { class: 'badge-gray', icon: null },
    [WEBINAR_STATUS.SCHEDULED]: { class: 'badge-primary', icon: Calendar },
    [WEBINAR_STATUS.LIVE]: { class: 'badge-success', icon: Radio },
    [WEBINAR_STATUS.ENDED]: { class: 'badge-gray', icon: null },
  };

  const handleDeleted = () => {
    setDeleteTarget(null);
    refetch();
  };

  const copyRegistrationLink = (slug) => {
    const url = `${window.location.origin}/register/${slug}`;
    navigator.clipboard.writeText(url);
    setOpenMenu(null);
  };

  const handleDuplicate = async (webinar) => {
    setOpenMenu(null);
    setBusyAction(webinar.id);
    try {
      await duplicateWebinar(webinar.id);
    } catch {
      // Erro já é reportado via console pelo cliente Supabase; refetch mantém a lista consistente.
    } finally {
      setBusyAction(null);
    }
  };

  const handleToggleArchive = async (webinar) => {
    setOpenMenu(null);
    setBusyAction(webinar.id);
    try {
      await archiveWebinar(webinar.id, !webinar.archived_at);
    } finally {
      setBusyAction(null);
    }
  };

  const handleToggleTemplate = async (webinar) => {
    setOpenMenu(null);
    setBusyAction(webinar.id);
    try {
      await setTemplate(webinar.id, !webinar.is_template);
    } finally {
      setBusyAction(null);
    }
  };

  if (loading) {
    return (
      <div className="webinars-page">
        <div className="page-header">
          <div className="skeleton" style={{ width: 160, height: 32 }} />
        </div>
        <div className="webinars-grid">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card">
              <div className="card-body">
                <div className="skeleton" style={{ width: '80%', height: 24, marginBottom: 12 }} />
                <div className="skeleton" style={{ width: '50%', height: 16, marginBottom: 8 }} />
                <div className="skeleton" style={{ width: '30%', height: 16 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="webinars-page">
      <div className="page-header">
        <div>
          <h1>{t('webinar.webinars')}</h1>
          <p className="page-subtitle">
            {webinars.length} webinár{webinars.length !== 1 ? 'ios' : 'io'}
          </p>
        </div>
        <Link to="/webinars/create" className="btn btn-create">
          <Plus size={18} />
          {t('webinar.createWebinar')}
        </Link>
      </div>

      <div className="webinars-view-tabs">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            className={`webinars-view-tab ${view === v.id ? 'active' : ''}`}
            onClick={() => setView(v.id)}
          >
            {v.label}
          </button>
        ))}
      </div>

      {webinars.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <Video size={48} className="empty-state-icon" />
            <p className="empty-state-title">
              {view === 'active' ? t('dashboard.noWebinarsYet') : `Nenhum webinário ${view === 'templates' ? 'marcado como template' : 'arquivado'}.`}
            </p>
            {view === 'active' && <p className="empty-state-description">{t('dashboard.createFirst')}</p>}
            {view === 'active' && (
              <Link to="/webinars/create" className="btn btn-create">
                <Plus size={18} />
                {t('webinar.createWebinar')}
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="webinars-grid">
          {webinars.map((webinar) => {
            const status = statusConfig[webinar.status];
            const StatusIcon = status?.icon;

            return (
              <div key={webinar.id} className="card webinar-card">
                <div className="card-body">
                  <div className="webinar-card-header">
                    <div className="webinar-card-badges">
                      <span className={`badge ${status.class} badge-dot`}>
                        {StatusIcon && <StatusIcon size={10} />}
                        {t(`webinar.status${webinar.status.charAt(0).toUpperCase() + webinar.status.slice(1)}`)}
                      </span>
                      <span className={`badge ${webinar.is_just_in_time ? 'badge-dark' : 'badge-brand'}`}>
                        {webinar.is_just_in_time ? 'Just In Time' : 'Único'}
                      </span>
                      <span className="badge badge-gray">
                        {webinar.type === WEBINAR_TYPE.LIVE
                          ? t('webinar.typeLive')
                          : t('webinar.typeRecorded')}
                      </span>
                      {webinar.is_template && (
                        <span className="badge badge-warning">
                          <Star size={10} /> Template
                        </span>
                      )}
                      {webinar.archived_at && (
                        <span className="badge badge-gray">
                          <Archive size={10} /> Arquivado
                        </span>
                      )}
                    </div>

                    <div className="dropdown">
                      <button
                        className="btn btn-ghost btn-icon btn-xs"
                        onClick={() => setOpenMenu(openMenu === webinar.id ? null : webinar.id)}
                      >
                        <MoreVertical size={16} />
                      </button>
                      {openMenu === webinar.id && (
                        <div className="dropdown-menu">
                          <Link
                            to={`/webinars/${webinar.id}`}
                            className="dropdown-item"
                            onClick={() => setOpenMenu(null)}
                          >
                            <Edit size={16} />
                            {t('common.edit')}
                          </Link>
                          <button
                            className="dropdown-item"
                            onClick={() => copyRegistrationLink(webinar.slug)}
                          >
                            <Copy size={16} />
                            {t('webinar.copyLink')}
                          </button>
                          <Link
                            to={`/register/${webinar.slug}`}
                            target="_blank"
                            className="dropdown-item"
                            onClick={() => setOpenMenu(null)}
                          >
                            <Eye size={16} />
                            {t('common.preview')}
                          </Link>
                          <Link
                            to={`/analytics?webinar=${webinar.id}`}
                            className="dropdown-item"
                            onClick={() => setOpenMenu(null)}
                          >
                            <BarChart3 size={16} />
                            {t('analytics.title')}
                          </Link>
                          <div className="dropdown-divider" />
                          <button
                            className="dropdown-item"
                            disabled={busyAction === webinar.id}
                            onClick={() => handleDuplicate(webinar)}
                          >
                            <Files size={16} />
                            Duplicar
                          </button>
                          <button
                            className="dropdown-item"
                            disabled={busyAction === webinar.id}
                            onClick={() => handleToggleTemplate(webinar)}
                          >
                            {webinar.is_template ? <StarOff size={16} /> : <Star size={16} />}
                            {webinar.is_template ? 'Remover de templates' : 'Marcar como template'}
                          </button>
                          <button
                            className="dropdown-item"
                            disabled={busyAction === webinar.id}
                            onClick={() => handleToggleArchive(webinar)}
                          >
                            {webinar.archived_at ? <ArchiveRestore size={16} /> : <Archive size={16} />}
                            {webinar.archived_at ? 'Desarquivar' : 'Arquivar'}
                          </button>
                          <div className="dropdown-divider" />
                          <button
                            className="dropdown-item danger"
                            onClick={() => { setDeleteTarget(webinar); setOpenMenu(null); }}
                          >
                            <Trash2 size={16} />
                            {t('common.delete')}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <Link to={`/webinars/${webinar.id}`} className="webinar-card-link">
                    <h3 className="webinar-card-title">{webinar.title}</h3>
                  </Link>

                  {webinar.description && (
                    <p className="webinar-card-description">{webinar.description}</p>
                  )}

                  <div className="webinar-card-meta">
                    {webinar.scheduled_at && (
                      <span className="webinar-card-meta-item">
                        <Calendar size={14} />
                        {format(new Date(webinar.scheduled_at), 'dd MMM yyyy, HH:mm', { locale: dateLocale })}
                      </span>
                    )}
                    <span className="webinar-card-meta-item">
                      <Users size={14} />
                      {webinar.registrations?.[0]?.count || 0} {t('webinar.registrations').toLowerCase()}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {deleteTarget && (
        <DeleteWebinarDialog
          webinar={deleteTarget}
          orgId={orgId}
          userId={user?.id}
          onClose={() => setDeleteTarget(null)}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}
