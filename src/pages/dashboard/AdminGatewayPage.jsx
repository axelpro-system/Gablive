import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Shield, Building2, Users, Video, Activity, ScrollText, Settings,
  Search, ChevronLeft, ChevronRight, AlertTriangle, CheckCircle,
  XCircle, Trash2, Ban, RefreshCw, Server,
  Mail, Clock, TrendingUp, X
} from 'lucide-react'
import { adminApi } from '../../lib/adminApi'
import './AdminGatewayPage.css'

// ─── Shared Components ─────────────────────────────────────────────────────────

function Spinner() {
  return <div className="spinner" />
}

function EmptyState({ message }) {
  return (
    <div className="admin-empty">
      <p className="text-gray-500">{message}</p>
    </div>
  )
}

function PaginatedTable({ columns, rows, onPageChange, pagination, loading }) {
  const { t } = useTranslation()

  if (loading) {
    return (
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key}>{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3].map((i) => (
              <tr key={i}>
                {columns.map((col) => (
                  <td key={col.key}>
                    <div className="skeleton" style={{ height: 16 }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (!rows || rows.length === 0) {
    return <EmptyState message={t('admin.emptyTable')} />
  }

  return (
    <>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key}>{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                {columns.map((col) => (
                  <td key={col.key}>{col.render ? col.render(row) : row[col.key]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pagination && pagination.total_pages > 1 && (
        <div className="admin-pagination">
          <span className="text-sm text-gray-500">
            {pagination.total} total — página {pagination.page} de {pagination.total_pages}
          </span>
          <div className="flex gap-2">
            <button
              className="btn btn-ghost btn-sm"
              disabled={pagination.page <= 1}
              onClick={() => onPageChange(pagination.page - 1)}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              className="btn btn-ghost btn-sm"
              disabled={pagination.page >= pagination.total_pages}
              onClick={() => onPageChange(pagination.page + 1)}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}

function SearchBar({ value, onChange, placeholder }) {
  return (
    <div className="admin-search">
      <Search size={16} className="text-gray-400" />
      <input
        type="text"
        className="admin-search-input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button className="btn-icon" onClick={() => onChange('')}>
          <X size={14} />
        </button>
      )}
    </div>
  )
}

function StatusBadge({ status }) {
  const map = {
    active: { class: 'badge-success', icon: CheckCircle, label: 'Ativa' },
    suspended: { class: 'badge-error', icon: XCircle, label: 'Suspensa' },
    pending_verification: { class: 'badge-warning', icon: AlertTriangle, label: 'Pendente' },
    pending: { class: 'badge-warning', icon: Clock, label: 'Pendente' },
    processing: { class: 'badge-primary', icon: RefreshCw, label: 'Processando' },
    draft: { class: 'badge-gray', icon: null, label: 'Rascunho' },
    scheduled: { class: 'badge-primary', icon: null, label: 'Agendado' },
    live: { class: 'badge-success', icon: null, label: 'Ao vivo' },
    ended: { class: 'badge-gray', icon: null, label: 'Encerrado' },
  }
  const cfg = map[status] ?? { class: 'badge-gray', icon: null, label: status }
  return (
    <span className={`badge ${cfg.class}`}>
      {cfg.icon && <cfg.icon size={12} />}
      {cfg.label}
    </span>
  )
}

function ConfirmModal({ title, message, onConfirm, onCancel, loading }) {
  return (
    <div className="modal-overlay">
      <div className="modal-content card p-6" style={{ maxWidth: 400 }}>
        <h3 className="text-lg font-bold mb-2">{title}</h3>
        <p className="text-gray-500 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button className="btn btn-ghost" onClick={onCancel} disabled={loading}>
            Cancelar
          </button>
          <button className="btn btn-danger" onClick={onConfirm} disabled={loading}>
            {loading ? <Spinner /> : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Tab: Overview ─────────────────────────────────────────────────────────────

function TabOverview() {
  const { t } = useTranslation()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminApi.getSystemStats()
      setStats(res.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <div className="p-8"><Spinner /></div>

  const { counts, queue, status_breakdown } = stats ?? {}

  return (
    <div className="admin-tab-content">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">{t('admin.overview')}</h2>
        <button className="btn btn-ghost btn-sm" onClick={load}>
          <RefreshCw size={16} /> Atualizar
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Organizações', value: counts?.organizations ?? 0, icon: Building2, color: 'primary' },
          { label: 'Usuários', value: counts?.users ?? 0, icon: Users, color: 'success' },
          { label: 'Webinários', value: counts?.webinars ?? 0, icon: Video, color: 'warning' },
          { label: 'Registros', value: counts?.registrations ?? 0, icon: Activity, color: 'primary' },
        ].map((stat) => (
          <div key={stat.label} className="card p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className={`bg-${stat.color}-100 text-${stat.color}-700 p-2 rounded-lg`}>
                <stat.icon size={20} />
              </div>
              <span className="text-sm text-gray-500 font-semibold">{stat.label}</span>
            </div>
            <p className="text-3xl font-bold">{stat.value.toLocaleString('pt-BR')}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-4">
          <h3 className="font-semibold mb-3">Status das Organizações</h3>
          {Object.entries(status_breakdown?.organizations ?? {}).map(([status, count]) => (
            <div key={status} className="flex justify-between items-center py-1">
              <StatusBadge status={status} />
              <span className="font-mono text-sm">{count}</span>
            </div>
          ))}
          {Object.keys(status_breakdown?.organizations ?? {}).length === 0 && (
            <p className="text-gray-500 text-sm">Nenhum dado disponível</p>
          )}
        </div>

        <div className="card p-4">
          <h3 className="font-semibold mb-3">Status dos Webinários</h3>
          {Object.entries(status_breakdown?.webinars ?? {}).map(([status, count]) => (
            <div key={status} className="flex justify-between items-center py-1">
              <StatusBadge status={status} />
              <span className="font-mono text-sm">{count}</span>
            </div>
          ))}
          {Object.keys(status_breakdown?.webinars ?? {}).length === 0 && (
            <p className="text-gray-500 text-sm">Nenhum dado disponível</p>
          )}
        </div>

        <div className="card p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Mail size={16} /> Fila de E-mails
          </h3>
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Mensagens pendentes</span>
            <span className="badge badge-warning">{queue?.pending ?? 0}</span>
          </div>
        </div>

        <div className="card p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Server size={16} /> Saúde do Sistema
          </h3>
          <div className="flex items-center gap-2 text-success-700">
            <CheckCircle size={18} />
            <span className="text-sm font-medium">Operacional</span>
          </div>
          <p className="text-gray-500 text-xs mt-1">
            Conexão com banco de dados ativa
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Tab: Organizations ────────────────────────────────────────────────────────

function TabOrgs() {
  const { t } = useTranslation()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [, setEditingOrg] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const load = useCallback(async (pageNum = 1, searchStr = search) => {
    setLoading(true)
    try {
      const params = { page: pageNum, per_page: 20 }
      if (searchStr) params.search = searchStr
      const res = await adminApi.listOrgs(params)
      setData(res)
      setPage(pageNum)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => { load() }, [load])

  const handleSearch = (val) => {
    setSearch(val)
    setPage(1)
    load(1, val)
  }

  const handleSuspend = async (org) => {
    try {
      await adminApi.updateOrg(org.id, {
        status: org.status === 'suspended' ? 'active' : 'suspended',
      })
      setEditingOrg(null)
      load(page, search)
    } catch (e) {
      alert(e.message)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await adminApi.deleteOrg(deleteTarget.id)
      setDeleteTarget(null)
      load(page, search)
    } catch (e) {
      alert(e.message)
    } finally {
      setDeleteLoading(false)
    }
  }

  const columns = [
    { key: 'name', label: 'Nome', render: (row) => <span className="font-medium">{row.name}</span> },
    { key: 'slug', label: 'Slug', render: (row) => <code className="text-sm text-gray-500">{row.slug}</code> },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'created_at', label: 'Criado em', render: (row) => new Date(row.created_at).toLocaleDateString('pt-BR') },
    {
      key: 'actions',
      label: '',
      render: (row) => (
        <div className="flex gap-2 justify-end">
          <button
            className="btn btn-ghost btn-sm"
            title={row.status === 'suspended' ? 'Reativar' : 'Suspender'}
            onClick={() => handleSuspend(row)}
          >
            {row.status === 'suspended' ? <RefreshCw size={14} /> : <Ban size={14} />}
          </button>
          <button
            className="btn btn-ghost btn-sm text-error-600"
            onClick={() => setDeleteTarget(row)}
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="admin-tab-content">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Organizações</h2>
        <div className="flex gap-3">
          <SearchBar value={search} onChange={handleSearch} placeholder="Buscar organização..." />
        </div>
      </div>

      <PaginatedTable
        columns={columns}
        rows={data?.data}
        pagination={data?.pagination}
        loading={loading}
        onPageChange={(p) => load(p, search)}
      />

      {deleteTarget && (
        <ConfirmModal
          title="Excluir organização"
          message={`Tem certeza que deseja excluir "${deleteTarget.name}"? Esta ação não pode ser desfeita e removerá todos os dados associados.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteLoading}
        />
      )}
    </div>
  )
}

// ─── Tab: Users ────────────────────────────────────────────────────────────────

function TabUsers() {
  const { t } = useTranslation()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (pageNum = 1, searchStr = search) => {
    setLoading(true)
    try {
      const params = { page: pageNum, per_page: 20 }
      if (searchStr) params.search = searchStr
      const res = await adminApi.listUsers(params)
      setData(res)
      setPage(pageNum)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => { load() }, [load])

  const handleSearch = (val) => {
    setSearch(val)
    load(1, val)
  }

  const handleRoleChange = async (profileId, newRole) => {
    try {
      await adminApi.updateUser(profileId, { role: newRole })
      load(page, search)
    } catch (e) {
      alert(e.message)
    }
  }

  const columns = [
    { key: 'display_name', label: 'Nome', render: (row) => <span className="font-medium">{row.display_name ?? '—'}</span> },
    { key: 'email', label: 'Org', render: (row) => row.organizations?.name ?? '—' },
    { key: 'role', label: 'Papel', render: (row) => (
      <select
        className="admin-select"
        value={row.role}
        onChange={(e) => handleRoleChange(row.id, e.target.value)}
      >
        <option value="presenter">Presenter</option>
        <option value="admin">Admin</option>
        <option value="attendee">Attendee</option>
      </select>
    )},
    { key: 'invite_status', label: 'Status', render: (row) => <StatusBadge status={row.invite_status ?? 'active'} /> },
    { key: 'created_at', label: 'Criado em', render: (row) => new Date(row.created_at).toLocaleDateString('pt-BR') },
  ]

  return (
    <div className="admin-tab-content">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Usuários</h2>
        <SearchBar value={search} onChange={handleSearch} placeholder="Buscar usuário..." />
      </div>
      <PaginatedTable
        columns={columns}
        rows={data?.data}
        pagination={data?.pagination}
        loading={loading}
        onPageChange={(p) => load(p, search)}
      />
    </div>
  )
}

// ─── Tab: Webinars ────────────────────────────────────────────────────────────

function TabWebinars() {
  const { t } = useTranslation()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const load = useCallback(async (pageNum = 1, searchStr = search, status = statusFilter) => {
    setLoading(true)
    try {
      const params = { page: pageNum, per_page: 20 }
      if (searchStr) params.search = searchStr
      if (status) params.status = status
      const res = await adminApi.listWebinars(params)
      setData(res)
      setPage(pageNum)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter])

  useEffect(() => { load() }, [load])

  const handleSearch = (val) => {
    setSearch(val)
    load(1, val, statusFilter)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await adminApi.deleteWebinar(deleteTarget.id)
      setDeleteTarget(null)
      load(page, search, statusFilter)
    } catch (e) {
      alert(e.message)
    } finally {
      setDeleteLoading(false)
    }
  }

  const columns = [
    { key: 'title', label: 'Título', render: (row) => <span className="font-medium">{row.title}</span> },
    { key: 'org', label: 'Organização', render: (row) => row.organizations?.name ?? '—' },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'type', label: 'Tipo', render: (row) => <span className="text-sm text-gray-500">{row.type}</span> },
    { key: 'created_at', label: 'Criado em', render: (row) => new Date(row.created_at).toLocaleDateString('pt-BR') },
    {
      key: 'actions',
      label: '',
      render: (row) => (
        <div className="flex gap-2 justify-end">
          <button
            className="btn btn-ghost btn-sm text-error-600"
            onClick={() => setDeleteTarget(row)}
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="admin-tab-content">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Webinários</h2>
        <div className="flex gap-3">
          <SearchBar value={search} onChange={handleSearch} placeholder="Buscar webinar..." />
          <select
            className="admin-select"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); load(1, search, e.target.value) }}
          >
            <option value="">Todos status</option>
            <option value="draft">Rascunho</option>
            <option value="scheduled">Agendado</option>
            <option value="live">Ao vivo</option>
            <option value="ended">Encerrado</option>
          </select>
        </div>
      </div>

      <PaginatedTable
        columns={columns}
        rows={data?.data}
        pagination={data?.pagination}
        loading={loading}
        onPageChange={(p) => load(p, search, statusFilter)}
      />

      {deleteTarget && (
        <ConfirmModal
          title="Excluir webinário"
          message={`Tem certeza que deseja excluir "${deleteTarget.title}"?`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteLoading}
        />
      )}
    </div>
  )
}

// ─── Tab: System ──────────────────────────────────────────────────────────────

function TabSystem() {
  const { t } = useTranslation()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminApi.getSystemStats()
      setStats(res.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <div className="p-8"><Spinner /></div>

  const { counts, queue, email_configs } = stats ?? {}

  return (
    <div className="admin-tab-content">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Saúde do Sistema</h2>
        <button className="btn btn-ghost btn-sm" onClick={load}>
          <RefreshCw size={16} /> Atualizar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="card p-4">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Server size={16} /> Serviços
          </h3>
          {[
            { name: 'Banco de Dados (Supabase)', status: 'operational' },
            { name: 'Edge Functions', status: 'operational' },
            { name: 'Autenticação', status: 'operational' },
            { name: 'Realtime (Chat)', status: 'operational' },
          ].map((svc) => (
            <div key={svc.name} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
              <span className="text-sm">{svc.name}</span>
              <span className="badge badge-success flex items-center gap-1">
                <CheckCircle size={12} /> Operacional
              </span>
            </div>
          ))}
        </div>

        <div className="card p-4">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Mail size={16} /> Fila de E-mails
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Pendentes</span>
              <span className="badge badge-warning">{queue?.pending ?? 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Processando</span>
              <span className="badge badge-primary">{queue?.processing ?? 0}</span>
            </div>
          </div>
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2">Configs de E-mail</h4>
            {(!email_configs || email_configs.length === 0) ? (
              <p className="text-sm text-gray-500">Nenhuma config de e-mail encontrada</p>
            ) : (
              <div className="space-y-2">
                {email_configs.map((cfg) => (
                  <div key={cfg.type} className="flex justify-between items-center text-sm">
                    <code className="text-xs">{cfg.type}</code>
                    <StatusBadge status={cfg.active ? 'active' : 'suspended'} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card p-4">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <TrendingUp size={16} /> Métricas da Plataforma
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(counts ?? {}).map(([key, value]) => (
            <div key={key} className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-primary-600">{value.toLocaleString('pt-BR')}</p>
              <p className="text-sm text-gray-500 capitalize">{key}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Tab: Audit ───────────────────────────────────────────────────────────────

function TabAudit() {
  const { t } = useTranslation()
  const [page, setPage] = useState(1)
  const [entityFilter, setEntityFilter] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (pageNum = 1, entity = entityFilter) => {
    setLoading(true)
    try {
      const params = { page: pageNum, per_page: 50 }
      if (entity) params.entity_type = entity
      const res = await adminApi.listAuditLogs(params)
      setData(res)
      setPage(pageNum)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [entityFilter])

  useEffect(() => { load() }, [load])

  const columns = [
    {
      key: 'created_at',
      label: 'Data',
      render: (row) => new Date(row.created_at).toLocaleString('pt-BR'),
    },
    { key: 'action', label: 'Ação', render: (row) => (
      <span className="badge badge-gray">{row.action}</span>
    )},
    { key: 'entity_type', label: 'Entidade', render: (row) => (
      <code className="text-xs">{row.entity_type}</code>
    )},
    { key: 'description', label: 'Descrição', render: (row) => row.description ?? '—' },
    { key: 'user_name', label: 'Por', render: (row) => row.user_name ?? 'Sistema' },
    { key: 'org_id', label: 'Org ID', render: (row) => row.org_id && row.org_id !== '00000000-0000-0000-0000-000000000000'
      ? <span className="text-xs text-gray-400">{row.org_id.slice(0, 8)}...</span>
      : <span className="badge badge-primary">Plataforma</span>
    },
  ]

  return (
    <div className="admin-tab-content">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Audit Log</h2>
        <div className="flex gap-3">
          <select
            className="admin-select"
            value={entityFilter}
            onChange={(e) => { setEntityFilter(e.target.value); load(1, e.target.value) }}
          >
            <option value="">Todas entidades</option>
            <option value="organization">Organization</option>
            <option value="profile">Profile</option>
            <option value="webinar">Webinar</option>
            <option value="platform_admin">Platform Admin</option>
          </select>
          <button className="btn btn-ghost btn-sm" onClick={() => load(page, entityFilter)}>
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      <PaginatedTable
        columns={columns}
        rows={data?.data}
        pagination={data?.pagination}
        loading={loading}
        onPageChange={(p) => load(p, entityFilter)}
      />
    </div>
  )
}

// ─── Tab: Settings ─────────────────────────────────────────────────────────────

function TabSettings() {
  const { t } = useTranslation()
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [addEmail, setAddEmail] = useState('')
  const [addName, setAddName] = useState('')
  const [addLoading, setAddLoading] = useState(false)
  const [removeTarget, setRemoveTarget] = useState(null)
  const [removeLoading, setRemoveLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminApi.listAdmins()
      setAdmins(res.data ?? [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!addEmail || !addName) return
    setAddLoading(true)
    try {
      // Look up user by email first
      const { data: userData } = await adminApi.listUsers({ search: addEmail, per_page: 1 })
      const user = userData?.data?.[0]
      if (!user) {
        alert('Usuário não encontrado. Verifique o e-mail.')
        return
      }
      await adminApi.addAdmin({ user_id: user.user_id, display_name: addName, email: addEmail })
      setAddEmail('')
      setAddName('')
      load()
    } catch (e) {
      alert(e.message)
    } finally {
      setAddLoading(false)
    }
  }

  const handleRemove = async () => {
    if (!removeTarget) return
    setRemoveLoading(true)
    try {
      await adminApi.removeAdmin(removeTarget.id)
      setRemoveTarget(null)
      load()
    } catch (e) {
      alert(e.message)
    } finally {
      setRemoveLoading(false)
    }
  }

  if (loading) return <div className="p-8"><Spinner /></div>

  return (
    <div className="admin-tab-content">
      <h2 className="text-xl font-bold mb-6">Configurações de Plataforma</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-4">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Shield size={16} /> Administradores de Plataforma
          </h3>
          <div className="space-y-3 mb-4">
            {admins.length === 0 && (
              <p className="text-sm text-gray-500">Nenhum admin de plataforma.</p>
            )}
            {admins.map((admin) => (
              <div key={admin.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                <div>
                  <p className="font-medium text-sm">{admin.display_name}</p>
                  <p className="text-xs text-gray-500">{admin.email}</p>
                </div>
                <button
                  className="btn btn-ghost btn-sm text-error-600"
                  onClick={() => setRemoveTarget(admin)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <form onSubmit={handleAdd} className="flex gap-2">
            <input
              className="input flex-1"
              placeholder="Nome do admin"
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
            />
            <input
              className="input flex-1"
              placeholder="E-mail do usuário"
              type="email"
              value={addEmail}
              onChange={(e) => setAddEmail(e.target.value)}
            />
            <button className="btn btn-primary" type="submit" disabled={addLoading}>
              {addLoading ? <Spinner /> : 'Adicionar'}
            </button>
          </form>
          <p className="text-xs text-gray-400 mt-2">
            Busca o usuário pelo e-mail na lista de usuários existentes e adiciona como admin de plataforma.
          </p>
        </div>
      </div>

      {removeTarget && (
        <ConfirmModal
          title="Remover admin de plataforma"
          message={`Remover ${removeTarget.display_name} (${removeTarget.email}) como admin de plataforma?`}
          onConfirm={handleRemove}
          onCancel={() => setRemoveTarget(null)}
          loading={removeLoading}
        />
      )}
    </div>
  )
}

// ─── Main AdminGatewayPage ─────────────────────────────────────────────────────

const TABS = [
  { key: 'overview', label: 'Visão Geral', icon: Activity },
  { key: 'orgs', label: 'Organizações', icon: Building2 },
  { key: 'users', label: 'Usuários', icon: Users },
  { key: 'webinars', label: 'Webinários', icon: Video },
  { key: 'system', label: 'Sistema', icon: Server },
  { key: 'audit', label: 'Audit Log', icon: ScrollText },
  { key: 'settings', label: 'Configurações', icon: Settings },
]

export default function AdminGatewayPage() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('overview')

  const renderTab = () => {
    switch (activeTab) {
      case 'overview': return <TabOverview />
      case 'orgs': return <TabOrgs />
      case 'users': return <TabUsers />
      case 'webinars': return <TabWebinars />
      case 'system': return <TabSystem />
      case 'audit': return <TabAudit />
      case 'settings': return <TabSettings />
      default: return null
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div className="flex items-center gap-3 mb-6">
          <Shield size={32} className="text-primary-600" />
          <div>
            <h1 className="text-2xl font-bold">Admin Gateway</h1>
            <p className="text-gray-500 text-sm">Painel administrativo da plataforma</p>
          </div>
        </div>

        <div className="admin-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={`admin-tab ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="admin-body">
        {renderTab()}
      </div>
    </div>
  )
}
