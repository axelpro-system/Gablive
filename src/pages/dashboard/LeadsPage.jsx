import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Users, Search, Download, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import './DashboardPage.css';

/** Page size for table UI (spec F0-T3). */
const PAGE_SIZE = 50;
/** Chunk size for CSV export loop — stays under PostgREST max_rows (1000). */
const EXPORT_CHUNK = 500;

function escapeCsvCell(value) {
  const s = value == null ? '' : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

/** Strip PostgREST `or` metacharacters so filter stays valid. */
function sanitizeSearchTerm(raw) {
  return raw.trim().replace(/[%_,.()]/g, ' ').replace(/\s+/g, ' ').trim();
}

function buildLeadsQuery(webIds, searchTerm) {
  let query = supabase
    .from('registrations')
    .select('id, name, email, phone, registered_at, attended, webinar_id', {
      count: 'exact',
    })
    .in('webinar_id', webIds)
    .order('registered_at', { ascending: false });

  const q = sanitizeSearchTerm(searchTerm);
  if (q) {
    const pattern = `%${q}%`;
    query = query.or(
      `name.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern}`
    );
  }

  return query;
}

function downloadCsv(filename, header, rows) {
  const lines = [
    header.join(','),
    ...rows.map((r) => r.map(escapeCsvCell).join(',')),
  ];
  const blob = new Blob(['\uFEFF' + lines.join('\n')], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function LeadsPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [webinars, setWebinars] = useState([]);
  const [webinarsReady, setWebinarsReady] = useState(false);
  const [selectedWebinarId, setSelectedWebinarId] = useState('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [leads, setLeads] = useState([]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState(null);
  const webinarMapRef = useRef({});

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page when webinar filter changes
  useEffect(() => {
    setPage(1);
  }, [selectedWebinarId]);

  // Load webinar list once per org
  useEffect(() => {
    if (!profile?.org_id) {
      setWebinars([]);
      setWebinarsReady(true);
      setLeads([]);
      setTotalCount(0);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;

    const loadWebinars = async () => {
      setWebinarsReady(false);
      const { data: webList, error: webError } = await supabase
        .from('webinars')
        .select('id, title')
        .eq('org_id', profile.org_id)
        .order('created_at', { ascending: false });

      if (cancelled) return;

      if (webError) {
        console.error('Failed to load webinars for leads', webError);
        setError(webError);
        setWebinars([]);
        setWebinarsReady(true);
        return;
      }

      setWebinars(webList || []);
      webinarMapRef.current = Object.fromEntries(
        (webList || []).map((w) => [w.id, w.title])
      );
      setWebinarsReady(true);
    };

    loadWebinars();
    return () => {
      cancelled = true;
    };
  }, [profile?.org_id]);

  const targetWebinarIds = useCallback(() => {
    if (selectedWebinarId === 'all') {
      return webinars.map((w) => w.id);
    }
    return [selectedWebinarId];
  }, [webinars, selectedWebinarId]);

  // Paginated fetch (waits until webinar list is ready)
  useEffect(() => {
    if (!profile?.org_id) {
      setLeads([]);
      setTotalCount(0);
      setLoading(false);
      return undefined;
    }
    if (!webinarsReady) return undefined;

    const webIds = targetWebinarIds();
    if (webIds.length === 0) {
      setLeads([]);
      setTotalCount(0);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchPage = async () => {
      setLoading(true);
      setError(null);

      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, count, error: fetchError } = await buildLeadsQuery(
        webIds,
        debouncedSearch
      ).range(from, to);

      if (cancelled) return;

      if (fetchError) {
        console.error('Failed to load leads page', fetchError);
        setError(fetchError);
        setLeads([]);
        setTotalCount(0);
        setLoading(false);
        return;
      }

      const map = webinarMapRef.current;
      const enriched = (data || []).map((r) => ({
        ...r,
        webinar_title: map[r.webinar_id] || 'Desconhecido',
      }));

      setLeads(enriched);
      setTotalCount(count ?? 0);
      setLoading(false);
    };

    fetchPage();
    return () => {
      cancelled = true;
    };
  }, [
    profile?.org_id,
    webinarsReady,
    webinars,
    selectedWebinarId,
    debouncedSearch,
    page,
    targetWebinarIds,
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // If filter shrinks total pages, clamp
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const exportCSV = async () => {
    const webIds = targetWebinarIds();
    if (webIds.length === 0 || totalCount === 0) return;

    setExporting(true);
    try {
      const map = webinarMapRef.current;
      const allRows = [];
      let offset = 0;

      // Loop until a short page or hard stop (safety)
      for (let guard = 0; guard < 500; guard += 1) {
        const { data, error: exportError } = await buildLeadsQuery(
          webIds,
          debouncedSearch
        ).range(offset, offset + EXPORT_CHUNK - 1);

        if (exportError) throw exportError;

        const batch = data || [];
        for (const r of batch) {
          allRows.push([
            r.name,
            r.email,
            r.phone || '',
            map[r.webinar_id] || 'Desconhecido',
            new Date(r.registered_at).toLocaleString('pt-BR'),
            r.attended ? 'Sim' : 'Não',
          ]);
        }

        if (batch.length < EXPORT_CHUNK) break;
        offset += EXPORT_CHUNK;
      }

      downloadCsv(
        `leads-${new Date().toISOString().split('T')[0]}.csv`,
        ['Nome', 'Email', 'Telefone', 'Webinário', 'Data de Inscrição', 'Compareceu'],
        allRows
      );
    } catch (err) {
      console.error('CSV export failed', err);
      setError(err);
    } finally {
      setExporting(false);
    }
  };

  const fromItem = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const toItem = Math.min(page * PAGE_SIZE, totalCount);

  return (
    <div className="dashboard-page">
      <header className="page-header flex justify-between items-center mb-6">
        <div>
          <h1 className="page-title">Leads</h1>
          <p className="page-subtitle">
            {totalCount} lead{totalCount !== 1 ? 's' : ''} encontrado
            {totalCount !== 1 ? 's' : ''}
            {debouncedSearch ? ` para “${debouncedSearch}”` : ''}.
          </p>
        </div>

        <div className="flex items-center gap-3 leads-toolbar">
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
              type="search"
              className="input"
              placeholder="Buscar por nome, email ou telefone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 32, minWidth: 260 }}
              aria-label="Buscar leads"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-400" />
            <select
              className="select"
              value={selectedWebinarId}
              onChange={(e) => setSelectedWebinarId(e.target.value)}
              style={{ width: 240 }}
              aria-label="Filtrar por webinário"
            >
              <option value="all">Todos os Webinários</option>
              {webinars.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.title}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={exportCSV}
            disabled={totalCount === 0 || exporting}
          >
            <Download size={16} />
            {exporting ? 'Exportando…' : 'Exportar CSV'}
          </button>
        </div>
      </header>

      {error && (
        <div className="card p-4 mb-4">
          <p className="text-sm text-gray-500">
            Não foi possível carregar ou exportar leads. Tente de novo.
          </p>
        </div>
      )}

      {loading && leads.length === 0 ? (
        <div className="flex justify-center p-12">
          <div className="spinner spinner-lg" />
        </div>
      ) : (
        <>
          <div className="stats-grid mb-8" style={{ maxWidth: 320 }}>
            <div className="stat-card">
              <div
                className="stat-icon"
                style={{
                  background: 'rgba(51, 102, 255, 0.1)',
                  color: 'var(--color-primary-600)',
                }}
              >
                <Users size={24} />
              </div>
              <div className="stat-content">
                <span className="stat-label">Total de Leads</span>
                <span className="stat-value">{totalCount}</span>
              </div>
            </div>
          </div>

          <div className={`card ${loading ? 'leads-table-loading' : ''}`}>
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
                  {leads.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-6 text-gray-500">
                        Nenhum lead encontrado.
                      </td>
                    </tr>
                  ) : (
                    leads.map((lead) => (
                      <tr key={lead.id}>
                        <td>
                          <strong>{lead.name}</strong>
                        </td>
                        <td>
                          <a href={`mailto:${lead.email}`} className="text-link">
                            {lead.email}
                          </a>
                        </td>
                        <td>
                          {lead.phone || <span className="text-gray-400">—</span>}
                        </td>
                        <td>{lead.webinar_title}</td>
                        <td>
                          {new Date(lead.registered_at).toLocaleString('pt-BR')}
                        </td>
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

            {totalCount > 0 && (
              <div className="leads-pagination">
                <span className="leads-pagination-meta">
                  {fromItem}–{toItem} de {totalCount}
                  {totalPages > 1 ? ` · página ${page} de ${totalPages}` : ''}
                </span>
                <div className="leads-pagination-actions">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={page <= 1 || loading}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    aria-label="Página anterior"
                  >
                    <ChevronLeft size={16} />
                    Anterior
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={page >= totalPages || loading}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    aria-label="Próxima página"
                  >
                    Próxima
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
