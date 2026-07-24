# Plan: Fase 0 + 1 — Escala e Conversão (sem WhatsApp)

**Spec:** `specs/phase-0-1-conversion-scale-SPEC.md`  
**Fora:** WhatsApp/SMS, multi-org agency, A/B, CRM nativos, IA, domínio custom, WebRTC, checkout nativo.

---

## Dependências entre blocos

```
005 migration (RPC + indexes + RLS + email attempts)
        │
        ├──► useAnalytics / GlobalAnalytics / AnalyticsDashboard (RPC)
        ├──► LeadsPage pagination + CSV
        ├──► WebinarRoom VIDEO_PROGRESS sampling
        └──► send-email secret + confirmation enqueue

006 migration (scarcity + attribution + purchases + outbox + org_secrets)
        │
        ├──► InteractionsEditor + WebinarRoom scarcity UI
        ├──► attribution.js + RegistrationPage
        ├──► Settings tracking (pixel) + tracking.js
        ├──► purchase-webhook Edge + revenue in get_webinar_stats
        ├──► process-integration-outbox + Settings endpoints
        └──► CAPI worker (outbox event meta_capi)
```

Fase 0 pode mergear antes da Fase 1. Dentro de cada fase, a migration é o primeiro commit.

---

## Tasks atômicas

### F0-T1 — Migration 005 (schema escala) ✅ implementado (2026-07-24)

- Arquivo: `supabase/migrations/005_phase0_scale.sql`
- Conteúdo: índices; `get_webinar_stats`; `get_org_webinar_stats`; `email_queue.attempts`; RLS registrations (org-only SELECT) + RPCs públicas `get_registration_by_id` / `check_registration_email` / `mark_registration_attended`; unique slug se sem colisão.
- **Ação ops:** aplicar no Supabase SQL editor ou `supabase db push` antes de validar dashboards em runtime.

### F0-T2 — Client analytics via RPC ✅ implementado (2026-07-24)

- Arquivos: `src/hooks/useAnalytics.js`, `AnalyticsDashboard.jsx`, `GlobalAnalyticsPage.jsx`, `RegistrationPage.jsx`, `WaitRoomPage.jsx`, `useRegistration.js`
- KPIs via RPC; GlobalAnalytics por-webinar (bug de totais globais corrigido); funil público adaptado ao RLS.
- Verify: `npm run build` OK.

### F0-T3 — Leads paginados + CSV completo ✅ implementado (2026-07-24)

- Arquivo: `src/pages/dashboard/LeadsPage.jsx`, estilos em `DashboardPage.css`
- Page size 50; `count: 'exact'`; busca server-side (debounce 300ms); export em loop `.range` chunks de 500.
- Verify: `npm run build`; CSV não depende da página atual.

### F0-T4 — Sample VIDEO_PROGRESS + chat window ✅ implementado (2026-07-24)

- Arquivos: `src/lib/videoProgressSampling.js`, `src/hooks/useVideoProgressTracking.js`, `WebinarRoomPage.jsx`, `src/lib/chatLimits.js`, `src/hooks/useChat.js`
- Progress: min 60s entre envios; chat: cap visual 200 msgs; throttle send 2s.
- Verify: `node --test tests/unit/phase0-helpers.test.js` (≤10 emits / 600s).

### F0-T5 — E-mail retry + secret + enqueue confirmation ✅ implementado (2026-07-24)

- Arquivos: `process-email-queue/index.ts`, `send-email/index.ts`, `RegistrationPage.jsx`, `src/lib/emailQueueRetry.js`, `006_phase0_email_enqueue.sql` (RPC `enqueue_confirmation_email`)
- Retry backoff; `EMAIL_FUNCTION_SECRET` via header `x-email-secret`; confirmation via queue RPC (sem fetch browser).
- Verify: unit tests retry state + static inspection + build x2.

### F1-T1 — Migration 007+ (conversão) — era 006

- Arquivo: `supabase/migrations/007_phase1_conversion.sql` (006 reservado para email enqueue)
- scarcity cols em `cta_configs`; `registrations.attribution`; `purchases`; `integration_endpoints`; `integration_outbox`; `org_secrets` (sem SELECT authenticated); estender `get_webinar_stats` com revenue.
- Verify: schema aplica limpo.

### F1-T2 — Editor + room scarcity

- Arquivos: `InteractionsEditor.jsx`, `WebinarRoomPage.jsx`, CSS se preciso
- Verify: countdown e stock hide manual.

### F1-T3 — Attribution + pixel browser

- Arquivos: `src/lib/attribution.js`, `src/lib/tracking.js`, `RegistrationPage.jsx`, `SettingsPage.jsx`
- Verify: `?utm_source=test` grava JSON; pixel id injeta script.

### F1-T4 — purchase-webhook + revenue UI

- Arquivo: `supabase/functions/purchase-webhook/index.ts` + cards analytics
- Mock body + idempotency; stock decrement; revenue cards.
- Verify: double POST mesmo event_id → 1 row; stats revenue > 0.

### F1-T5 — Outbox + processor + Settings endpoints

- Arquivos: functions `process-integration-outbox`, UI settings, enqueue nos pontos registration/attend/cta/purchase
- Verify: mock endpoint `sent`; filtro de eventos.

### F1-T6 — CAPI via outbox (Meta)

- `track-conversion` ou branch no processor; secrets só service role
- Verify: mock mode grava; live gated por `INTEGRATION_MODE`; token não no bundle (`grep` build assets).

### F1-T7 — Gate de release

- [ ] Smoke funil register→room→CTA→mock purchase  
- [ ] `npm run build`  
- [ ] `node scripts/verify-multi-tenant.mjs`  
- [ ] Checklist success criteria da SPEC (Fase 0 + 1)

---

## Riscos de implementação (curto)

| Risco | Ação na task |
|-------|----------------|
| Colisão de slug | F0-T1: SELECT slug HAVING count>1 antes do UNIQUE |
| Room quebra sem SELECT registration | F0-T1/T4: room só usa localStorage id + inserts; não listar leads |
| Escopo creep CRM nativo | F1-T5: só URL genérica, sem ActiveCampaign SDK |

---

## Estimativa relativa

| Bloco | Esforço relativo |
|-------|------------------|
| F0-T1–T5 | M–L (RLS é a parte delicada) |
| F1-T1–T2 | S–M |
| F1-T3–T4 | M |
| F1-T5–T6 | M–L |
| F1-T7 | S |

---

## Ordem de commits sugerida

1. `feat: phase0 analytics rpc and indexes`  
2. `feat: phase0 leads pagination and progress sampling`  
3. `fix: harden public rls and email queue retry`  
4. `feat: phase1 cta scarcity`  
5. `feat: phase1 attribution pixel and purchases webhook`  
6. `feat: phase1 integration outbox and meta capi`  

---

*Spec aprovada implicitamente pelo pedido “faça”. Próximo: implementar F0-T1 ou pedir confirmação de Open Questions da SPEC (defaults já definidos).*
