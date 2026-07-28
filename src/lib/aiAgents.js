export const AI_AGENT_TYPES = {
  WEBINAR_BUILDER: 'webinar_builder',
  CONVERSION_ANALYST: 'conversion_analyst',
  INTEGRATION_DEBUGGER: 'integration_debugger',
  FOLLOW_UP: 'follow_up',
};

export const AI_AGENT_LABELS = {
  [AI_AGENT_TYPES.WEBINAR_BUILDER]: 'Gerador de webinar',
  [AI_AGENT_TYPES.CONVERSION_ANALYST]: 'Analista de conversão',
  [AI_AGENT_TYPES.INTEGRATION_DEBUGGER]: 'Diagnóstico de integração',
  [AI_AGENT_TYPES.FOLLOW_UP]: 'Follow-up inteligente',
};

const SUPPORTED_TYPES = new Set(Object.values(AI_AGENT_TYPES));
const SENSITIVE_KEYS = new Set([
  'secret',
  'token',
  'access_token',
  'refresh_token',
  'client_secret',
  'basic_token',
  'api_key',
  'hottok',
  'password',
]);

function cleanString(value) {
  if (value == null) return '';
  return String(value).trim();
}

function sanitizeValue(value) {
  if (Array.isArray(value)) return value.map(sanitizeValue);
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !SENSITIVE_KEYS.has(key.toLowerCase()))
      .map(([key, entry]) => [key, sanitizeValue(entry)])
  );
}

export function validateAgentType(agentType) {
  const normalized = cleanString(agentType);
  if (!SUPPORTED_TYPES.has(normalized)) {
    return {
      ok: false,
      error: 'unsupported_agent_type',
      supported: [...SUPPORTED_TYPES],
    };
  }
  return { ok: true, agentType: normalized };
}

export function buildAgentRunPayload({
  orgId,
  userId,
  agentType,
  targetType = null,
  targetId = null,
  input = {},
}) {
  const validation = validateAgentType(agentType);
  if (!validation.ok) return validation;
  if (!cleanString(orgId)) return { ok: false, error: 'missing_org_id' };
  if (!cleanString(userId)) return { ok: false, error: 'missing_user_id' };

  return {
    ok: true,
    run: {
      org_id: cleanString(orgId),
      created_by: cleanString(userId),
      agent_type: validation.agentType,
      target_type: targetType ? cleanString(targetType) : null,
      target_id: targetId ? cleanString(targetId) : null,
      status: 'queued',
      input_context: sanitizeValue(input || {}),
    },
  };
}

export function normalizeAgentOutput(output) {
  if (typeof output === 'string') {
    return {
      summary: output,
      recommendations: [],
      artifacts: [],
      raw: output,
    };
  }

  const safe = output && typeof output === 'object' ? output : {};
  const recommendations = Array.isArray(safe.recommendations)
    ? safe.recommendations.map(cleanString).filter(Boolean)
    : [];
  const artifacts = Array.isArray(safe.artifacts)
    ? safe.artifacts
        .filter((artifact) => artifact && typeof artifact === 'object')
        .map((artifact) => ({
          type: cleanString(artifact.type) || 'note',
          title: cleanString(artifact.title) || 'Artefato',
          content: artifact.content ?? '',
        }))
    : [];

  return {
    summary: cleanString(safe.summary || safe.text || safe.message || ''),
    recommendations,
    artifacts,
    raw: safe,
  };
}

export function summarizeAgentContext({
  webinar = null,
  registrations = [],
  analyticsEvents = [],
  webhookEvents = [],
  mappings = [],
  integrations = [],
} = {}) {
  return {
    webinar: webinar
      ? {
          id: webinar.id,
          title: webinar.title,
          status: webinar.status,
          type: webinar.type,
          scheduled_at: webinar.scheduled_at,
        }
      : null,
    counts: {
      registrations: registrations.length,
      analyticsEvents: analyticsEvents.length,
      webhookEvents: webhookEvents.length,
      mappings: mappings.length,
      integrations: integrations.length,
    },
    recentWebhookEvents: webhookEvents.slice(0, 10).map((event) => ({
      provider: event.provider,
      event_type: event.event_type,
      product_id: event.product_id,
      status: event.status,
      error_message: event.error_message,
      received_at: event.received_at,
    })),
    mappings: mappings.slice(0, 20).map((mapping) => ({
      provider: mapping.provider,
      provider_product_id: mapping.provider_product_id,
      provider_offer_id: mapping.provider_offer_id,
      product_name: mapping.product_name,
      webinar_id: mapping.webinar_id,
      enabled: mapping.enabled,
    })),
  };
}
