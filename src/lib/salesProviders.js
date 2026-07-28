const APPROVED_STATUS = new Set(['approved', 'purchase_approved', 'completed', 'paid']);

function cleanString(value) {
  if (value == null) return '';
  return String(value).trim();
}

function cleanLower(value) {
  return cleanString(value).toLowerCase();
}

function toCents(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.round(number * 100);
}

function normalizeEventType(event, status) {
  const rawEvent = cleanLower(event).replaceAll('-', '_').replaceAll('.', '_');
  const rawStatus = cleanLower(status).replaceAll('-', '_').replaceAll('.', '_');

  if (
    rawEvent.includes('approved') ||
    rawEvent.includes('paid') ||
    rawEvent.includes('completed') ||
    APPROVED_STATUS.has(rawStatus)
  ) {
    return 'purchase_approved';
  }

  if (rawEvent.includes('cancel') || rawStatus.includes('cancel')) return 'purchase_canceled';
  if (rawEvent.includes('refund') || rawStatus.includes('refund')) return 'purchase_refunded';
  if (rawEvent.includes('chargeback') || rawStatus.includes('chargeback')) return 'purchase_chargeback';

  return rawEvent || rawStatus || 'purchase_event';
}

export function buildProviderEventId({ provider, transactionId, eventType, status }) {
  return [
    cleanLower(provider) || 'unknown',
    cleanString(transactionId) || 'no-transaction',
    cleanString(eventType) || 'event',
    cleanLower(status) || 'unknown',
  ].join(':');
}

export function validateProviderWebhookSecret({ received, expected }) {
  const receivedValue = cleanString(received);
  const expectedValue = cleanString(expected);
  if (!receivedValue || !expectedValue) return false;
  if (receivedValue.length !== expectedValue.length) return false;

  let diff = 0;
  for (let i = 0; i < receivedValue.length; i += 1) {
    diff |= receivedValue.charCodeAt(i) ^ expectedValue.charCodeAt(i);
  }
  return diff === 0;
}

export function shouldProcessProviderEvent(providerEventId, processedIds) {
  if (!providerEventId) return false;
  return !processedIds?.has(providerEventId);
}

export function normalizeHotmartWebhook(payload = {}) {
  const data = payload.data || payload;
  const purchase = data.purchase || data.purchase_data || {};
  const product = data.product || {};
  const buyer = data.buyer || data.customer || {};
  const event = cleanString(payload.event || payload.event_type || data.event);
  const status = cleanString(purchase.status || data.status || payload.status);
  const transactionId = cleanString(
    purchase.transaction || purchase.transaction_id || data.transaction || data.transaction_id
  );
  const eventType = normalizeEventType(event, status);

  return {
    provider: 'hotmart',
    providerEventId: buildProviderEventId({
      provider: 'hotmart',
      transactionId,
      eventType: event || eventType,
      status,
    }),
    transactionId,
    eventType,
    status: cleanLower(status),
    productId: cleanString(product.id || data.product_id || data.productId),
    productName: cleanString(product.name || data.product_name || data.productName),
    buyerEmail: cleanLower(buyer.email || data.buyer_email || data.email),
    buyerName: cleanString(buyer.name || data.buyer_name || data.name),
    amountCents: toCents(purchase.price?.value ?? purchase.value ?? data.amount ?? data.price),
    currency: cleanString(purchase.price?.currency_code || data.currency || 'BRL').toUpperCase(),
    rawPayload: payload,
  };
}

export function normalizeSelfluxWebhook(payload = {}) {
  const customer = payload.customer || payload.buyer || payload.client || {};
  const product = payload.product || payload.offer || {};
  const event = cleanString(payload.event || payload.event_type || payload.type);
  const status = cleanString(payload.status || payload.payment_status || payload.sale_status);
  const transactionId = cleanString(
    payload.transaction_id || payload.transactionId || payload.transaction || payload.sale_id || payload.order_id
  );
  const eventType = normalizeEventType(event, status);

  return {
    provider: 'selflux',
    providerEventId: buildProviderEventId({
      provider: 'selflux',
      transactionId,
      eventType: event || eventType,
      status,
    }),
    transactionId,
    eventType,
    status: cleanLower(status),
    productId: cleanString(
      payload.offer_id || payload.product_id || payload.productId || product.id || product.offer_id
    ),
    productName: cleanString(product.name || payload.product_name || payload.offer_name),
    buyerEmail: cleanLower(customer.email || payload.customer_email || payload.buyer_email || payload.email),
    buyerName: cleanString(customer.name || payload.customer_name || payload.buyer_name || payload.name),
    amountCents: toCents(payload.amount ?? payload.total ?? payload.price ?? payload.value),
    currency: cleanString(payload.currency || 'BRL').toUpperCase(),
    rawPayload: payload,
  };
}

export const SALES_PROVIDERS = {
  HOTMART: 'hotmart',
  SELFLUX: 'selflux',
};

export function isSupportedSalesProvider(provider) {
  return provider === 'hotmart' || provider === 'selflux';
}

export function isApprovedPurchaseEvent(normalized) {
  if (!normalized) return false;
  return normalized.eventType === 'purchase_approved';
}

/**
 * Validate required credential fields before save.
 * @param {string} provider
 * @param {Record<string, string>} credentials
 */
export function validateCredentialFields(provider, credentials = {}) {
  const c = credentials || {};
  const missing = [];

  if (provider === 'hotmart') {
    if (!cleanString(c.client_id)) missing.push('client_id');
    if (!cleanString(c.client_secret) && !cleanString(c.basic_token)) {
      missing.push('client_secret_or_basic_token');
    }
    if (!cleanString(c.hottok) && !cleanString(c.webhook_secret)) {
      missing.push('hottok');
    }
  } else if (provider === 'selflux') {
    if (!cleanString(c.api_key)) missing.push('api_key');
    if (!cleanString(c.webhook_secret)) missing.push('webhook_secret');
  } else {
    return { ok: false, missing: ['provider'] };
  }

  return { ok: missing.length === 0, missing };
}

/**
 * Extract webhook secret from request headers / body.
 * @param {string} provider
 * @param {{ get?: Function }|Record<string,string>} headers
 * @param {object} [body]
 */
export function extractWebhookSecret(provider, headers, body = {}) {
  const get = (name) => {
    if (!headers) return null;
    if (typeof headers.get === 'function') {
      return headers.get(name) || headers.get(name.toLowerCase());
    }
    const key = Object.keys(headers).find((k) => k.toLowerCase() === name.toLowerCase());
    return key ? headers[key] : null;
  };

  if (provider === 'hotmart') {
    return (
      get('X-HOTMART-HOTTOK') ||
      get('X-Hotmart-Hottok') ||
      get('hottok') ||
      body?.hottok ||
      body?.data?.hottok ||
      null
    );
  }

  if (provider === 'selflux') {
    const auth = get('Authorization');
    return (
      get('X-Webhook-Secret') ||
      get('X-Selflux-Secret') ||
      get('X-Api-Key') ||
      (auth ? String(auth).replace(/^Bearer\s+/i, '') : null) ||
      body?.webhook_secret ||
      body?.api_key ||
      null
    );
  }

  return get('X-Gablive-Webhook-Secret') || null;
}

/**
 * Validate webhook secret against stored secrets for the provider.
 * @param {string} provider
 * @param {string|null} provided
 * @param {Record<string, string>} storedSecrets
 */
export function validateWebhookAgainstStored(provider, provided, storedSecrets = {}) {
  if (!provided) return { valid: false, reason: 'missing_webhook_secret' };

  if (provider === 'hotmart') {
    const expected = storedSecrets.hottok || storedSecrets.webhook_secret;
    if (!expected) return { valid: false, reason: 'integration_not_configured' };
    return validateProviderWebhookSecret({ received: provided, expected })
      ? { valid: true, reason: 'ok' }
      : { valid: false, reason: 'invalid_webhook_secret' };
  }

  if (provider === 'selflux') {
    const candidates = [storedSecrets.webhook_secret, storedSecrets.api_key].filter(Boolean);
    if (candidates.length === 0) return { valid: false, reason: 'integration_not_configured' };
    const ok = candidates.some((expected) =>
      validateProviderWebhookSecret({ received: provided, expected })
    );
    return ok
      ? { valid: true, reason: 'ok' }
      : { valid: false, reason: 'invalid_webhook_secret' };
  }

  return { valid: false, reason: 'unsupported_provider' };
}

/**
 * @param {string} provider
 * @param {object} payload
 */
export function normalizeProviderWebhook(provider, payload) {
  if (provider === 'hotmart') return normalizeHotmartWebhook(payload);
  if (provider === 'selflux') return normalizeSelfluxWebhook(payload);
  throw new Error(`Unsupported provider: ${provider}`);
}

/**
 * Provider setup instructions for the dashboard UI.
 * @param {string} provider
 * @param {{ webhookUrl?: string }} [ctx]
 */
export function getProviderSetupInstructions(provider, ctx = {}) {
  const webhookUrl = ctx.webhookUrl || '';

  if (provider === 'hotmart') {
    return {
      title: 'Hotmart',
      fields: [
        { key: 'client_id', label: 'Client ID', secret: false },
        { key: 'client_secret', label: 'Client Secret', secret: true },
        { key: 'basic_token', label: 'Basic Token (opcional)', secret: true },
        { key: 'hottok', label: 'Hottok (webhook)', secret: true },
      ],
      steps: [
        'No Hotmart, crie credenciais de API (Client ID e Client Secret).',
        'Configure um webhook de compra apontando para a URL abaixo.',
        'Use o Hottok gerado pela Hotmart como segredo do webhook.',
        'Mapeie o product/offer ID para o webinar correspondente.',
      ],
      webhookUrl,
      webhookHeaders: 'X-HOTMART-HOTTOK: <seu hottok>',
    };
  }

  if (provider === 'selflux') {
    return {
      title: 'Selflux',
      fields: [
        { key: 'api_key', label: 'API Key', secret: true },
        { key: 'webhook_secret', label: 'Webhook Secret', secret: true },
      ],
      steps: [
        'No painel Selflux/SellFlux, gere uma API Key.',
        'Configure o webhook de compra aprovada com a URL abaixo.',
        'Envie o webhook secret no header X-Webhook-Secret (ou X-Api-Key).',
        'Mapeie product/offer ID para o webinar da organização.',
      ],
      webhookUrl,
      webhookHeaders: 'X-Webhook-Secret: <seu segredo>',
    };
  }

  return null;
}
