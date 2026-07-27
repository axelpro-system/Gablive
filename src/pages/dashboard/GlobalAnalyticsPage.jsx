import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useOrgWebinarStats } from '../../hooks/useAnalytics';
import { Users, MousePointer2, CheckCircle2, TrendingUp, Filter } from 'lucide-react';
import './DashboardPage.css';

export default function GlobalAnalyticsPage() {
  const { t } = useTranslation();
  const { rows, loading, error } = useOrgWebinarStats();
  const [searchParams] = useSearchParams();
  const [selectedWebinarId, setSelectedWebinarId] = useState(
    () => searchParams.get('webinar') || 'all'
  );

  const filteredRows = useMemo(() => {
    if (selectedWebinarId === 'all') return rows;
    return rows.filter((r) => r.id === selectedWebinarId);
  }, [rows, selectedWebinarId]);

  const globalStats = useMemo(() => {
    const totalRegistrations = filteredRows.reduce((s, r) => s + r.totalRegistrations, 0);
    const totalAttendees = filteredRows.reduce((s, r) => s + r.totalAttendees, 0);
    const ctaClicks = filteredRows.reduce((s, r) => s + r.ctaClicks, 0);
    const pollResponses = filteredRows.reduce((s, r) => s + r.pollResponses, 0);
    return {
      totalRegistrations,
      totalAttendees,
      conversionRate: totalRegistrations
        ? Math.round((totalAttendees / totalRegistrations) * 100)
        : 0,
      ctaClicks,
      pollResponses,
    };
  }, [filteredRows]);

  return (
    <div className="dashboard-page">
      <header className="page-header flex justify-between items-center mb-6">
        <div>
          <h1 className="page-title">Relatórios e Analytics</h1>
          <p className="page-subtitle">
            Acompanhe métricas gerais de conversão e engajamento da sua conta.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Filter size={18} className="text-gray-400" />
          <select
            className="select"
            value={selectedWebinarId}
            onChange={(e) => setSelectedWebinarId(e.target.value)}
            style={{ width: 260 }}
          >
            <option value="all">Todos os Webinários</option>
            {rows.map((w) => (
              <option key={w.id} value={w.id}>
                {w.title}
              </option>
            ))}
          </select>
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="spinner spinner-lg" />
        </div>
      ) : error ? (
        <div className="card p-6">
          <p className="text-gray-500 text-sm">
            {t('analytics.loadError')}
          </p>
        </div>
      ) : (
        <>
          <div className="stats-grid mb-8">
            <div className="stat-card">
              <div
                className="stat-icon"
                style={{ background: 'rgba(51, 102, 255, 0.1)', color: 'var(--color-primary-600)' }}
              >
                <Users size={24} />
              </div>
              <div className="stat-content">
                <span className="stat-label">Total de Inscritos</span>
                <span className="stat-value">{globalStats.totalRegistrations}</span>
              </div>
            </div>

            <div className="stat-card">
              <div
                className="stat-icon"
                style={{ background: 'rgba(34, 197, 94, 0.1)', color: 'var(--color-success-600)' }}
              >
                <CheckCircle2 size={24} />
              </div>
              <div className="stat-content">
                <span className="stat-label">Total Participantes</span>
                <span className="stat-value">{globalStats.totalAttendees}</span>
              </div>
            </div>

            <div className="stat-card">
              <div
                className="stat-icon"
                style={{ background: 'rgba(234, 179, 8, 0.1)', color: 'var(--color-warning-600)' }}
              >
                <TrendingUp size={24} />
              </div>
              <div className="stat-content">
                <span className="stat-label">Taxa Média de Presença</span>
                <span className="stat-value">{globalStats.conversionRate}%</span>
              </div>
            </div>

            <div className="stat-card">
              <div
                className="stat-icon"
                style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-error-600)' }}
              >
                <MousePointer2 size={24} />
              </div>
              <div className="stat-content">
                <span className="stat-label">Cliques em Ofertas (CTA)</span>
                <span className="stat-value">{globalStats.ctaClicks}</span>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Desempenho por Webinário</h3>
            </div>
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Webinário</th>
                    <th>Tipo</th>
                    <th>Status</th>
                    <th>Inscritos</th>
                    <th>Participantes</th>
                    <th>CTA</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-6 text-gray-500">
                        Nenhum webinário encontrado.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((w) => (
                      <tr key={w.id}>
                        <td>
                          <strong>{w.title}</strong>
                        </td>
                        <td>
                          <span className="badge badge-secondary">
                            {w.type === 'recorded' ? 'Gravado (Evergreen)' : 'Ao Vivo'}
                          </span>
                        </td>
                        <td>
                          <span className="badge badge-primary">{w.status}</span>
                        </td>
                        <td>{w.totalRegistrations}</td>
                        <td>{w.totalAttendees}</td>
                        <td>{w.ctaClicks}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
