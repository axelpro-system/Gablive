import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useOrg } from '../../contexts/OrgContext';
import { logAudit } from '../../lib/audit';
import { Layout, Plus, Trash2, Edit3, X, FileText, Clock, Copy } from 'lucide-react';

const TYPE_LABELS = {
  registration: 'Página de Registro',
  wait: 'Sala de Espera',
};

const SUBTYPE_LABELS = {
  legacy: 'Legado (1:1)',
  button_form: 'Botão + Formulário',
  fixed_form: 'Formulário Fixo',
  jit: 'Just-in-Time',
  single: 'Único (sem JIT)',
};

const DEFAULT_BLOCKS = {
  registration: [
    { type: 'hero', data: { title: 'Webinário', subtitle: 'Descrição', cta: 'Garantir Vaga' } },
    { type: 'countdown', data: {} },
    { type: 'form', data: { fields: ['name', 'email'] } },
  ],
  wait: [
    { type: 'hero', data: { title: 'Sala de Espera', subtitle: 'O evento começa em:', cta: '' } },
    { type: 'countdown', data: {} },
  ],
};

const DEFAULT_THEME = {
  primaryColor: '#3366ff',
  backgroundColor: '#ffffff',
  textColor: '#101828',
};

export default function PageTemplatesEditor() {
  const { user } = useAuth();
  const { orgId } = useOrg();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'registration', subtype: 'legacy' });

  const fetchTemplates = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('page_templates')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setTemplates(data);
    }
    setLoading(false);
  }, [orgId]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', type: 'registration', subtype: 'legacy' });
    setShowModal(true);
  };

  const openEdit = (template) => {
    setEditing(template);
    setForm({
      name: template.name,
      type: template.type,
      subtype: template.subtype || 'legacy',
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name) return;

    setSaving(true);
    try {
      if (editing) {
        // Update
        const { error } = await supabase
          .from('page_templates')
          .update({ name: form.name, type: form.type, subtype: form.subtype })
          .eq('id', editing.id);

        if (error) throw error;

        logAudit({
          orgId,
          userId: user?.id,
          action: 'update',
          entityType: 'template',
          entityId: editing.id,
          description: `Template "${form.name}" atualizado`,
        });
      } else {
        // Create
        const blocks = DEFAULT_BLOCKS[form.type] || DEFAULT_BLOCKS.registration;
        const { error } = await supabase.from('page_templates').insert({
          org_id: orgId,
          name: form.name,
          type: form.type,
          subtype: form.subtype,
          blocks,
          theme: DEFAULT_THEME,
        });

        if (error) throw error;

        logAudit({
          orgId,
          userId: user?.id,
          action: 'create',
          entityType: 'template',
          description: `Template "${form.name}" criado`,
        });
      }

      setShowModal(false);
      fetchTemplates();
    } catch (err) {
      console.error('Error saving template:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (template) => {
    if (!confirm(`Excluir o template "${template.name}"? Esta ação não pode ser desfeita.`)) return;

    const { error } = await supabase
      .from('page_templates')
      .delete()
      .eq('id', template.id);

    if (!error) {
      logAudit({
        orgId,
        userId: user?.id,
        action: 'delete',
        entityType: 'template',
        entityId: template.id,
        description: `Template "${template.name}" excluído`,
      });
      fetchTemplates();
    }
  };

  const handleDuplicate = async (template) => {
    const { error } = await supabase.from('page_templates').insert({
      org_id: orgId,
      name: `${template.name} (cópia)`,
      type: template.type,
      subtype: template.subtype,
      blocks: template.blocks,
      theme: template.theme,
    });

    if (!error) {
      logAudit({
        orgId,
        userId: user?.id,
        action: 'create',
        entityType: 'template',
        description: `Template "${template.name}" duplicado`,
      });
      fetchTemplates();
    }
  };

  const getBlockCount = (template) => {
    const blocks = template.blocks;
    if (Array.isArray(blocks)) return blocks.length;
    if (typeof blocks === 'string') {
      try { return JSON.parse(blocks).length; } catch { return 0; }
    }
    return 0;
  };

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Layout size={24} style={{ marginRight: 8, verticalAlign: 'middle', color: 'var(--color-primary-500)' }} />
            Templates de Página
          </h1>
          <p className="page-subtitle">Crie templates de registro e sala de espera reutilizáveis entre webinars</p>
        </div>
        <button className="btn btn-create" onClick={openCreate}>
          <Plus size={16} />
          Novo template
        </button>
      </div>

      {/* Template grid */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <div className="spinner" />
        </div>
      ) : templates.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
          <Layout size={48} style={{ color: 'var(--color-gray-300)', marginBottom: 16 }} />
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Nenhum template ainda</h3>
          <p style={{ color: 'var(--color-gray-500)', fontSize: 14, marginBottom: 20 }}>
            Crie templates reutilizáveis para aplicar a múltiplos webinars.
          </p>
          <button className="btn btn-create" onClick={openCreate}>
            <Plus size={16} />
            Criar primeiro template
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {templates.map((tpl) => (
            <div key={tpl.id} className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    backgroundColor: 'var(--color-primary-50)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Layout size={20} style={{ color: 'var(--color-primary-500)' }} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>{tpl.name}</h4>
                    <span style={{ fontSize: 12, color: 'var(--color-gray-500)' }}>
                      {TYPE_LABELS[tpl.type] || tpl.type}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    className="btn btn-ghost btn-icon btn-sm"
                    onClick={() => handleDuplicate(tpl)}
                    title="Duplicar"
                  >
                    <Copy size={14} />
                  </button>
                  <button
                    className="btn btn-ghost btn-icon btn-sm"
                    onClick={() => openEdit(tpl)}
                    title="Editar"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    className="btn btn-ghost btn-icon btn-sm"
                    onClick={() => handleDelete(tpl)}
                    title="Excluir"
                    style={{ color: 'var(--color-primary-500)' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                <span className="badge badge-dark" style={{ fontSize: 11 }}>
                  {SUBTYPE_LABELS[tpl.subtype] || tpl.subtype}
                </span>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  fontSize: 12, color: 'var(--color-gray-500)',
                }}>
                  <FileText size={12} />
                  {getBlockCount(tpl)} blocos
                </span>
              </div>

              <div style={{
                fontSize: 11, color: 'var(--color-gray-400)',
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <Clock size={11} />
                Criado em {new Date(tpl.created_at).toLocaleDateString('pt-BR')}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 18 }}>
                <Layout size={20} style={{ color: 'var(--color-primary-500)' }} />
                {editing ? 'Editar Template' : 'Novo Template'}
              </h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="input-group">
                  <label className="input-label">Nome do template</label>
                  <input
                    className="input"
                    type="text"
                    placeholder="Ex: Template de Registro Padrão"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    autoFocus
                  />
                </div>
                <div className="input-group" style={{ marginTop: 16 }}>
                  <label className="input-label">Tipo de página</label>
                  <select
                    className="input"
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                  >
                    <option value="registration">Página de Registro</option>
                    <option value="wait">Sala de Espera</option>
                  </select>
                </div>
                <div className="input-group" style={{ marginTop: 16 }}>
                  <label className="input-label">Subtipo</label>
                  <select
                    className="input"
                    value={form.subtype}
                    onChange={(e) => setForm({ ...form, subtype: e.target.value })}
                  >
                    <option value="legacy">Legado (usa configuração 1:1 do webinar)</option>
                    <option value="button_form">Botão + Formulário</option>
                    <option value="fixed_form">Formulário Fixo</option>
                    {form.type === 'wait' && (
                      <>
                        <option value="jit">Just-in-Time</option>
                        <option value="single">Único (sem JIT)</option>
                      </>
                    )}
                  </select>
                </div>
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
                  disabled={saving || !form.name}
                >
                  {saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Criar template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
