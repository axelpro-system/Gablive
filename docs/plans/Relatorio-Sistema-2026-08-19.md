# Relatório de Análise do Sistema — Gablive

**Data:** 2026-08-19
**Escopo:** Backend (Supabase) + Frontend (React), estado atual pós-correções desta sessão (4 milestones de auditoria funcional já aplicados — ver seção 4).

---

## 1. Resumo Executivo

O Gablive é um SaaS de webinar completo ponta a ponta: landing → inscrição → sala de espera → sala ao vivo (com chat, IA e ofertas) → replay, com dashboard de operador, integrações de venda (Hotmart/Selflux) e agentes de IA. A base funcional é sólida e, após a auditoria desta sessão, os problemas **críticos de segurança e dados fake foram eliminados**. O que resta em aberto é majoritariamente **produto incompleto por escolha de escopo** (billing, onboarding, CRUD avançado de webinar) e um punhado de **gaps pequenos e pontuais** (validação de telefone, LGPD no form principal, timezone no countdown, chave do Gemini em texto puro).

---

## 2. Frontend — O que existe

**Stack:** React 19 + React Router 7 + Vite 6, i18next (`pt-BR`/`en`), Bootstrap grid + CSS custom properties, Playwright + `node:test`.

### Páginas públicas (`src/pages/public`)
| Página | Rota | Função |
|---|---|---|
| `LandingPage` | `/` | Landing institucional do produto |
| `RegistrationPage` | `/register/:slug` | Inscrição — captura UTM, cap de vagas/waitlist, recuperação de acesso |
| `WaitRoomPage` | `/wait/:slug` | Sala de espera com countdown |
| `WebinarRoomPage` | `/room/:slug` | Sala ao vivo — vídeo, chat, IA, CTAs, enquetes, prova social, audiência |
| `ReplayPage` | `/replay/:slug` | Replay com expiração configurável |

### Auth (`src/pages/auth`)
`LoginPage`, `RegisterPage`, `ForgotPasswordPage`, `ResetPasswordPage`.

### Dashboard (`src/pages/dashboard`)
`DashboardPage` (home + KPIs reais), `WebinarsListPage`, `CreateWebinarPage`, `EditWebinarPage` (abas: Config, Registro, Login, Interações, **Moderação** ← nova, E-mails, Analytics), `GlobalAnalyticsPage`, `LeadsPage` (CSV com UTM), `SettingsPage`, `IntegrationsPage`, `AIAgentsPage`, `AuditLogPage`, `UsersPage`, `AdminGatewayPage`.

[Atenção] `AdminDashboardPage.jsx` existe no código mas **não tem rota registrada** em `App.jsx` — inacessível hoje. Provavelmente resquício de refatoração; vale confirmar se é intencional.

### Hooks (`src/hooks`)
CRUD de webinar (`useWebinar`), inscrição (`useRegistration`/`useRegistrationSubmit`), chat com reconexão (`useChat`), audiência (`useSimulatedAudience`, com modo `real` novo), analytics (`useAnalytics`), countdown, timing de CTA/enquete/vendas na sala, progresso de vídeo, SEO dinâmico.

### Componentes (`src/components`)
- `editor/` — editores por aba do webinar (Config, Registro, Login, Interações, **Moderação de Chat** ← novo, E-mails, Analytics, Templates)
- `video/` — player com moldura/vinheta (`CinemaScreenVideo`)
- `landing/` — efeitos visuais da landing (glass button, preloader, typewriter, etc.)
- `layout/` — shells `AppLayout` (autenticado) e `PublicLayout`

### Contexts
`SupabaseContext`, `AuthContext`, `OrgContext` (org ativa + papel do usuário).

### i18n
`pt-BR` (padrão) e `en`, cobertura completa via i18next.

### Testes
- **Unit** (`node --test`): 4 arquivos (~720 linhas) — countdown, KPIs de lead, slugify, helpers de fase 0 do funil.
- **E2E** (Playwright): 6 specs críticos (registro, chat, CTA, contador de audiência, exclusão de integração ao vivo, rotas de debug) + page objects + fixtures.

---

## 3. Backend — O que existe

**Stack:** Supabase (Postgres + RLS, Realtime, Auth, Edge Functions em Deno).

### Tabelas por domínio (29 migrations aplicadas ao schema, todas com RLS habilitado)

| Domínio | Tabelas |
|---|---|
| Auth/Org | `organizations`, `profiles`, `platform_admins`, `audit_logs` |
| Webinar/Conteúdo | `webinars`, `registration_pages`, `page_templates`, `login_customizations`, `cta_configs`, `audience_configs` |
| Registrations/Leads | `registrations` (UTM×5, `waitlisted`), `simulated_messages`, `sales_notifications`, `waitlist_entries` (landing do produto) |
| Chat/IA ao vivo | `chat_messages`, `chat_banned_participants` ← novo, `gemini_chat_invocations` ← novo |
| Agentes de IA (dashboard) | `ai_agents`, `ai_agent_runs`, `ai_agent_messages`, `ai_agent_artifacts` |
| Vendas/Integrações | `org_sales_integrations`, `org_sales_secrets` (criptografado ← novo), `provider_product_mappings`, `provider_webhook_events`, `purchases` |
| Analytics | `analytics_events`, `polls`, `poll_responses` |
| E-mail | `email_configs`, `email_queue` |

*O antigo "Sistema B" de integrações (`integration_providers/credentials/product_mappings/events`) foi removido nesta sessão — era código morto nunca alimentado pela UI.*

### Edge Functions
`send-email`, `send-email-notification`, `process-email-queue`, `schedule-reminders`, `resend-setup`, `purchase-webhook` (receptor de venda, agora com rate-limit e reembolso), `manage-sales-integration`, `gemini-chat` (agora com rate-limit + timeout), `ai-agent-run`, `admin-api`, `invite-administrator`.

### RPCs principais (SECURITY DEFINER)
Leitura pública segura (`get_public_webinar_by_slug`, `get_registration_by_id`, `check_registration_email`), inscrição (`register_participant` — agora com UTM + capacidade/waitlist), recuperação (`recover_registration`), agregados de analytics (`get_org_webinar_stats`, `get_webinar_stats`, tempo assistido), bootstrap de usuário (`handle_new_user`).

---

## 4. O que foi corrigido nesta sessão (contexto — já em produção no branch)

| Área | Antes | Depois |
|---|---|---|
| Segurança | Webhook aceitava payload mesmo com secret inválido | Rejeitado; secrets de integração agora criptografados (AES-GCM) |
| Vendas | Compra aprovada não matriculava o comprador no webinar | Matrícula automática + cancelamento em reembolso/chargeback |
| Vendas | Dois sistemas de integração paralelos, um deles morto | Unificado; URL de webhook corrigida; toggle de mapeamento real |
| Dashboard | KPIs "Total de Participantes"/"Conversão" eram `'—'` fixo | Calculados via RPC existente |
| Sala ao vivo | Contador de audiência sempre simulado (`Math.random()`) | Novo modo `real` via Presence, mantendo `fixed`/`dynamic` como opções legítimas |
| Funil | Sem captura de UTM; erros crus do Postgres vazando pro usuário | UTM capturado + exportado no CSV; mensagens de erro amigáveis |
| Funil | 404 real e falha de rede tratados igual, sem retry | Distinguidos, com botão de retry; bug de crash no Replay corrigido |
| Funil | Recuperação de inscrição era um efeito colateral escondido | CTA explícito "Já se inscreveu? Reenviar acesso" |
| Funil | Sem cap de vagas | Capacidade opcional + waitlist "soft" |
| IA/Chat | `gemini-chat` sem rate limit nem timeout | Rate limit (5/10s por webinar) + timeout de 10s |
| Chat | Sem reconexão em queda de rede | Reconexão com backoff exponencial + re-sync de histórico |
| Chat | Zero moderação | Painel novo: deletar mensagem, banir/desbanir participante (enforced via RLS) |

---

## 5. O que falta

### 5.1 Gaps pontuais (pequenos, específicos)

**Status: 6 de 7 corrigidos em 2026-08-19** (commits `fdba680`…`3754d1c`).

| Item | Onde | Status |
|---|---|---|
| Chave da API Gemini salva em texto puro | `organizations.settings` → nova edge function `save-org-gemini-key` criptografa (AES-GCM) antes de gravar; `gemini-chat` descriptografa | ✅ Corrigido |
| Sem validação de formato de telefone | `isValidPhone()` em `sanitize.js`, aplicado no submit de `RegistrationPage.jsx` | ✅ Corrigido |
| Sem checkbox de consentimento LGPD no formulário principal | Checkbox obrigatório adicionado antes do botão de inscrição, pt-BR/en | ✅ Corrigido |
| Sem indicador "IA está digitando" no chat | Bolha animada em `WebinarRoomPage.jsx` enquanto `gemini-chat` está em voo | ✅ Corrigido |
| Sem retry/backoff em `schedule-reminders` | Insert de fila agora tenta até 3x com backoff crescente | ✅ Corrigido |
| Rota de `AdminDashboardPage` não registrada | Confirmado como protótipo morto (superado pelo `AdminGatewayPage`, já roteado em `/admin`) — arquivo removido | ✅ Removido (dead code) |
| Multi-idioma do agente de IA é heurística de prompt, não configuração | — | ⏸️ Não corrigido — exigiria nova coluna de idioma no webinar + UI própria; escopo maior que os demais itens desta lista, tratado como feature separada |

### 5.2 Features maiores fora de escopo (deliberadamente adiadas — ver `.specs/project/ROADMAP.md`)

- **Onboarding guiado** para operador novo (primeiro webinar, checklist, tour)
- ~~CRUD de webinar mais rico: duplicar, arquivar, templates recorrentes~~ — ✅ implementado em 2026-08-19 (commit `be3fc30`): duplicar (clona registration page, CTAs, audiência, login, e-mails), arquivar/desarquivar, marcar como template, abas Ativos/Templates/Arquivados
- **Billing/plano/limites de uso** — não existe nenhuma noção de plano pago ou cap de uso visível
- **Analytics com comparação temporal** e funil de conversão por etapa (hoje só snapshot atual)
- **Notificações in-app/e-mail** para o operador (webinar prestes a começar, webhook falhando)
- **Replay como gravação real** da sessão ao vivo — hoje reexibe o mesmo link de vídeo, não grava a sessão
- **`.ics` anexado** no e-mail de confirmação + **timezone visível** no countdown para o participante
- **Mais provedores de venda** (Kiwify, Eduzz, Monetizze) — hoje só Hotmart/Selflux
- **Notificação ao operador quando integração de venda quebra** e **retry/DLQ automático** de webhooks falhos
- **Botão "testar webhook" que simula um payload real** (o atual só testa conectividade/OAuth, não o pipeline completo)

---

## 6. Recomendação de priorização

1. **Chave do Gemini em texto puro** e **consentimento LGPD no form principal** — rápidos de corrigir, risco de compliance/segurança.
2. **Confirmar `AdminDashboardPage`** — 5 minutos para decidir se registra a rota ou remove o arquivo morto.
3. **Notificação de falha de integração + retry de webhook** — combina com o trabalho de vendas já feito nesta sessão.
4. O resto (billing, onboarding, CRUD avançado, replay real) é trabalho de produto genuíno, não "amadorismo" — vale tratar como roadmap normal, priorizado por impacto de negócio, não como débito técnico.
