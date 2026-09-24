/**
 * Resumo de assentos e assinatura para exibição.
 * A decisão de bloquear o convite é do servidor (`org_seat_status.can_invite`);
 * este módulo só interpreta a resposta para a tela. Funções puras.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export const SUBSCRIPTION_STATUS = Object.freeze({
  TRIAL: 'trial',
  ACTIVE: 'active',
  PAST_DUE: 'past_due',
  CANCELED: 'canceled',
});

/** Erro devolvido pela Edge Function de convite quando o plano está no limite. */
export const SEAT_LIMIT_REACHED = 'seat_limit_reached';

const toCount = (v) => (Number.isFinite(Number(v)) ? Math.max(0, Math.trunc(Number(v))) : 0);

/**
 * @param {{ used?: number, limit?: number|null, can_invite?: boolean, status?: string|null,
 *           trial_ends_at?: string|null, has_subscription?: boolean, plan?: {code: string, name: string}|null }|null} usage
 *   resposta de `get_org_seat_usage`
 * @param {number} [now=Date.now()]
 */
export function summarizeSeats(usage, now = Date.now()) {
  if (!usage || typeof usage !== 'object') return null;

  const used = toCount(usage.used);
  const unlimited = usage.limit === null || usage.limit === undefined || !usage.has_subscription;
  const limit = unlimited ? null : toCount(usage.limit);
  const canInvite = typeof usage.can_invite === 'boolean'
    ? usage.can_invite
    : unlimited || used < limit;

  const trialEndsAt = usage.status === SUBSCRIPTION_STATUS.TRIAL && usage.trial_ends_at
    ? new Date(usage.trial_ends_at).getTime()
    : null;
  const hasTrialDate = trialEndsAt !== null && !Number.isNaN(trialEndsAt);

  return {
    planName: usage.plan?.name ?? null,
    status: usage.status ?? null,
    used,
    limit,
    unlimited,
    remaining: unlimited ? null : Math.max(0, limit - used),
    canInvite,
    overLimit: !unlimited && used > limit,
    trialExpired: hasTrialDate && trialEndsAt <= now,
    trialDaysLeft: hasTrialDate && trialEndsAt > now ? Math.ceil((trialEndsAt - now) / DAY_MS) : null,
  };
}
