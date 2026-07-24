import { useAnalytics } from '../../hooks/useAnalytics';
import { BarChart3, Users, Clock, MousePointer2, Download } from 'lucide-react';
import './AnalyticsDashboard.css';

export default function AnalyticsDashboard({ webinarId }) {
  const { stats, loading, error } = useAnalytics(webinarId);

  if (loading) return <div className="spinner spinner-sm" />;

  if (error || !stats) {
    return (
      <div className="analytics-dashboard">
        <p className="text-gray-500 text-sm">
          Não foi possível carregar as métricas. Confirme se a migration 005 está aplicada.
        </p>
      </div>
    );
  }

  const handleExportCsv = () => {
    const rows = [
      ['Métrica', 'Valor'],
      ['Inscritos', stats.totalRegistrations],
      ['Participantes (ao vivo/replay)', stats.totalAttendees],
      ['Taxa de comparecimento', `${stats.conversionRate}%`],
      ['Cliques em CTA', stats.ctaClicks],
      ['Visualizações de CTA', stats.ctaViews],
      ['Respostas em enquetes', stats.pollResponses],
      ['Entraram no webinar', stats.webinarEntered],
      ['Assistiram 15 min', stats.watch15],
      ['Assistiram 30 min', stats.watch30],
      ['Assistiram 45 min', stats.watch45],
      ['Assistiram 60 min', stats.watch60],
      ['Chegaram ao pitch', stats.pitchReached],
      ['Viram a oferta', stats.offerShown],
      ['Tempo médio de assistência (s)', stats.avgWatchTime],
    ];

    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `webinar-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="analytics-dashboard">
      <div className="editor-header">
        <div className="flex items-center gap-2">
          <BarChart3 size={20} className="text-gray-400" />
          <h3>Desempenho do Webinário</h3>
        </div>
        <button type="button" className="btn btn-secondary" onClick={handleExportCsv}>
          <Download size={16} /> Exportar CSV
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-icon" style={{ backgroundColor: 'var(--color-primary-500)', color: 'white' }}>
            <Users size={24} />
          </div>
          <div className="stat-card-info">
            <span className="stat-card-label">Inscritos</span>
            <span className="stat-card-value">{stats.totalRegistrations}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon" style={{ backgroundColor: 'var(--color-success-500)', color: 'white' }}>
            <Users size={24} />
          </div>
          <div className="stat-card-info">
            <span className="stat-card-label">Participantes (Ao Vivo/Replay)</span>
            <span className="stat-card-value">{stats.totalAttendees}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon" style={{ backgroundColor: 'var(--color-warning-500)', color: 'white' }}>
            <Clock size={24} />
          </div>
          <div className="stat-card-info">
            <span className="stat-card-label">Conversão (Presença)</span>
            <span className="stat-card-value">{stats.conversionRate}%</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon" style={{ backgroundColor: 'var(--color-error-500)', color: 'white' }}>
            <MousePointer2 size={24} />
          </div>
          <div className="stat-card-info">
            <span className="stat-card-label">Cliques na Oferta</span>
            <span className="stat-card-value">{stats.ctaClicks}</span>
          </div>
        </div>
      </div>

      <div className="analytics-charts">
        <div className="card">
          <div className="card-header">
            <h4>Funil de Conversão</h4>
          </div>
          <div className="card-body">
            <div className="funnel-container">
              {[
                { label: 'Inscritos', value: stats.totalRegistrations },
                { label: 'Acessou o webinar', value: stats.webinarEntered },
                { label: 'Assistiu 15 min', value: stats.watch15 },
                { label: 'Assistiu 30 min', value: stats.watch30 },
                { label: 'Assistiu 45 min', value: stats.watch45 },
                { label: 'Assistiu 60 min', value: stats.watch60 },
                { label: 'Chegou no pitch', value: stats.pitchReached },
                { label: 'Viu a oferta', value: stats.offerShown },
                { label: 'Clicou na oferta', value: stats.ctaClicks },
              ].map((step) => (
                <div
                  key={step.label}
                  className="funnel-step"
                  style={{ width: `${Math.max((step.value / (stats.totalRegistrations || 1)) * 100, 5)}%` }}
                >
                  <span className="funnel-label">{step.label}</span>
                  <span className="funnel-value">{step.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
