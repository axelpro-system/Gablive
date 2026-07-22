import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useOrg } from '../../contexts/OrgContext';
import { fetchAuditLogs } from '../../lib/audit';
import { supabase } from '../../lib/supabase';
import { FileText, Filter, RefreshCw, Clock, User, FileEdit, Trash2, UserPlus } from 'lucide-react';
import './DashboardPage.css';

const ACTION_LABELS = {
  create: 'Criação',
  update: 'Atualização',
  delete: 'Exclusão',
  invite: 'Convite',
};

const ACTION_ICONS = {
  create: FileEdit,
  update: FileEdit,
  delete: Trash2,
  invite: UserPlus,
};

const ENTITY_LABELS = {
  webinar: 'Webinar',
  user: 'Usuário',
  template: 'Template',
};

function formatDate(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AuditLogPage() {
  const { profile } = useAuth();
  const { orgId } = useOrg();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterEntity, setFilterEntity] = useState('');
  const [filterAction, setFilterAction] = useState('');

  const loadLogs = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    const data = await fetchAuditLogs(orgId, {
      limit: 100,
      ...(filterEntity && { entityType: filterEntity }),
      ...(filterAction && { action: filterAction }),
    });
    setLogs(data);
    setLoading(false);
  }, [orgId, filterEntity, filterAction]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <FileText size={24} style={{ marginRight: 8, verticalAlign: 'middle', color: 'var(--color-primary-500)' }} />
            Registro de Atividades
          </h1>
          <p className="page-subtitle">Histórico de ações realizadas na sua conta</p>
        </div>
        <button className="btn btn-ghost" onClick={loadLogs} title="Atualizar">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Filtros */}
      <div className="card" style={{ marginBottom: 24, padding: 16 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <Filter size={16} style={{ color: 'var(--color-gray-500)' }} />
          <select
            className="input"
            value={filterEntity}
            onChange={(e) => setFilterEntity(e.target.value)}
            style={{ width: 160, height: 36, fontSize: 13 }}
          >
            <option value="">Todas entidades</option>
            <option value="webinar">Webinar</option>
            <option value="user">Usuário</option>
            <option value="template">Template</option>
          </select>
          <select
            className="input"
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            style={{ width: 150, height: 36, fontSize: 13 }}
          >
            <option value="">Todas ações</option>
            <option value="create">Criação</option>
            <option value="update">Atualização</option>
            <option value="delete">Exclusão</option>
            <option value="invite">Convite</option>
          </select>
          {(filterEntity || filterAction) && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => { setFilterEntity(''); setFilterAction(''); }}
              style={{ fontSize: 12, color: 'var(--color-primary-500)' }}
            >
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* Lista de logs */}
      <div className="card">
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <div className="spinner" />
            <p style={{ marginTop: 12, color: 'var(--color-gray-500)' }}>Carregando...</p>
          </div>
        ) : logs.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <FileText size={40} style={{ color: 'var(--color-gray-300)', marginBottom: 12 }} />
            <p style={{ color: 'var(--color-gray-500)', fontSize: 14 }}>
              {filterEntity || filterAction
                ? 'Nenhum registro encontrado com esses filtros.'
                : 'Nenhuma atividade registrada ainda.'}
            </p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 160 }}>Data</th>
                <th style={{ width: 100 }}>Ação</th>
                <th style={{ width: 100 }}>Entidade</th>
                <th>Descrição</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const Icon = ACTION_ICONS[log.action] || FileEdit;
                return (
                  <tr key={log.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Clock size={14} style={{ color: 'var(--color-gray-400)', flexShrink: 0 }} />
                        <span style={{ fontSize: 13, color: 'var(--color-gray-600)', whiteSpace: 'nowrap' }}>
                          {formatDate(log.created_at)}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`badge ${log.action === 'delete' ? 'badge-primary' : log.action === 'invite' ? 'badge-create' : 'badge-dark'}`}
                        style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      >
                        <Icon size={12} />
                        {ACTION_LABELS[log.action] || log.action}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: 13, color: 'var(--color-gray-700)', fontWeight: 500 }}>
                        {ENTITY_LABELS[log.entity_type] || log.entity_type}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: 13, color: 'var(--color-gray-700)' }}>
                        {log.description || '—'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {!loading && logs.length > 0 && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-default)', textAlign: 'right' }}>
            <span style={{ fontSize: 12, color: 'var(--color-gray-500)' }}>
              Total de registros: {logs.length}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
