import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ANALYTICS_EVENTS } from '../../lib/constants';
import { BarChart3, Users, Clock, MousePointer2, Download } from 'lucide-react';
import './AnalyticsDashboard.css';

export default function AnalyticsDashboard({ webinarId }) {
  const [stats, setStats] = useState({
    totalRegistrations: 0,
    totalAttendees: 0,
    conversionRate: 0,
    ctaClicks: 0,
    pollResponses: 0,
    webinarEntered: 0,
    watch15: 0,
    watch30: 0,
    watch45: 0,
    watch60: 0,
    pitchReached: 0,
    offerShown: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      // Fetch registrations
      const { count: regCount } = await supabase
        .from('registrations')
        .select('*', { count: 'exact', head: true })
        .eq('webinar_id', webinarId);

      // Fetch attendees (registered and attended)
      const { count: attCount } = await supabase
        .from('registrations')
        .select('*', { count: 'exact', head: true })
        .eq('webinar_id', webinarId)
        .eq('attended', true);

      // Fetch events
      const { data: events } = await supabase
        .from('analytics_events')
        .select('event_type, registration_id')
        .eq('webinar_id', webinarId);

      const countDistinctRegs = (type) =>
        new Set((events || []).filter(e => e.event_type === type && e.registration_id).map(e => e.registration_id)).size;

      const ctaClicks = events?.filter(e => e.event_type === ANALYTICS_EVENTS.CTA_CLICK).length || 0;
      const pollResponses = events?.filter(e => e.event_type === ANALYTICS_EVENTS.POLL_RESPONSE).length || 0;

      setStats({
        totalRegistrations: regCount || 0,
        totalAttendees: attCount || 0,
        conversionRate: regCount ? Math.round((attCount / regCount) * 100) : 0,
        ctaClicks,
        pollResponses,
        webinarEntered: countDistinctRegs(ANALYTICS_EVENTS.WEBINAR_ENTERED),
        watch15: countDistinctRegs(ANALYTICS_EVENTS.WATCH_15),
        watch30: countDistinctRegs(ANALYTICS_EVENTS.WATCH_30),
        watch45: countDistinctRegs(ANALYTICS_EVENTS.WATCH_45),
        watch60: countDistinctRegs(ANALYTICS_EVENTS.WATCH_60),
        pitchReached: countDistinctRegs(ANALYTICS_EVENTS.PITCH_REACHED),
        offerShown: countDistinctRegs(ANALYTICS_EVENTS.OFFER_SHOWN),
      });
      setLoading(false);
    };

    fetchAnalytics();
  }, [webinarId]);

  if (loading) return <div className="spinner spinner-sm" />;

  const handleExportCsv = () => {
    const rows = [
      ['Métrica', 'Valor'],
      ['Inscritos', stats.totalRegistrations],
      ['Participantes (ao vivo/replay)', stats.totalAttendees],
      ['Taxa de comparecimento', `${stats.conversionRate}%`],
      ['Cliques em CTA', stats.ctaClicks],
      ['Respostas em enquetes', stats.pollResponses],
      ['Entraram no webinar', stats.webinarEntered],
      ['Assistiram 15 min', stats.watch15],
      ['Assistiram 30 min', stats.watch30],
      ['Assistiram 45 min', stats.watch45],
      ['Assistiram 60 min', stats.watch60],
      ['Chegaram ao pitch', stats.pitchReached],
      ['Viram a oferta', stats.offerShown],
    ];

    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
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
        <button className="btn btn-secondary" onClick={handleExportCsv}>
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
