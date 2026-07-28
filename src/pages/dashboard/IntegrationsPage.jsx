import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useOrg } from '../../contexts/OrgContext';
import {
  buildWebhookUrl,
  callManageSalesIntegration,
  createProductMapping,
  deleteProductMapping,
  fetchIntegrations,
  fetchOrgWebinars,
  fetchProductMappings,
  fetchProviderProducts,
  fetchWebhookEvents,
  updateProductMapping,
} from '../../lib/salesIntegrationApi';
import { getProviderSetupInstructions, validateCredentialFields } from '../../lib/salesProviders';
import { logAudit } from '../../lib/audit';
import {
  Plug, Save, RefreshCw, Copy, CheckCircle, AlertCircle, Loader2,
  Link2, Trash2, Eye, EyeOff, ExternalLink,
} from 'lucide-react';
import './IntegrationsPage.css';

const PROVIDERS = [
  { key: 'hotmart', label: 'Hotmart' },
  { key: 'selflux', label: 'Selflux' },
];

const EMPTY_CREDS = {
  hotmart: { client_id: '', client_secret: '', basic_token: '', hottok: '' },
  selflux: { api_key: '', webhook_secret: '' },
};

export default function IntegrationsPage() {
  const { user } = useAuth();
  const { orgId } = useOrg();

  const [loading, setLoading] = useState(true);
  const [activeProvider, setActiveProvider] = useState('hotmart');
  const [integrations, setIntegrations] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [webinars, setWebinars] = useState([]);
  const [events, setEvents] = useState([]);
  const [creds, setCreds] = useState(EMPTY_CREDS);
  const [showSecrets, setShowSecrets] = useState({});
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [providerProducts, setProviderProducts] = useState([]);
  const [message, setMessage] = useState(null);
  const [copied, setCopied] = useState(false);

  const [mapForm, setMapForm] = useState({
    provider: 'hotmart',
    provider_product_id: '',
    provider_offer_id: '',
    product_name: '',
    webinar_id: '',
  });
  const [mapSaving, setMapSaving] = useState(false);

  const integrationByProvider = useMemo(() => {
    const map = {};
    for (const row of integrations) map[row.provider] = row;
    return map;
  }, [integrations]);

  const webhookUrl = useMemo(
    () => (orgId ? buildWebhookUrl(activeProvider, orgId) : ''),
    [activeProvider, orgId],
  );

  const instructions = useMemo(
    () => getProviderSetupInstructions(activeProvider, { webhookUrl }),
    [activeProvider, webhookUrl],
  );

  const currentIntegration = integrationByProvider[activeProvider] || null;
  const mappingIntegration = integrationByProvider[mapForm.provider] || null;

  const loadAll = useCallback(async () => {
    if (!orgId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [ints, maps, webs, evts] = await Promise.all([
        fetchIntegrations(orgId),
        fetchProductMappings(orgId),
        fetchOrgWebinars(orgId),
        fetchWebhookEvents(orgId, 15),
      ]);
      setIntegrations(ints);
      setMappings(maps);
      setWebinars(webs);
      setEvents(evts);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Erro ao carregar integrações.' });
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const flash = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4500);
  };

  const handleCredChange = (field, value) => {
    setCreds((prev) => ({
      ...prev,
      [activeProvider]: { ...prev[activeProvider], [field]: value },
    }));
  };

  const handleSave = async () => {
    if (!orgId) return;
    setSaving(true);
    try {
      const credentials = { ...creds[activeProvider] };
      // Drop empty secret fields so rotation keeps previous values server-side
      for (const key of Object.keys(credentials)) {
        if (!String(credentials[key] || '').trim()) delete credentials[key];
      }

      // If never configured, require full fields client-side (reuse shared rules)
      if (!currentIntegration?.credentials_configured) {
        const { ok, missing } = validateCredentialFields(activeProvider, credentials);
        if (!ok) {
          flash('error', `Preencha: ${missing.join(', ')}`);
          setSaving(false);
          return;
        }
      }

      const data = await callManageSalesIntegration({
        action: 'save',
        org_id: orgId,
        provider: activeProvider,
        credentials,
        enabled: currentIntegration?.enabled ?? true,
      });

      // Clear secret inputs after save
      setCreds((prev) => ({
        ...prev,
        [activeProvider]: { ...EMPTY_CREDS[activeProvider] },
      }));

      if (data.integration) {
        setIntegrations((prev) => {
          const others = prev.filter((i) => i.provider !== activeProvider);
          return [...others, data.integration];
        });
      } else {
        await loadAll();
      }
      flash('success', 'Credenciais salvas. Segredos não são exibidos após salvar.');
    } catch (err) {
      flash('error', err.message || 'Falha ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!orgId) return;
    setTesting(true);
    try {
      const data = await callManageSalesIntegration({
        action: 'test',
        org_id: orgId,
        provider: activeProvider,
      });
      flash(data.ok ? 'success' : 'error', data.message || (data.ok ? 'OK' : 'Falha no teste'));
      await loadAll();
    } catch (err) {
      flash('error', err.message || 'Falha ao testar.');
    } finally {
      setTesting(false);
    }
  };

  const handleToggleEnabled = async () => {
    if (!orgId || !currentIntegration) return;
    try {
      const next = !currentIntegration.enabled;
      const data = await callManageSalesIntegration({
        action: 'set_enabled',
        org_id: orgId,
        provider: activeProvider,
        enabled: next,
      });
      if (data.integration) {
        setIntegrations((prev) =>
          prev.map((i) => (i.provider === activeProvider ? { ...i, enabled: next } : i)),
        );
      }
      flash('success', next ? 'Integração habilitada.' : 'Integração desabilitada.');
    } catch (err) {
      flash('error', err.message || 'Falha ao atualizar status.');
    }
  };

  const handleCopyWebhook = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      flash('error', 'Não foi possível copiar a URL.');
    }
  };

  const handleCreateMapping = async (e) => {
    e.preventDefault();
    if (!orgId) return;
    if (!mapForm.provider_product_id.trim() || !mapForm.webinar_id) {
      flash('error', 'Product ID e webinar são obrigatórios.');
      return;
    }
    setMapSaving(true);
    try {
      const row = await createProductMapping({
        org_id: orgId,
        provider: mapForm.provider,
        provider_product_id: mapForm.provider_product_id.trim(),
        provider_offer_id: mapForm.provider_offer_id.trim() || null,
        product_name: mapForm.product_name.trim() || null,
        webinar_id: mapForm.webinar_id,
        enabled: true,
        conversion_events: ['purchase_approved'],
      });
      setMappings((prev) => [row, ...prev]);
      setMapForm({
        provider: mapForm.provider,
        provider_product_id: '',
        provider_offer_id: '',
        product_name: '',
        webinar_id: '',
      });
      if (user?.id) {
        await logAudit({
          orgId,
          userId: user.id,
          action: 'create',
          entityType: 'provider_product_mapping',
          entityId: row.id,
          description: `Mapped ${row.provider} product ${row.provider_product_id} → webinar`,
        });
      }
      flash('success', 'Mapeamento criado.');
    } catch (err) {
      flash('error', err.message || 'Falha ao criar mapeamento.');
    } finally {
      setMapSaving(false);
    }
  };

  const handleLoadProducts = async () => {
    if (!orgId) return;
    setLoadingProducts(true);
    try {
      const products = await fetchProviderProducts({ orgId, provider: mapForm.provider });
      setProviderProducts(products);
      flash(
        'success',
        products.length
          ? `${products.length} produto(s) carregado(s) da Hotmart.`
          : 'Nenhum produto retornado pela Hotmart.',
      );
    } catch (err) {
      setProviderProducts([]);
      flash('error', err.message || 'Falha ao buscar produtos do provider.');
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleSelectProviderProduct = (productId) => {
    const product = providerProducts.find((p) => p.id === productId || p.ucode === productId);
    setMapForm((f) => ({
      ...f,
      provider_product_id: product?.id || productId,
      product_name: product?.name || f.product_name,
    }));
  };

  const handleToggleMapping = async (mapping) => {
    try {
      const updated = await updateProductMapping(mapping.id, { enabled: !mapping.enabled });
      setMappings((prev) => prev.map((m) => (m.id === mapping.id ? updated : m)));
    } catch (err) {
      flash('error', err.message || 'Falha ao atualizar mapeamento.');
    }
  };

  const handleDeleteMapping = async (mapping) => {
    if (!window.confirm(`Remover mapeamento ${mapping.provider_product_id}?`)) return;
    try {
      await deleteProductMapping(mapping.id);
      setMappings((prev) => prev.filter((m) => m.id !== mapping.id));
      flash('success', 'Mapeamento removido.');
    } catch (err) {
      flash('error', err.message || 'Falha ao remover.');
    }
  };

  const webinarTitle = (id) => webinars.find((w) => w.id === id)?.title || id?.slice(0, 8);

  if (loading) {
    return (
      <div className="integrations-page">
        <div className="integrations-loading">
          <div className="spinner spinner-lg" />
        </div>
      </div>
    );
  }

  if (!orgId) {
    return (
      <div className="integrations-page">
        <div className="settings-alert settings-alert--error">
          <AlertCircle size={16} /> Organização não encontrada.
        </div>
      </div>
    );
  }

  return (
    <div className="integrations-page">
      <header className="integrations-header">
        <div>
          <h1>
            <Plug size={24} /> Integrações de vendas
          </h1>
          <p className="integrations-subtitle">
            Conecte Hotmart e Selflux, configure o webhook e mapeie produtos para webinars.
          </p>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={loadAll}>
          <RefreshCw size={16} /> Atualizar
        </button>
      </header>

      {message && (
        <div
          className={`settings-alert settings-alert--${message.type === 'success' ? 'success' : 'error'}`}
          role="status"
        >
          {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {message.text}
        </div>
      )}

      <div className="integrations-provider-tabs" role="tablist">
        {PROVIDERS.map((p) => {
          const int = integrationByProvider[p.key];
          return (
            <button
              key={p.key}
              type="button"
              role="tab"
              aria-selected={activeProvider === p.key}
              className={`integrations-tab ${activeProvider === p.key ? 'active' : ''}`}
              onClick={() => setActiveProvider(p.key)}
            >
              {p.label}
              {int?.enabled && <span className="integrations-tab-dot" title="Habilitado" />}
            </button>
          );
        })}
      </div>

      <section className="integrations-card">
        <div className="integrations-section-header">
          <h2>{instructions?.title}</h2>
          <div className="integrations-status-pills">
            <span className={`pill ${currentIntegration?.credentials_configured ? 'pill--ok' : 'pill--muted'}`}>
              {currentIntegration?.credentials_configured ? 'Credenciais salvas' : 'Não configurado'}
            </span>
            <span className={`pill ${currentIntegration?.enabled ? 'pill--ok' : 'pill--muted'}`}>
              {currentIntegration?.enabled ? 'Ativo' : 'Inativo'}
            </span>
            {currentIntegration?.last_test_status && (
              <span
                className={`pill ${currentIntegration.last_test_status === 'success' ? 'pill--ok' : 'pill--err'}`}
                title={currentIntegration.last_test_message || ''}
              >
                Último teste: {currentIntegration.last_test_status}
              </span>
            )}
          </div>
        </div>

        <ol className="integrations-steps">
          {(instructions?.steps || []).map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>

        <div className="integrations-webhook-box">
          <label htmlFor="webhook-url">URL do webhook</label>
          <div className="integrations-webhook-row">
            <input id="webhook-url" name="webhook_url" className="input" readOnly value={webhookUrl} />
            <button type="button" className="btn btn-secondary btn-sm" onClick={handleCopyWebhook}>
              {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>
          <p className="integrations-hint">
            Header: <code>{instructions?.webhookHeaders}</code>
          </p>
        </div>

        <div className="integrations-form-grid">
          {(instructions?.fields || []).map((field) => {
            const isSecret = field.secret;
            const visible = showSecrets[field.key];
            return (
              <div key={field.key} className="form-group">
                <label htmlFor={`cred-${field.key}`}>
                  {field.label}
                  {currentIntegration?.credentials_configured && (
                    <span className="integrations-hint-inline"> — deixe em branco para manter</span>
                  )}
                </label>
                <div className="integrations-secret-row">
                  <input
                    id={`cred-${field.key}`}
                    name={`credential_${activeProvider}_${field.key}`}
                    className="input"
                    type={isSecret && !visible ? 'password' : 'text'}
                    autoComplete="off"
                    placeholder={
                      currentIntegration?.credentials_configured ? '••••••••' : undefined
                    }
                    value={creds[activeProvider][field.key] || ''}
                    onChange={(e) => handleCredChange(field.key, e.target.value)}
                  />
                  {isSecret && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-icon"
                      aria-label={visible ? 'Ocultar' : 'Mostrar'}
                      onClick={() =>
                        setShowSecrets((s) => ({ ...s, [field.key]: !s[field.key] }))
                      }
                    >
                      {visible ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="integrations-actions">
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
            Salvar credenciais
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleTest}
            disabled={testing || !currentIntegration?.credentials_configured}
          >
            {testing ? <Loader2 size={16} className="spin" /> : <ExternalLink size={16} />}
            Testar conexão
          </button>
          {currentIntegration && (
            <button type="button" className="btn btn-ghost" onClick={handleToggleEnabled}>
              {currentIntegration.enabled ? 'Desabilitar' : 'Habilitar'}
            </button>
          )}
        </div>
      </section>

      <section className="integrations-card">
        <div className="integrations-section-header">
          <h2>
            <Link2 size={18} /> Mapeamento produto/oferta → webinar
          </h2>
        </div>
        <p className="integrations-subtitle">
          Compras aprovadas com product/offer mapeados geram evento de conversão no webinar.
          Duplicados não contam duas vezes.
        </p>

        <form className="integrations-map-form" onSubmit={handleCreateMapping}>
          <div className="form-group">
            <label htmlFor="map-provider">Provider</label>
            <select
              id="map-provider"
              name="provider"
              className="input"
              value={mapForm.provider}
              onChange={(e) => setMapForm((f) => ({ ...f, provider: e.target.value }))}
            >
              {PROVIDERS.map((p) => (
                <option key={p.key} value={p.key}>{p.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="provider-products">Produtos do provider</label>
            <div className="integrations-webhook-row">
              <select
                id="provider-products"
                name="provider_product_select"
                className="input"
                value=""
                onChange={(e) => handleSelectProviderProduct(e.target.value)}
                disabled={providerProducts.length === 0}
              >
                <option value="">
                  {providerProducts.length ? 'Selecione um produto...' : 'Nenhum produto carregado'}
                </option>
                {providerProducts.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} — {product.id}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleLoadProducts}
                disabled={loadingProducts || mapForm.provider !== 'hotmart' || !mappingIntegration?.credentials_configured}
              >
                {loadingProducts ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
                Buscar
              </button>
            </div>
            <p className="integrations-hint">
              Busca produtos na Hotmart usando as credenciais salvas. Para Selflux, preencha manualmente por enquanto.
            </p>
          </div>
          <div className="form-group">
            <label htmlFor="map-product">Product ID *</label>
            <input
              id="map-product"
              name="provider_product_id"
              className="input"
              value={mapForm.provider_product_id}
              onChange={(e) => setMapForm((f) => ({ ...f, provider_product_id: e.target.value }))}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="map-offer">Offer ID (opcional)</label>
            <input
              id="map-offer"
              name="provider_offer_id"
              className="input"
              value={mapForm.provider_offer_id}
              onChange={(e) => setMapForm((f) => ({ ...f, provider_offer_id: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label htmlFor="map-name">Nome do produto</label>
            <input
              id="map-name"
              name="product_name"
              className="input"
              value={mapForm.product_name}
              onChange={(e) => setMapForm((f) => ({ ...f, product_name: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label htmlFor="map-webinar">Webinar *</label>
            <select
              id="map-webinar"
              name="webinar_id"
              className="input"
              value={mapForm.webinar_id}
              onChange={(e) => setMapForm((f) => ({ ...f, webinar_id: e.target.value }))}
              required
            >
              <option value="">Selecione…</option>
              {webinars.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.title} ({w.status})
                </option>
              ))}
            </select>
          </div>
          <div className="form-group integrations-map-submit">
            <button type="submit" className="btn btn-primary" disabled={mapSaving}>
              {mapSaving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
              Adicionar mapeamento
            </button>
          </div>
        </form>

        {mappings.length === 0 ? (
          <p className="integrations-empty">Nenhum mapeamento ainda.</p>
        ) : (
          <div className="integrations-table-wrap">
            <table className="integrations-table">
              <thead>
                <tr>
                  <th>Provider</th>
                  <th>Product</th>
                  <th>Offer</th>
                  <th>Webinar</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {mappings.map((m) => (
                  <tr key={m.id}>
                    <td>{m.provider}</td>
                    <td>
                      <code>{m.provider_product_id}</code>
                      {m.product_name && (
                        <div className="integrations-muted">{m.product_name}</div>
                      )}
                    </td>
                    <td>{m.provider_offer_id || '—'}</td>
                    <td>{webinarTitle(m.webinar_id)}</td>
                    <td>
                      <button
                        type="button"
                        className={`pill ${m.enabled ? 'pill--ok' : 'pill--muted'}`}
                        onClick={() => handleToggleMapping(m)}
                      >
                        {m.enabled ? 'Ativo' : 'Off'}
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-ghost btn-icon"
                        aria-label="Remover mapeamento"
                        onClick={() => handleDeleteMapping(m)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="integrations-card">
        <div className="integrations-section-header">
          <h2>Eventos recentes do webhook</h2>
        </div>
        {events.length === 0 ? (
          <p className="integrations-empty">Nenhum evento recebido ainda.</p>
        ) : (
          <div className="integrations-table-wrap">
            <table className="integrations-table">
              <thead>
                <tr>
                  <th>Quando</th>
                  <th>Provider</th>
                  <th>Evento</th>
                  <th>Product</th>
                  <th>Status</th>
                  <th>Webinar</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => (
                  <tr key={ev.id}>
                    <td>{new Date(ev.received_at).toLocaleString()}</td>
                    <td>{ev.provider}</td>
                    <td>{ev.event_type}</td>
                    <td><code>{ev.product_id || '—'}</code></td>
                    <td>
                      <span
                        className={`pill ${
                          ev.status === 'processed'
                            ? 'pill--ok'
                            : ev.status === 'unmapped' || ev.status === 'failed'
                              ? 'pill--err'
                              : 'pill--muted'
                        }`}
                      >
                        {ev.status}
                      </span>
                    </td>
                    <td>{ev.webinar_id ? webinarTitle(ev.webinar_id) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
