# Spec: Fase 0 + 1 — Escala e Conversão (sem WhatsApp)

**Status:** Pronto para Plan/Tasks  
**Data:** 2026-07-24  
**Decisão de produto:** **WhatsApp fora do roadmap.** Canal de recuperação = e-mail apenas (Resend + fila existente). SMS não está no escopo desta release.  
**Origem:** pesquisa fable-loop (mercado + arquitetura Gablive); `PRODUCT.md`; `specs/backlog-v1.5-v2-SPEC.md`.  
**Relação com backlog:** complementa o pós-MVP. **Não substitui** v1 (users/audit/templates/CSV). Pode rodar **em paralelo** à v1 onde as superfícies não colidem; CRM nativo (ActiveCampaign etc.) continua em **v1.5** — aqui entregamos só o **outbox genérico de webhooks**, base do v1.5.

---

## ASSUMPTIONS

1. Stack não muda: React 19 + Vite + Supabase (Postgres/Auth/Realtime/Edge Functions Deno) + Resend + Vercel. Sem TypeScript.
2. Vídeo continua YouTube/Vimeo; sem WebRTC.
3. Checkout externo (Hotmart/Kirvano/Kiwify/Stripe); Gablive **atribui** compras, não processa pagamento.
4. Multi-org agency (vários clientes num login) **fora** desta release — fica Fase 3 futura.
5. IA, Attendance Room, domínio custom, A/B split, chatbot keywords: continuam no backlog v1.5/v2; **não** entram aqui.
6. Integrações externas usam `INTEGRATION_MODE=mock|live` (igual backlog). Em mock, grava payload em `integration_outbox` sem HTTP externo.
7. Mudanças de RLS em tabelas públicas são **breaking** para scrapers; o funil público continua funcional com policies revisadas (SELECT por webinar publicado / INSERT com rate-limit server-side onde possível).

> Corrija qualquer premissa errada antes de implementar.

---

## Objective

Entregar a **fundação de escala** e o **loop de conversão/mídia** que o runtime evergreen ainda não fecha:

| Fase | Objetivo de produto | Sucesso mensurável |
|------|---------------------|--------------------|
| **0 — Escala** | Dashboard e leads corretos além de 1k linhas; writes de analytics sustentáveis; superfície pública menos abusável | RPC de stats retorna totais reais; leads paginados; VIDEO_PROGRESS amostrado; policies apertadas |
| **1 — Conversão** | Oferta com urgência; atribuição UTM+pixel; receita no funil; webhooks genéricos | Operador vê R$/registrante; CTA com countdown/estoque; purchase webhook grava venda; outbox entrega eventos |

**Persona:** operador de funil / agência BR com mídia paga e checkout externo.  
**Não-persona desta release:** plantão WhatsApp, white-label completo, multi-org switcher.

---

## Fora de escopo (explícito)

- WhatsApp / SMS / qualquer BSP de mensageria
- WebRTC / streaming próprio
- Checkout nativo / Firepay / Stripe Connect
- Multi-org membership / portal de cliente
- White-label / domínio custom (v1.5)
- A/B testing (v1.5)
- CRM nativos nomeados (v1.5) — só **webhook genérico**
- Agente de IA / chat simulado por IA (v2)
- Attendance Room (v2)
- Marketplace de templates, app mobile, editor drag-and-drop

---

## Architecture overview

```
Public funnel (SPA)
  register ──► registrations (+ attribution JSONB)
       │              │
       │              ├──► analytics_events (sampled / rate-limited path)
       │              ├──► track-server-event Edge (CAPI / pixel server)
       │              └──► integration_outbox (registration, attend, cta_click, purchase)
       │
  room ──► CTA scarcity UI (countdown / stock)
       │         └── cta_configs (new columns)
       │
External checkout ──► purchase-webhook Edge ──► purchases ──► rollup RPCs
Org dashboard ◄── get_webinar_stats / get_global_stats (no select * raw)
```

**Padrão de fan-out:** tudo que chama terceiros (CAPI, CRM webhook, e-mail) passa por **fila/outbox + worker Edge**, nunca `fetch` aberto no browser para endpoints sem auth (exceto pixel browser legítimo no DOM do cliente).

---

# FASE 0 — Fundações de escala

## 0.1 Analytics server-side (RPC / views)

### Problema

`useAnalytics.js` faz `select *` em `registrations` e `analytics_events`. Supabase `max_rows=1000` (`supabase/config.toml`) **trunca em silêncio** — métricas e CSV mentem a partir de ~1k eventos/leads.

### Solução

**RPC Postgres** (security definer, scoped por membership na org do webinar) que devolve **agregados**, não rows cruas.

```sql
-- migration 005_phase0_scale.sql (trecho conceitual)

CREATE OR REPLACE FUNCTION get_webinar_stats(p_webinar_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  -- AuthZ: caller must belong to webinar's org (or be platform admin — optional later)
  IF NOT EXISTS (
    SELECT 1 FROM webinars w
    JOIN profiles p ON p.org_id = w.org_id
    WHERE w.id = p_webinar_id AND p.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT jsonb_build_object(
    'total_registrations', (SELECT count(*) FROM registrations WHERE webinar_id = p_webinar_id),
    'total_attendees', (SELECT count(*) FROM registrations WHERE webinar_id = p_webinar_id AND attended = true),
    'cta_views', (SELECT count(*) FROM analytics_events WHERE webinar_id = p_webinar_id AND event_type = 'cta_view'),
    'cta_clicks', (SELECT count(*) FROM analytics_events WHERE webinar_id = p_webinar_id AND event_type = 'cta_click'),
    'chat_messages', (SELECT count(*) FROM analytics_events WHERE webinar_id = p_webinar_id AND event_type = 'chat_message'),
    'poll_responses', (SELECT count(*) FROM analytics_events WHERE webinar_id = p_webinar_id AND event_type = 'poll_response'),
    'avg_watch_seconds', (
      SELECT COALESCE(round(avg(max_sec)), 0) FROM (
        SELECT max((event_data->>'seconds')::numeric) AS max_sec
        FROM analytics_events
        WHERE webinar_id = p_webinar_id AND event_type = 'video_progress'
        GROUP BY registration_id
      ) t
    ),
    -- Fase 1 preenche quando purchases existir:
    'revenue_cents', 0,
    'purchases_count', 0
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_webinar_stats(UUID) TO authenticated;
```

**Índices novos:**

```sql
CREATE INDEX IF NOT EXISTS idx_analytics_events_webinar_type
  ON analytics_events (webinar_id, event_type);

CREATE INDEX IF NOT EXISTS idx_analytics_events_webinar_created
  ON analytics_events (webinar_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_registrations_webinar_attended
  ON registrations (webinar_id, attended);
```

**Client:**

- `useAnalytics.js` → `supabase.rpc('get_webinar_stats', { p_webinar_id })`.
- Remover dependência de `events` full para KPIs; CSV de métricas usa o JSON do RPC.
- `GlobalAnalyticsPage` → RPC `get_org_stats(p_org_id)` ou `get_webinar_stats` em batch com `webinar_ids` (uma query, não N sequenciais).
- **Corrigir bug conhecido:** breakdown da GlobalAnalytics reutiliza totais globais em cada linha — cada linha deve usar stats do webinar correspondente.

### Critérios de aceite 0.1

- [ ] Com >1000 eventos seedados, o RPC reporta contagens corretas (não 1000).
- [ ] Dashboard de analytics não baixa o histórico completo de eventos para KPIs.
- [ ] `npm run build` limpo.

---

## 0.2 Paginação de leads e exports

### Problema

`LeadsPage` carrega todas as registrations; export CSV client-side quebra em volume.

### Solução

| Superfície | Comportamento |
|------------|----------------|
| Lista de leads | `.range(from, to)` + `count: 'exact'`; page size default **50**, max **100** |
| Busca | filter server-side `ilike` em name/email |
| CSV | Edge Function `export-leads` (service role ou JWT org-scoped) stream/pagina em chunks de 500; ou multi-request client com cursor — **preferir Edge** se >5k rows |
| MVP desta release | Paginação UI + export client **paginado** (loop `.range` até esgotar); Edge export se o loop ficar lento |

### Critérios de aceite 0.2

- [ ] UI mostra total real e navega páginas sem carregar 50k rows de uma vez.
- [ ] CSV de 2k+ leads gera arquivo completo (não truncado em 1000).

---

## 0.3 Amostragem e rate limit de analytics / chat / register

### VIDEO_PROGRESS

Hoje: insert a cada **30s** por viewer → ~33 inserts/s a 1k concurrent.

**Mudança:**

| Evento | Política |
|--------|----------|
| `video_progress` | Client: no máximo **1 a cada 60s** **ou** a cada **+5%** de progresso (o que for menos frequente). Prefer upsert mental: só envia se `seconds` > lastSent + 60. |
| Marcos `watch_15`…`watch_60`, `pitch_reached`, `offer_shown` | Continuam one-shot (já gated por ref). |
| `join` / `webinar_entered` | One-shot por sessão. |

Opcional (Fase 0.3b se necessário): Edge `ingest-event` com throttle por `(registration_id, event_type)` — **não obrigatório** se amostragem client + RLS endurecida bastarem.

### Chat

- Manter history limit 100.
- Cap de append no client: descartar mensagens além de 200 visíveis (window).
- Rate limit insert: no máximo **1 msg / 2s** por registration (client + preferência de policy/trigger se trivial).

### Register

- Validação e-mail já existe; manter.
- Anti-spam: Edge opcional depois; nesta release, unique `(webinar_id, email)` já limita duplicata.

### Critérios de aceite 0.3

- [ ] Em sessão de 10 min, um viewer gera ≤ ~10 eventos `video_progress` (não 20).
- [ ] Chat continua usable; flood rápido é freado no client.

---

## 0.4 Hardening de policies públicas (mínimo seguro)

### Problema (citado em migrations 001)

- `webinars` SELECT com `OR true` → scrape global.
- `registrations` SELECT `true` → **vazamento de leads**.
- `chat_messages` INSERT/SELECT abertos.

### Solução (migration 005)

| Tabela | SELECT público | INSERT público | Notas |
|--------|----------------|----------------|-------|
| `webinars` | Só `status IN ('scheduled','live','ended')` **ou** draft se auth org member | — | Remover `OR true` cego; public precisa de slug conhecido |
| `registrations` | **Remover** SELECT `true`. Org members only. Public: **sem listagem**. Lead vê a si só via `id` conhecido no localStorage se necessário: policy `id = current_setting` **não** funciona sem claim — preferir **não** SELECT público; room usa id em localStorage só para writes | INSERT continua (register) | Room não deve depender de SELECT * de registrations |
| `chat_messages` | SELECT por `webinar_id` de webinar “aberto” (status public) | INSERT com check de webinar aberto | Ainda abuso possível; rate limit client |
| `analytics_events` | Org only (já) | INSERT com check webinar_id existe e status public | |

**Slug ambiguity:** uniqueness hoje é `(org_id, slug)`. Nesta release:

```sql
-- Preferência: índice único global se ainda não houver colisão em prod
CREATE UNIQUE INDEX IF NOT EXISTS idx_webinars_slug_global ON webinars (slug);
```

Se dados existentes colidem, usar path `{org_slug}/{webinar_slug}` numa release seguinte — **documentar como risco** e rodar query de detecção antes do unique.

### Critérios de aceite 0.4

- [ ] Anon não lista `registrations` de outro webinar.
- [ ] Funil register → wait → room → replay continua OK em smoke manual.
- [ ] Script `verify-multi-tenant.mjs` ainda passa (ou é atualizado).

---

## 0.5 E-mail: confiabilidade (substituto de WhatsApp para show-up)

Sem WhatsApp, e-mail é o único canal. Melhorias mínimas:

| Item | Mudança |
|------|---------|
| `process-email-queue` | Retry: `failed` com `attempts < 3` volta a `pending` com backoff (`scheduled_at = now() + interval '5 minutes' * attempts`) |
| Colunas | `email_queue.attempts INT DEFAULT 0` |
| Batch | Manter limit 50; processar em paralelo limitado (ex.: 5 concurrent) se trivial em Deno |
| Confirmação | Migrar do `fetch` browser em `RegistrationPage` para **enqueue** na `email_queue` (ou chamar Edge autenticada por service role via DB trigger/function) — elimina abuso de `send-email` aberto |
| `send-email` | Exigir header secret `EMAIL_FUNCTION_SECRET` ou só aceitar service role |

### Critérios de aceite 0.5

- [ ] Falha transitória do Resend reprocessa até 3x.
- [ ] Confirmação de inscrição não depende de browser aberto com endpoint público sem secret.

---

# FASE 1 — Conversão e mídia

## 1.1 Escassez / urgência na oferta (CTA)

### Schema (`cta_configs` ALTER)

```sql
ALTER TABLE cta_configs
  ADD COLUMN IF NOT EXISTS scarcity_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS scarcity_mode TEXT NOT NULL DEFAULT 'none'
    CHECK (scarcity_mode IN ('none', 'countdown', 'stock', 'both')),
  ADD COLUMN IF NOT EXISTS countdown_seconds INTEGER,          -- duração da oferta após show_at
  ADD COLUMN IF NOT EXISTS stock_initial INTEGER,              -- estoque inicial declarado
  ADD COLUMN IF NOT EXISTS stock_remaining INTEGER,            -- atualizado por purchases ou manual
  ADD COLUMN IF NOT EXISTS hide_when_sold_out BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_purchase_count BOOLEAN NOT NULL DEFAULT false;
```

Semântica:

- **countdown:** UI mostra timer = `show_at_seconds + countdown_seconds - videoTime`. Ao zerar, esconde se `hide_at_seconds` null ou força hide.
- **stock:** mostra `stock_remaining`; se 0 e `hide_when_sold_out`, esconde CTA.
- **purchase count:** se `show_purchase_count`, conta `purchases` com `cta_config_id` (Fase 1.3) ou fallback `sales_notifications` count (somente se operador quiser prova social já existente — **não** misturar fake stock com stock real sem flag).

**Honestidade:** se `scarcity_mode` usa stock, o contador deve refletir `stock_remaining` real (webhooks ou edição manual no editor). Não auto-decrementar com números aleatórios.

### UI

| Arquivo | Mudança |
|---------|---------|
| `InteractionsEditor.jsx` | Campos: toggle escassez, modo, countdown, stock inicial/restante, hide sold out, show purchase count |
| `WebinarRoomPage.jsx` | Banner: countdown vivo, badge “X vagas”, hide rules |
| `useCtaTiming.js` (se existir) / filter de CTAs | Incluir regras de stock/countdown no “visible” |

### Critérios de aceite 1.1

- [ ] Operador configura countdown 15 min a partir do show_at; viewer vê timer e some ao fim.
- [ ] Stock 3 → após 3 purchases (ou edição manual a 0) CTA some se hide_when_sold_out.
- [ ] CTA sem scarcity se comporta como hoje.

---

## 1.2 Atribuição UTM + Pixel browser + CAPI (server)

### Schema

```sql
ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS attribution JSONB NOT NULL DEFAULT '{}';

-- example shape:
-- {
--   "utm_source": "meta",
--   "utm_medium": "paid",
--   "utm_campaign": "launch-jun",
--   "utm_content": "...",
--   "utm_term": "...",
--   "fbclid": "...",
--   "gclid": "...",
--   "landing_url": "...",
--   "referrer": "...",
--   "captured_at": "ISO"
-- }

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS tracking_settings JSONB NOT NULL DEFAULT '{}';

-- tracking_settings shape:
-- {
--   "meta_pixel_id": "",
--   "meta_capi_token": "",   -- NEVER expose to client; store encrypted or only in Edge secrets per-org table server-side
--   "google_ads_id": "",
--   "google_conversion_label": ""
-- }
```

**Segurança de tokens CAPI:**  
`meta_capi_token` **não** pode ir no bundle. Opções:

1. **Preferida:** tabela `org_secrets` (service role only) + Edge Functions leem com service role; dashboard grava via Edge `save-tracking-secrets` autenticada.
2. Temporária (só mock): token só em env global da plataforma (single-tenant ops) — **insuficiente multi-tenant**.

Implementar **(1)** mínimo: `org_secrets(org_id, key, value_encrypted)` RLS: **zero** SELECT para `authenticated`; só Edge service role.

### Captura UTM (client)

`RegistrationPage` (e entry points wait/room se deep link):

```js
// lib/attribution.js
export function captureAttribution(search = window.location.search, referrer = document.referrer) {
  const p = new URLSearchParams(search);
  const keys = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','fbclid','gclid'];
  const out = {};
  keys.forEach((k) => { const v = p.get(k); if (v) out[k] = v; });
  if (referrer) out.referrer = referrer;
  out.landing_url = window.location.href;
  out.captured_at = new Date().toISOString();
  // Persist first-touch in sessionStorage for multi-page funnel
  return out;
}
```

Insert em `registrations.attribution`.

### Pixel browser

- Settings org: Pixel ID (público).
- Snippet injeta `fbq('track', ...)` em:
  - PageView na reg page
  - Lead / CompleteRegistration no submit
  - (opcional) ViewContent na room join
- Google gtag se `google_ads_id` configurado.

### Server CAPI (Edge `track-conversion`)

Eventos server-side com `event_id` = UUID estável (mesmo id no browser quando possível para dedupe):

| Momento | Event name Meta | Payload mínimo |
|---------|-----------------|----------------|
| Registration | `Lead` / `CompleteRegistration` | email hash, event_id, attribution |
| Attend (join) | `Schedule` ou custom `Attend` | registration_id |
| CTA click | custom `CTAClick` | cta_id |
| Purchase webhook | `Purchase` | value, currency, email hash |

Worker: lê `integration_outbox` tipo `meta_capi` **ou** invoca síncrono no edge de purchase/register com retry outbox.

### Critérios de aceite 1.2

- [ ] Lead criado com UTMs da query string persistidos.
- [ ] Pixel ID configurável; PageView + Lead disparam no browser (verificável no Meta Pixel Helper).
- [ ] CAPI em mock grava outbox; em live chama Graph API com token **só no server**.
- [ ] Token CAPI não aparece em Network response de endpoints públicos nem no JS bundle.

---

## 1.3 Purchases + webhooks de checkout

### Schema

```sql
CREATE TABLE purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  webinar_id UUID REFERENCES webinars(id) ON DELETE SET NULL,
  registration_id UUID REFERENCES registrations(id) ON DELETE SET NULL,
  cta_config_id UUID REFERENCES cta_configs(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,              -- 'hotmart' | 'kirvano' | 'kiwify' | 'stripe' | 'generic'
  provider_event_id TEXT NOT NULL,    -- idempotency key
  status TEXT NOT NULL DEFAULT 'approved'
    CHECK (status IN ('approved', 'refunded', 'chargeback', 'pending')),
  amount_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'BRL',
  buyer_email TEXT,
  buyer_name TEXT,
  product_id TEXT,
  product_name TEXT,
  raw_payload JSONB NOT NULL DEFAULT '{}',
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_event_id)
);

CREATE INDEX idx_purchases_webinar ON purchases (webinar_id);
CREATE INDEX idx_purchases_registration ON purchases (registration_id);
CREATE INDEX idx_purchases_org ON purchases (org_id);

ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view purchases"
  ON purchases FOR SELECT
  USING (org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid()));

-- No direct client INSERT; only service role via Edge webhook
```

### Match registration

Ordem de matching no webhook:

1. `registration_id` se vier no payload custom / query do checkout URL  
2. `webinar_id` + email normalizado  
3. email + org (última registration recente em 30 dias)  
4. Sem match: grava purchase com `registration_id` null (ainda conta receita org se `org_id` resolvido por webhook secret)

### Edge Function `purchase-webhook`

```
POST /functions/v1/purchase-webhook?provider=hotmart|kirvano|kiwify|stripe|generic
Header: X-Gablive-Webhook-Secret: <per-org or global>
```

- Valida assinatura nativa do provider quando documentada; senão secret compartilhado por org em `org_secrets`.
- Normaliza payload → `purchases` upsert idempotente.
- Se `cta_config_id` e scarcity stock: `UPDATE cta_configs SET stock_remaining = GREATEST(stock_remaining - 1, 0)`.
- Enfileira CAPI Purchase + `integration_outbox` event `purchase`.
- Modo mock: aceita JSON genérico `{ email, amount_cents, currency, webinar_id, event_id }`.

### Analytics

Estender `get_webinar_stats`:

```json
{
  "revenue_cents": 150000,
  "purchases_count": 12,
  "revenue_per_registration_cents": 1250,
  "revenue_per_attendee_cents": 4200
}
```

UI: cards em `AnalyticsDashboard` + linha em GlobalAnalytics.

### Critérios de aceite 1.3

- [ ] POST mock cria purchase; segundo POST com mesmo `provider_event_id` não duplica.
- [ ] Match por email liga `registration_id`.
- [ ] Stats mostram receita; refund decrementa ou marca status (definir: **status refunded não conta em revenue**).
- [ ] Stock do CTA decrementa em purchase aprovada.

---

## 1.4 Integration outbox (webhooks genéricos)

Base para CRM v1.5 e para CAPI retries.

### Schema

```sql
CREATE TABLE integration_endpoints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  webinar_id UUID REFERENCES webinars(id) ON DELETE CASCADE, -- null = global org
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  secret TEXT,                          -- HMAC signing
  events TEXT[] NOT NULL DEFAULT '{}', -- {registration, attend, cta_click, purchase, leave}
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE integration_outbox (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  endpoint_id UUID REFERENCES integration_endpoints(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'dead')),
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_outbox_pending ON integration_outbox (status, next_attempt_at)
  WHERE status IN ('pending', 'failed');
```

### Edge `process-integration-outbox`

- Cron a cada 1 min (documentar no Supabase dashboard / config).
- `INTEGRATION_MODE=mock`: marca `sent` e grava `last_error=null`, payload já está na row.
- `live`: POST signed HMAC-SHA256 body; retry 3x com backoff; depois `dead`.

### Enfileiramento

| Evento | Onde enfileira |
|--------|----------------|
| registration | Após insert em RegistrationPage (via RPC `enqueue_integration_event` security definer) ou Edge |
| attend | WebinarRoom join |
| cta_click | handleCtaClick |
| purchase | purchase-webhook |

Preferir **uma RPC** `enqueue_org_event(p_org_id, p_event_type, p_payload)` que expande para todos endpoints matching.

### UI Settings (mínimo)

- Lista de endpoints (URL, eventos, enabled).
- Teste “Enviar evento de teste”.
- Log recente do outbox (últimos 50).

### Critérios de aceite 1.4

- [ ] Registro com endpoint mock gera row `sent` no outbox.
- [ ] Endpoint filtrado só em `purchase` não recebe `registration`.
- [ ] Live mode com URL inválida vai a `failed` e depois `dead` após 3 attempts.

---

## Project structure (novos arquivos)

```
supabase/migrations/
  005_phase0_scale.sql          -- RPC stats, indexes, RLS harden, email attempts, slug
  006_phase1_conversion.sql     -- cta scarcity, attribution, purchases, outbox, org_secrets

supabase/functions/
  purchase-webhook/index.ts
  process-integration-outbox/index.ts
  track-conversion/index.ts     -- CAPI / server events (pode unificar com outbox worker)
  export-leads/index.ts         -- opcional se CSV client-paginado insuficiente
  save-tracking-secrets/index.ts

src/lib/
  attribution.js
  tracking.js                   -- inject pixel, fbq helpers
  integrationEvents.js          -- enqueue helpers

src/hooks/
  useAnalytics.js               -- RPC
  usePurchases.js               -- optional
  useLeads.js                   -- pagination

src/components/editor/
  InteractionsEditor.jsx        -- scarcity fields

src/pages/dashboard/
  SettingsPage.jsx              -- tracking + webhook endpoints
  LeadsPage.jsx                 -- pagination
  (AnalyticsDashboard / GlobalAnalytics) -- revenue cards

src/pages/public/
  RegistrationPage.jsx          -- attribution + pixel + enqueue email
  WebinarRoomPage.jsx           -- scarcity UI + outbox cta_click
```

---

## Implementation order (checklist)

### Fase 0

1. Migration 005: indexes + `get_webinar_stats` + `get_org_webinar_stats_list`
2. Refatorar `useAnalytics` / dashboards para RPC; fix GlobalAnalytics per-row bug
3. Paginação `LeadsPage` + export paginado
4. Amostrar `VIDEO_PROGRESS` no room
5. RLS harden + unique slug (após check de colisões)
6. Email queue attempts + secret em `send-email` + enqueue confirmation

### Fase 1

7. Migration 006: scarcity columns + attribution + purchases + outbox + org_secrets
8. InteractionsEditor + room scarcity UI
9. `lib/attribution.js` + RegistrationPage persist
10. Settings tracking (pixel público) + inject pixel
11. Edge `purchase-webhook` + stats revenue
12. Edge outbox processor + Settings endpoints UI
13. CAPI via outbox (`track-conversion` ou mesmo worker)
14. Smoke E2E manual + `npm run build`

Ordem respeita dependências: **stats RPC antes de revenue cards**; **purchases antes de stock decrement automático**; **outbox antes de CAPI live**.

---

## Testing strategy

| Tipo | O quê |
|------|--------|
| Manual | Funil completo com UTMs na URL; CTA countdown; POST mock purchase |
| Script | Seed 1500 events → RPC count == 1500; anon SELECT registrations fails |
| Build | `npm run build` |
| E2E | Estender Playwright registration se estável; purchase webhook via request fixture |
| Multi-tenant | Re-rodar `scripts/verify-multi-tenant.mjs` após RLS |

Sem Vitest obrigatório (decisão de projeto vigente).

---

## Risks

| Risco | Mitigação |
|-------|-----------|
| Unique slug global quebra dados existentes | Query de colisão antes; se houver, adiar unique e usar `org.slug + webinar.slug` na URL numa task separada |
| RLS apertada quebra room/register | Smoke checklist obrigatório pós-migration; policies com status public explícito |
| Token CAPI vazado | `org_secrets` service-role only; code review security |
| Webhook Hotmart payload divergente | Adapter por provider + modo `generic` documentado |
| Operador usa stock fake | Copy no editor: “Estoque real — atualizado por webhooks de compra ou manualmente” |
| Cron Edge não configurado em prod | Documentar no README de deploy; health check row stale pending > 15 min |

---

## Success criteria (release gate)

**Fase 0 done quando:**

1. Stats de webinar com >1k eventos batem com `count(*)` SQL.  
2. Leads paginados + CSV completo em fixture 2k.  
3. Anon não lê lista de registrations.  
4. Email confirmation enfileirada; retry funciona em falha simulada.  
5. Build verde.

**Fase 1 done quando:**

1. CTA scarcity countdown + stock funcionam na room.  
2. Registration grava attribution UTM.  
3. Pixel browser dispara Lead (helper).  
4. Purchase mock → revenue no dashboard + idempotência.  
5. Outbox mock entrega eventos configurados.  
6. CAPI token nunca no client.  
7. Build verde.

---

## Open questions (não bloqueiam Plan se defaults OK)

| # | Questão | Default se sem resposta |
|---|---------|-------------------------|
| 1 | Assinaturas Hotmart/Kirvano/Kiwify detalhadas agora ou só `generic` + 1 provider? | **generic + hotmart** primeiro |
| 2 | Unique slug global ok? | Sim, se zero colisões |
| 3 | Export leads Edge vs client loop? | Client loop até 10k; Edge depois |
| 4 | CAPI Meta só, ou Google server-side também? | Meta CAPI na 1.2; Google só browser gtag |

---

## Mapping to later backlog

| Esta release entrega | Desbloqueia |
|----------------------|-------------|
| `integration_outbox` | CRM ActiveCampaign/etc. v1.5 (adapters no mesmo worker) |
| `purchases` + revenue stats | A/B por revenue (v1.5); engagement score por R$ |
| `attribution` | Global analytics por campanha |
| Hardened RLS + RPC | Multi-org agency (Fase 3) com menos dívida de scrape |
| Email retry | Show-up sem WhatsApp |

---

## References

- `PRODUCT.md` — conversion architecture, multi-tenant claims  
- `specs/backlog-v1.5-v2-SPEC.md` — v1 / v1.5 / v2 seams  
- `specs/v1-PLAN.md` — v1 parallel work  
- `supabase/migrations/001_initial_schema.sql`, `002_jit_and_conversion.sql`  
- `src/hooks/useAnalytics.js`, `useChat.js`  
- `src/pages/public/RegistrationPage.jsx`, `WebinarRoomPage.jsx`  
- `src/components/editor/InteractionsEditor.jsx`  
- `supabase/functions/process-email-queue/index.ts`  

---

*Próximo passo após aprovação: `specs/phase-0-1-PLAN.md` com tasks atômicas (ou implementação direta da migration 005 + RPC se o usuário pedir “implementar”).*
