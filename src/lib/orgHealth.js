/**
 * Nota de saúde de uma organização (0–100) a partir dos indicadores de valor entregue.
 * Função pura: recebe uma linha de `get_platform_org_health` e devolve nota, classe e sinais.
 *
 * ÚNICO ponto de configuração da nota. Os valores abaixo são PROVISÓRIOS
 * (spec valor-saude-planos) e devem ser recalibrados com dados reais.
 */

export const HEALTH_WEIGHTS = Object.freeze({
  recency: 0.4, // dias desde a última inscrição
  trend: 0.25, // inscrições no período vs período anterior
  attendance: 0.15, // taxa de presença
  sales: 0.2, // houve venda atribuída no período
});

export const HEALTH_CUTOFFS = Object.freeze({ healthy: 70, attention: 40 });

/** Orgs mais novas que isso aparecem como "nova", nunca como "risco". */
export const NEW_ORG_GRACE_DAYS = 14;

/** Até RECENCY_FULL_DAYS sem inscrição = sinal cheio; a partir de RECENCY_ZERO_DAYS = zero. */
export const RECENCY_FULL_DAYS = 7;
export const RECENCY_ZERO_DAYS = 30;

/** Taxa de presença considerada plena para o sinal de presença. */
export const ATTENDANCE_TARGET = 0.4;

export const HEALTH_CLASS = Object.freeze({
  HEALTHY: 'healthy',
  ATTENTION: 'attention',
  RISK: 'risk',
  NEW: 'new',
  UNKNOWN: 'unknown',
});

/** Ordem de urgência para listagens: o que exige ação primeiro. */
export const HEALTH_CLASS_ORDER = Object.freeze([
  HEALTH_CLASS.RISK,
  HEALTH_CLASS.ATTENTION,
  HEALTH_CLASS.UNKNOWN,
  HEALTH_CLASS.NEW,
  HEALTH_CLASS.HEALTHY,
]);

const DAY_MS = 24 * 60 * 60 * 1000;

const toNumber = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const toTime = (v) => {
  if (!v) return null;
  const t = new Date(v).getTime();
  return Number.isNaN(t) ? null : t;
};

function recencyRatio(lastRegistrationAt, now) {
  const last = toTime(lastRegistrationAt);
  if (last === null) return { value: null, ratio: 0 };
  const days = Math.max(0, (now - last) / DAY_MS);
  let ratio;
  if (days <= RECENCY_FULL_DAYS) ratio = 1;
  else if (days >= RECENCY_ZERO_DAYS) ratio = 0;
  else ratio = 1 - (days - RECENCY_FULL_DAYS) / (RECENCY_ZERO_DAYS - RECENCY_FULL_DAYS);
  return { value: Math.floor(days), ratio };
}

function trendRatio(current, previous) {
  const cur = toNumber(current.registrations);
  const prev = toNumber(previous.registrations);
  if (prev === 0) return { value: { current: cur, previous: prev }, ratio: cur > 0 ? 1 : 0 };
  return { value: { current: cur, previous: prev }, ratio: clamp01(cur / prev) };
}

function attendanceRatio(current) {
  const regs = toNumber(current.registrations);
  if (regs === 0) return { value: null, ratio: 0 };
  const rate = toNumber(current.attendees) / regs;
  return { value: rate, ratio: clamp01(rate / ATTENDANCE_TARGET) };
}

function salesRatio(current) {
  const sales = toNumber(current.approved_purchases);
  return { value: sales, ratio: sales > 0 ? 1 : 0 };
}

export function classifyScore(score) {
  if (score >= HEALTH_CUTOFFS.healthy) return HEALTH_CLASS.HEALTHY;
  if (score >= HEALTH_CUTOFFS.attention) return HEALTH_CLASS.ATTENTION;
  return HEALTH_CLASS.RISK;
}

/**
 * @param {{ current?: object, previous?: object, last_registration_at?: string|null, created_at?: string }} row
 * @param {number} [now=Date.now()]
 * @returns {{
 *   score: number|null,
 *   classification: string,
 *   complete: boolean,
 *   signals: Array<{ key: string, weight: number, value: any, ratio: number }>
 * }}
 */
export function scoreOrgHealth(row, now = Date.now()) {
  const current = row?.current;
  const previous = row?.previous;
  if (!current || typeof current !== 'object' || !previous || typeof previous !== 'object') {
    return { score: null, classification: HEALTH_CLASS.UNKNOWN, complete: false, signals: [] };
  }

  const parts = {
    recency: recencyRatio(row.last_registration_at, now),
    trend: trendRatio(current, previous),
    attendance: attendanceRatio(current),
    sales: salesRatio(current),
  };

  const signals = Object.entries(HEALTH_WEIGHTS).map(([key, weight]) => ({
    key,
    weight,
    value: parts[key].value,
    ratio: parts[key].ratio,
  }));

  const score = Math.round(100 * signals.reduce((sum, s) => sum + s.weight * s.ratio, 0));

  const createdAt = toTime(row.created_at);
  const isNew = createdAt !== null && now - createdAt < NEW_ORG_GRACE_DAYS * DAY_MS;

  return {
    score,
    classification: isNew ? HEALTH_CLASS.NEW : classifyScore(score),
    complete: true,
    signals,
  };
}

/** Ordena por urgência (classe) e, dentro da classe, pela menor nota primeiro. */
export function compareByUrgency(a, b) {
  const ca = HEALTH_CLASS_ORDER.indexOf(a.health.classification);
  const cb = HEALTH_CLASS_ORDER.indexOf(b.health.classification);
  if (ca !== cb) return ca - cb;
  return (a.health.score ?? 101) - (b.health.score ?? 101);
}
