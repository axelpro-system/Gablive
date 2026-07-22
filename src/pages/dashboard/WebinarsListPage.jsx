import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useWebinars } from '../../hooks/useWebinar';
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
} from 'lucide-react';
import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import './WebinarsListPage.css';

export default function WebinarsListPage() {
  const { t, i18n } = useTranslation();
  const { webinars, loading, refetch } = useWebinars();
  const [openMenu, setOpenMenu] = useState(null);

  const dateLocale = i18n.language === 'pt-BR' ? ptBR : enUS;

  const statusConfig = {
    [WEBINAR_STATUS.DRAFT]: { class: 'badge-gray', icon: null },
    [WEBINAR_STATUS.SCHEDULED]: { class: 'badge-primary', icon: Calendar },
    [WEBINAR_STATUS.LIVE]: { class: 'badge-success', icon: Radio },
    [WEBINAR_STATUS.ENDED]: { class: 'badge-gray', icon: null },
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('webinar.deleteConfirm'))) return;
    await supabase.from('webinars').delete().eq('id', id);
    refetch();
  };

  const copyRegistrationLink = (slug) => {
    const url = `${window.location.origin}/register/${slug}`;
    navigator.clipboard.writeText(url);
    setOpenMenu(null);
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

      {webinars.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <Video size={48} className="empty-state-icon" />
            <p className="empty-state-title">{t('dashboard.noWebinarsYet')}</p>
            <p className="empty-state-description">{t('dashboard.createFirst')}</p>
            <Link to="/webinars/create" className="btn btn-create">
              <Plus size={18} />
              {t('webinar.createWebinar')}
            </Link>
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
                            to={`/analytics/${webinar.id}`}
                            className="dropdown-item"
                            onClick={() => setOpenMenu(null)}
                          >
                            <BarChart3 size={16} />
                            {t('analytics.title')}
                          </Link>
                          <div className="dropdown-divider" />
                          <button
                            className="dropdown-item danger"
                            onClick={() => { handleDelete(webinar.id); setOpenMenu(null); }}
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
    </div>
  );
}
