import { supabase } from './supabase.js';
import { logAudit } from './audit.js';
import { WEBINAR_STATUS } from './constants.js';

/**
 * Erro de negócio previsível em ações de webinário
 * (título não confere, org ausente, linha não encontrada, etc.).
 * Diferencia falhas esperadas de erros inesperados para a UI tratar a mensagem.
 */
export class WebinarActionError extends Error {
  /**
   * @param {string} code    - código estável da falha (ex: 'title_mismatch')
   * @param {string} message - mensagem legível para o usuário
   */
  constructor(code, message) {
    super(message);
    this.name = 'WebinarActionError';
    this.code = code;
  }
}

// Mapeia transição de status -> ação de auditoria dedicada
const AUDIT_ACTION_BY_STATUS = {
  [WEBINAR_STATUS.LIVE]: 'go_live',
  [WEBINAR_STATUS.ENDED]: 'end_live',
};

const normalizeTitle = (value) => (value || '').trim();

/**
 * Exclusão centralizada e segura de um webinário.
 *
 * Garantias:
 * - Confirmação por título (defesa contra clique/exclusão acidental).
 * - Escopo obrigatório por `org_id` (defesa em profundidade junto ao RLS —
 *   impede excluir webinário de outra organização mesmo se o RLS mudar).
 * - Verifica que uma linha foi de fato removida (id inexistente ou de outra org falha).
 * - Registra o audit log APÓS a exclusão bem-sucedida (não antes).
 *
 * @param {Object} params
 * @param {string} params.id                - UUID do webinário
 * @param {string} params.orgId             - UUID da organização atual
 * @param {string} params.userId            - UUID do usuário executando a ação
 * @param {string} params.expectedTitle     - título real do webinário
 * @param {string} params.confirmationTitle - título digitado pelo usuário para confirmar
 * @returns {Promise<{ id: string, title: string }>} registro excluído
 * @throws {WebinarActionError}
 */
export async function deleteWebinar({ id, orgId, userId, expectedTitle, confirmationTitle }) {
  if (!id) throw new WebinarActionError('missing_id', 'ID do webinário ausente.');
  if (!orgId) throw new WebinarActionError('missing_org', 'Organização não identificada.');

  if (normalizeTitle(confirmationTitle) !== normalizeTitle(expectedTitle)) {
    throw new WebinarActionError('title_mismatch', 'O título digitado não confere.');
  }

  const { data, error } = await supabase
    .from('webinars')
    .delete()
    .eq('id', id)
    .eq('org_id', orgId)
    .select('id, title');

  if (error) {
    throw new WebinarActionError('delete_failed', error.message);
  }
  if (!data || data.length === 0) {
    // Nenhuma linha afetada: id inexistente ou pertence a outra organização
    throw new WebinarActionError('not_found', 'Webinário não encontrado nesta organização.');
  }

  const deleted = data[0];

  // Audit é best-effort e nunca quebra o fluxo (logAudit já engole erros)
  await logAudit({
    orgId,
    userId,
    action: 'delete',
    entityType: 'webinar',
    entityId: id,
    description: `Webinário "${deleted.title}" excluído`,
  });

  return deleted;
}

/**
 * Atualiza o status do webinário (iniciar/encerrar ao vivo) de forma centralizada,
 * com escopo por org e audit log dedicado.
 *
 * @param {Object} params
 * @param {string} params.id     - UUID do webinário
 * @param {string} params.orgId  - UUID da organização
 * @param {string} params.userId - UUID do usuário
 * @param {string} params.status - novo status (um de WEBINAR_STATUS)
 * @returns {Promise<{ id: string, title: string, status: string }>} webinário atualizado
 * @throws {WebinarActionError}
 */
export async function setWebinarStatus({ id, orgId, userId, status }) {
  if (!id) throw new WebinarActionError('missing_id', 'ID do webinário ausente.');
  if (!orgId) throw new WebinarActionError('missing_org', 'Organização não identificada.');

  const allowed = Object.values(WEBINAR_STATUS);
  if (!allowed.includes(status)) {
    throw new WebinarActionError('invalid_status', `Status inválido: ${status}`);
  }

  const { data, error } = await supabase
    .from('webinars')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('org_id', orgId)
    .select('id, title, status')
    .single();

  if (error) {
    throw new WebinarActionError('update_failed', error.message);
  }

  const label =
    status === WEBINAR_STATUS.LIVE ? 'iniciado ao vivo'
    : status === WEBINAR_STATUS.ENDED ? 'encerrado'
    : `atualizado para ${status}`;

  await logAudit({
    orgId,
    userId,
    action: AUDIT_ACTION_BY_STATUS[status] || 'update',
    entityType: 'webinar',
    entityId: id,
    description: `Webinário "${data.title}" ${label}`,
    metadata: { status },
  });

  return data;
}

/** Atalho: coloca o webinário ao vivo. */
export const goLiveWebinar = (params) =>
  setWebinarStatus({ ...params, status: WEBINAR_STATUS.LIVE });

/** Atalho: encerra o webinário. */
export const endLiveWebinar = (params) =>
  setWebinarStatus({ ...params, status: WEBINAR_STATUS.ENDED });
