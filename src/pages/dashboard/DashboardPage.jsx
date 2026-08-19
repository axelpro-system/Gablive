import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useWebinars } from '../../hooks/useWebinar';
import { useOrgWebinarStats } from '../../hooks/useAnalytics';
import { Video, Users, UserCheck, TrendingUp, Plus, ArrowRight, Calendar } from 'lucide-react';
import { WEBINAR_STATUS } from '../../lib/constants';
import { format } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';
import './DashboardPage.css';

export default function DashboardPage() {
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();
  const { webinars, loading } = useWebinars();
  const { rows: orgStats } = useOrgWebinarStats();

  const dateLocale = i18n.language === 'pt-BR' ? ptBR : enUS;

  const totalRegistrations = webinars.reduce(
    (sum, w) => sum + (w.registrations?.[0]?.count || 0),
    0
  );

  const totalAttendees = orgStats.reduce((sum, r) => sum + r.totalAttendees, 0);
  const avgConversion = totalRegistrations
    ? Math.round((totalAttendees / totalRegistrations) * 100)
    : 0;

  const upcomingWebinars = webinars.filter(
    (w) => w.status === WEBINAR_STATUS.SCHEDULED
  );

  const statusColors = {
    [WEBINAR_STATUS.DRAFT]: 'badge-gray',
    [WEBINAR_STATUS.SCHEDULED]: 'badge-primary',
    [WEBINAR_STATUS.LIVE]: 'badge-success',
    [WEBINAR_STATUS.ENDED]: 'badge-gray',
  };

  const stats = [
    {
      label: t('dashboard.totalWebinars'),
      value: webinars.length,
      icon: Video,
      color: 'var(--color-primary-500)',
    },
    {
      label: t('dashboard.totalRegistrations'),
      value: totalRegistrations,
      icon: Users,
      color: 'var(--color-success-500)',
    },
    {
      label: t('dashboard.totalAttendees'),
      value: totalAttendees,
      icon: UserCheck,
      color: 'var(--color-warning-500)',
    },
    {
      label: t('dashboard.avgConversion'),
      value: `${avgConversion}%`,
      icon: TrendingUp,
      color: 'var(--color-error-500)',
    },
  ];

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="page-header">
          <div className="skeleton" style={{ width: 200, height: 32 }} />
          <div className="skeleton" style={{ width: 140, height: 20 }} />
        </div>
        <div className="stats-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="stat-card">
              <div className="skeleton" style={{ width: '60%', height: 16, marginBottom: 8 }} />
              <div className="skeleton" style={{ width: '40%', height: 36 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <div>
          <h1>{t('dashboard.welcome', { name: profile?.display_name || '' })}</h1>
          <p className="page-subtitle">{t('dashboard.overview')}</p>
        </div>
        <Link to="/webinars/create" className="btn btn-primary">
          <Plus size={18} aria-hidden="true" />
          {t('webinar.createWebinar')}
        </Link>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        {stats.map((stat) => (
          <div key={stat.label} className="stat-card">
            <div className="stat-card-icon" style={{ color: stat.color }}>
              <stat.icon size={22} aria-hidden="true" />
            </div>
            <div>
              <p className="stat-card-label">{stat.label}</p>
              <p className="stat-card-value">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-grid">
        {/* Recent Webinars */}
        <div className="card">
          <div className="card-header">
            <div className="card-header-row">
              <h3>{t('dashboard.recentWebinars')}</h3>
              <Link to="/webinars" className="btn btn-ghost btn-sm">
                {t('common.all')}
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>
          </div>
          <div className="card-body card-body-flush">
            {webinars.length === 0 ? (
              <div className="empty-state">
                <Video size={40} className="empty-state-icon" />
                <p className="empty-state-title">{t('dashboard.noWebinarsYet')}</p>
                <p className="empty-state-description">{t('dashboard.createFirst')}</p>
                <Link to="/webinars/create" className="btn btn-primary">
                  <Plus size={18} />
                  {t('webinar.createWebinar')}
                </Link>
              </div>
            ) : (
              <div className="webinar-list-compact">
                {webinars.slice(0, 5).map((webinar) => (
                  <Link
                    key={webinar.id}
                    to={`/webinars/${webinar.id}`}
                    className="webinar-list-item"
                  >
                    <div className="webinar-list-info">
                      <h4 className="webinar-list-title">{webinar.title}</h4>
                      <div className="webinar-list-meta">
                        <span className={`badge ${statusColors[webinar.status]} badge-dot`}>
                          {t(`webinar.status${webinar.status.charAt(0).toUpperCase() + webinar.status.slice(1)}`)}
                        </span>
                        {webinar.scheduled_at && (
                          <span className="webinar-list-date">
                            <Calendar size={12} />
                            {format(new Date(webinar.scheduled_at), 'dd MMM yyyy, HH:mm', { locale: dateLocale })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="webinar-list-stat">
                      <Users size={14} />
                      <span>{webinar.registrations?.[0]?.count || 0}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Webinars */}
        <div className="card">
          <div className="card-header">
            <h3>{t('dashboard.upcomingWebinars')}</h3>
          </div>
          <div className="card-body card-body-flush">
            {upcomingWebinars.length === 0 ? (
              <div className="empty-state" style={{ padding: 'var(--space-8) var(--space-6)' }}>
                <Calendar size={36} className="empty-state-icon" />
                <p className="empty-state-description" style={{ marginBottom: 0 }}>
                  {t('dashboard.noWebinarsYet')}
                </p>
              </div>
            ) : (
              <div className="webinar-list-compact">
                {upcomingWebinars.map((webinar) => (
                  <Link
                    key={webinar.id}
                    to={`/webinars/${webinar.id}`}
                    className="webinar-list-item"
                  >
                    <div className="webinar-list-info">
                      <h4 className="webinar-list-title">{webinar.title}</h4>
                      {webinar.scheduled_at && (
                        <span className="webinar-list-date">
                          <Calendar size={12} />
                          {format(new Date(webinar.scheduled_at), 'dd MMM yyyy, HH:mm', { locale: dateLocale })}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
