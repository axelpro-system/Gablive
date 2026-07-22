import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useOrg } from '../../contexts/OrgContext';
import { logAudit } from '../../lib/audit';
import { Users, UserPlus, Mail, Clock, Shield, X, CheckCircle, AlertCircle } from 'lucide-react';
import './DashboardPage.css';

const ROLE_LABELS = {
  admin: 'Administrador',
  presenter: 'Operador',
  attendee: 'Atendente',
};

function formatDate(isoString) {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function UsersPage() {
  const { profile, user } = useAuth();
  const { orgId } = useOrg();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({ email: '', role: 'presenter' });

  const fetchMembers = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);

    // Get all profiles for this org from auth.users
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false });

    if (!error && profiles) {
      // Get emails from auth (via RPC or direct lookup)
      // For profiles that have user_id, we can get email from the jwt or metadata
      setMembers(profiles);
    }
    setLoading(false);
  }, [orgId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!form.email || !form.role) return;

    setInviting(true);
    setToast(null);

    try {
      // Call the Edge Function via supabase.functions.invoke
      const { data, error } = await supabase.functions.invoke('invite-administrator', {
        body: { email: form.email, role: form.role, orgId },
      });

      if (error) throw new Error(error.message || 'Erro ao convidar');

      // Audit log from client side as well
      logAudit({
        orgId,
        userId: user?.id,
        action: 'invite',
        entityType: 'user',
        description: `Usuário ${form.email} convidado como ${ROLE_LABELS[form.role]}`,
      });

      setToast({ type: 'success', message: `Convite enviado para ${form.email}` });
      setShowModal(false);
      setForm({ email: '', role: 'presenter' });
      fetchMembers();
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setInviting(false);
    }
  };

  const handleRevoke = async (memberId, memberUserId) => {
    if (!confirm('Tem certeza que deseja revogar o acesso deste usuário?')) return;

    const { error } = await supabase
      .from('profiles')
      .update({ invite_status: 'revoked' })
      .eq('id', memberId);

    if (!error) {
      logAudit({
        orgId,
        userId: user?.id,
        action: 'update',
        entityType: 'user',
        entityId: memberUserId,
        description: `Acesso do usuário revogado`,
      });
      fetchMembers();
    }
  };

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Users size={24} style={{ marginRight: 8, verticalAlign: 'middle', color: 'var(--color-primary-500)' }} />
            Usuários
          </h1>
          <p className="page-subtitle">Gerencie os membros da sua organização</p>
        </div>
        <button className="btn btn-create" onClick={() => setShowModal(true)}>
          <UserPlus size={16} />
          Convidar usuário
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`toast ${toast.type === 'error' ? 'toast-error' : 'toast-success'}`}
          style={{ marginBottom: 16 }}
        >
          {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
          {toast.message}
          <button className="toast-close" onClick={() => setToast(null)}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Members table */}
      <div className="card">
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <div className="spinner" />
          </div>
        ) : members.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <Users size={40} style={{ color: 'var(--color-gray-300)', marginBottom: 12 }} />
            <p style={{ color: 'var(--color-gray-500)', fontSize: 14 }}>
              Nenhum membro encontrado.
            </p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Papel</th>
                <th>Status</th>
                <th>Convidado em</th>
                <th style={{ width: 100 }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 36, height: 36, borderRadius: '50%',
                          backgroundColor: 'var(--color-primary-50)',
                          color: 'var(--color-primary-500)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 600, fontSize: 14,
                        }}
                      >
                        {(m.display_name || 'U')[0].toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>
                          {m.display_name || 'Usuário'}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--color-gray-500)' }}>
                          {m.invite_status === 'pending' ? 'Convite pendente' : 'Ativo'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span
                      className={`badge ${m.role === 'admin' ? 'badge-primary' : 'badge-dark'}`}
                      style={{ fontSize: 11 }}
                    >
                      {ROLE_LABELS[m.role] || m.role}
                    </span>
                  </td>
                  <td>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13,
                      color: m.invite_status === 'active' ? 'var(--status-success, #16a34a)' : 'var(--color-gray-500)',
                    }}>
                      <div style={{
                        width: 6, height: 6, borderRadius: '50%',
                        backgroundColor: m.invite_status === 'active' ? 'var(--status-success, #16a34a)' : 'var(--color-gray-400)',
                      }} />
                      {m.invite_status === 'pending' ? 'Pendente' : 'Ativo'}
                    </span>
                  </td>
                  <td style={{ fontSize: 13, color: 'var(--color-gray-500)' }}>
                    {formatDate(m.invited_at || m.created_at)}
                  </td>
                  <td>
                    {m.user_id !== user?.id && (
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleRevoke(m.id, m.user_id)}
                        title="Revogar acesso"
                        style={{ color: 'var(--color-primary-500)', fontSize: 12 }}
                      >
                        Revogar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Invite Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 18 }}>
                <UserPlus size={20} style={{ color: 'var(--color-primary-500)' }} />
                Convidar Usuário
              </h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleInvite}>
              <div className="modal-body">
                <div className="input-group">
                  <label className="input-label">E-mail</label>
                  <input
                    className="input"
                    type="email"
                    placeholder="usuario@exemplo.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                  />
                </div>
                <div className="input-group" style={{ marginTop: 16 }}>
                  <label className="input-label">Papel</label>
                  <select
                    className="input"
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                  >
                    <option value="admin">Administrador</option>
                    <option value="presenter">Operador</option>
                    <option value="attendee">Atendente</option>
                  </select>
                </div>
                <p style={{ fontSize: 12, color: 'var(--color-gray-500)', marginTop: 12 }}>
                  O usuário receberá um e-mail com link mágico para acessar a plataforma.
                </p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-create"
                  disabled={inviting || !form.email}
                >
                  {inviting ? (
                    <>
                      <div className="spinner spinner-sm" style={{ marginRight: 6 }} />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Mail size={16} />
                      Enviar convite
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
