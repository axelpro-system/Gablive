import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Users, Search, Download, Filter } from 'lucide-react';
import './DashboardPage.css';

export default function LeadsPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [webinars, setWebinars] = useState([]);
  const [selectedWebinarId, setSelectedWebinarId] = useState('all');
  const [search, setSearch] = useState('');
  const [leads, setLeads] = useState([]);

  useEffect(() => {
    if (!profile?.org_id) return;

    const fetchLeads = async () => {
      setLoading(true);

      const { data: webList } = await supabase
        .from('webinars')
        .select('id, title')
        .eq('org_id', profile.org_id)
        .order('created_at', { ascending: false });

      setWebinars(webList || []);

      const webIds = (webList || []).map((w) => w.id);
      if (webIds.length === 0) {
        setLeads([]);
        setLoading(false);
        return;
      }

      const targetIds = selectedWebinarId === 'all' ? webIds : [selectedWebinarId];

      const { data: registrations } = await supabase
        .from('registrations')
        .select('id, name, email, phone, registered_at, attended, webinar_id')
        .in('webinar_id', targetIds)
        .order('registered_at', { ascending: false });

      // Build a map of webinar id -> title
      const webinarMap = Object.fromEntries(
        (webList || []).map((w) => [w.id, w.title])
      );

      const enriched = (registrations || []).map((r) => ({
        ...r,
        webinar_title: webinarMap[r.webinar_id] || 'Desconhecido',
      }));

      setLeads(enriched);
      setLoading(false);
    };

    fetchLeads();
  }, [profile, selectedWebinarId]);

  const filteredLeads = useMemo(() => {
    if (!search.trim()) return leads;
    const q = search.toLowerCase();
    return leads.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q) ||
        (l.phone && l.phone.includes(q))
    );
  }, [leads, search]);

  const exportCSV = () => {
    const header = ['Nome', 'Email', 'Telefone', 'Webinário', 'Data de Inscrição', 'Compareceu'];
    const rows = filteredLeads.map((l) => [
      `"${l.name}"`,
      `"${l.email}"`,
      l.phone ? `"${l.phone}"` : '',
      `"${l.webinar_title}"`,
      new Date(l.registered_at).toLocaleString('pt-BR'),
      l.attended ? 'Sim' : 'Não',
    ]);

    const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="dashboard-page">
      <header className="page-header flex justify-between items-center mb-6">
        <div>
          <h1 className="page-title">Leads</h1>
          <p className="page-subtitle">
            {filteredLeads.length} lead
            {filteredLeads.length !== 1 ? 's' : ''} encontrado
            {filteredLeads.length !== 1 ? 's' : ''}.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="search-input-wrapper" style={{ position: 'relative' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--color-gray-400)',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              className="input"
              placeholder="Buscar por nome, email ou telefone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 32, minWidth: 260 }}
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-400" />
            <select
              className="select"
              value={selectedWebinarId}
              onChange={(e) => setSelectedWebinarId(e.target.value)}
              style={{ width: 240 }}
            >
              <option value="all">Todos os Webinários</option>
              {webinars.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.title}
                </option>
              ))}
            </select>
          </div>

          <button className="btn btn-primary" onClick={exportCSV} disabled={filteredLeads.length === 0}>
            <Download size={16} />
            Exportar CSV
          </button>
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="spinner spinner-lg" />
        </div>
      ) : (
        <>
          {/* Stat card */}
          <div className="stats-grid mb-8" style={{ maxWidth: 320 }}>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(51, 102, 255, 0.1)', color: 'var(--color-primary-600)' }}>
                <Users size={24} />
              </div>
              <div className="stat-content">
                <span className="stat-label">Total de Leads</span>
                <span className="stat-value">{filteredLeads.length}</span>
              </div>
            </div>
          </div>

          {/* Leads table */}
          <div className="card">
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Email</th>
                    <th>Telefone</th>
                    <th>Webinário</th>
                    <th>Data de Inscrição</th>
                    <th>Compareceu</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-6 text-gray-500">
                        Nenhum lead encontrado.
                      </td>
                    </tr>
                  ) : (
                    filteredLeads.map((lead) => (
                      <tr key={lead.id}>
                        <td>
                          <strong>{lead.name}</strong>
                        </td>
                        <td>
                          <a href={`mailto:${lead.email}`} className="text-link">
                            {lead.email}
                          </a>
                        </td>
                        <td>{lead.phone || <span className="text-gray-400">—</span>}</td>
                        <td>{lead.webinar_title}</td>
                        <td>{new Date(lead.registered_at).toLocaleString('pt-BR')}</td>
                        <td>
                          {lead.attended ? (
                            <span className="badge badge-success">Sim</span>
                          ) : (
                            <span className="badge badge-secondary">Não</span>
                          )}
                        </td>
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
