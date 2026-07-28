import { supabase } from './supabase.js';

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://lgmtuabuuarxyfnhidbr.supabase.co';

/**
 * Build public webhook URL for a provider + org.
 */
export function buildWebhookUrl(provider, _orgId) {
  return `${SUPABASE_URL}/functions/v1/receive-integration-webhook/${provider}`;
}

/**
 * Call manage-sales-integration Edge Function.
 * Explicitly gets the session token to avoid race conditions on page load.
 */
export async function callManageSalesIntegration(body) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const { data, error } = await supabase.functions.invoke('manage-sales-integration', {
    body,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (error) {
    const message = error.message || 'Falha na integração';
    throw new Error(message);
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data;
}

/**
 * Fetch provider products from the configured integration credentials.
 */
export async function fetchProviderProducts({ orgId, provider }) {
  const data = await callManageSalesIntegration({
    action: 'list_products',
    org_id: orgId,
    provider,
  });
  return data?.products || [];
}

/**
 * Load integration status rows for the org.
 */
export async function fetchIntegrations(orgId) {
  const data = await callManageSalesIntegration({
    action: 'list_integrations',
    org_id: orgId,
  });
  return data?.integrations || [];
}

/**
 * Fetch product mappings for the org.
 */
export async function fetchProductMappings(orgId, provider) {
  const data = await callManageSalesIntegration({
    action: 'list_mappings',
    org_id: orgId,
    provider,
  });
  return data?.mappings || [];
}

/**
 * Create a product → webinar mapping.
 */
export async function createProductMapping(mapping) {
  const data = await callManageSalesIntegration({
    action: 'create_mapping',
    ...mapping,
  });
  return data?.mapping || data;
}

/**
 * Update a product mapping.
 */
export async function updateProductMapping(id, patch) {
  // Not yet implemented — return stub
  console.warn('updateProductMapping not yet implemented');
  return { id, ...patch };
}

/**
 * Delete a product mapping.
 */
export async function deleteProductMapping(id) {
  const data = await callManageSalesIntegration({
    action: 'delete_mapping',
    mapping_id: id,
  });
  return data;
}

/**
 * Recent webhook events.
 */
export async function fetchWebhookEvents(orgId, limit = 20) {
  const data = await callManageSalesIntegration({
    action: 'list_events',
    org_id: orgId,
    limit,
  });
  return data?.events || [];
}

/**
 * Fetch org webinars for mapping dropdown.
 */
export async function fetchOrgWebinars(orgId) {
  const { data, error } = await supabase
    .from('webinars')
    .select('id, title, status, type, slug')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

/**
 * Call save-integration-config Edge Function.
 * Explicitly gets the session token to avoid race conditions.
 */
export async function callSaveIntegrationConfig(body) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const { data, error } = await supabase.functions.invoke('save-integration-config', {
    body,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data;
}
