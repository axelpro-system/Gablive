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

  const kpis = [
    { label: 'Total de Inscritos', value: globalStats.totalRegistrations, icon: Users, color: 'var(--color-primary-500)' },
    { label: 'Total Participantes', value: globalStats.totalAttendees, icon: CheckCircle2, color: 'var(--color-success-500)' },
    { label: 'Taxa Média de Presença', value: `${globalStats.conversionRate}%`, icon: TrendingUp, color: 'var(--color-warning-500)' },
    { label: 'Cliques em Ofertas (CTA)', value: globalStats.ctaClicks, icon: MousePointer2, color: 'var(--color-error-500)' },
  ];

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
            {kpis.map((kpi) => (
              <div key={kpi.label} className="stat-card">
                <div className="stat-card-icon" style={{ color: kpi.color }}>
                  <kpi.icon size={22} aria-hidden="true" />
                </div>
                <div>
                  <p className="stat-card-label">{kpi.label}</p>
                  <p className="stat-card-value">{kpi.value}</p>
                </div>
              </div>
            ))}
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
