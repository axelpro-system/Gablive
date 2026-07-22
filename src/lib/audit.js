import { supabase } from './supabase.js';

/**
 * Registra uma entrada de auditoria.
 * @param {Object} params
 * @param {string} params.orgId     - UUID da organização
 * @param {string} params.userId    - UUID do usuário que executou a ação
 * @param {string} params.action    - Verbo da ação: 'create', 'update', 'delete', 'invite', etc.
 * @param {string} params.entityType - Tipo da entidade: 'webinar', 'user', 'template', etc.
 * @param {string} [params.entityId] - UUID da entidade afetada
 * @param {string} [params.description] - Descrição legível da ação
 * @param {Object} [params.metadata] - Dados extras em JSON (ex: diff de campos alterados)
 * @returns {Promise<Object|null>} Registro criado ou null em caso de erro silencioso
 */
export async function logAudit({ orgId, userId, action, entityType, entityId = null, description = '', metadata = {} }) {
  if (!orgId || !userId || !action || !entityType) return null;

  const { data, error } = await supabase
    .from('audit_logs')
    .insert({
      org_id: orgId,
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      description,
      metadata,
    })
    .select()
    .single();

  if (error) {
    // Audit nunca deve quebrar o fluxo principal — loga e ignora
    console.error('[audit] failed to log:', error.message, { action, entityType, entityId });
    return null;
  }

  return data;
}

/**
 * Busca o histórico de auditoria da organização.
 * @param {string} orgId
 * @param {Object} [opts]
 * @param {number} [opts.limit=50]
 * @param {string} [opts.entityType] - filtra por tipo de entidade
 * @param {string} [opts.action]     - filtra por ação
 * @returns {Promise<Object[]>}
 */
export async function fetchAuditLogs(orgId, opts = {}) {
  const { limit = 50, entityType, action } = opts;

  let query = supabase
    .from('audit_logs')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (entityType) query = query.eq('entity_type', entityType);
  if (action) query = query.eq('action', action);

  const { data, error } = await query;

  if (error) {
    console.error('[audit] failed to fetch logs:', error.message);
    return [];
  }

  return data || [];
}
