# TDD — Webinar SaaS

| Campo | Valor |
|-------|-------|
| Tech Lead | @ibcap |
| Time | Solo dev |
| Epic | MVP funcional + planejamento v1.5/v2 |
| Status | MVP concluído · v1.5 em planejamento · v2 backlog |
| Criado | 2026-07-22 |
| Última atualização | 2026-07-22 |

---

## 1. Contexto

### Background

O **Webinar SaaS** é uma plataforma multi-tenant para criação, gestão e conversão de webinários de funil de vendas. Nasceu da necessidade de oferecer uma alternativa acessível e auto-gerenciável a plataformas como Hotmart/Perfect Webinar, com foco em produtores de conteúdo e operações de marketing digital.

O MVP foi desenvolvido como um SPA React com Supabase como backend (BaaS), eliminando a necessidade de um servidor de API tradicional. Toda a lógica de negócio reside no frontend e nas políticas RLS do PostgreSQL.

### Domínio

**Marketing Ops / Sales Funnel Automation** — a plataforma opera no domínio de automação de funil de vendas via webinários, cobrindo todo o ciclo: captura de leads → nutrição (e-mail) → transmissão (ao vivo ou gravada) → oferta (CTA) → análise de conversão.

### Stakeholders

| Stakeholder | Interesse |
|-------------|-----------|
| **Produtores de conteúdo** | Criar e gerenciar webinários, analisar métricas, converter leads |
| **Participantes** | Assistir webinários, interagir via chat, receber replay |
| **Operadores de marketing** | Configurar CTAs, e-mails, analisar funil de conversão |

---

## 2. Definição do Problema & Motivação

### Problemas que Resolvemos

- **Ferramentas existentes são caras e inflexíveis**: Plataformas como Hotmart/Perfect Webinar cobram taxas sobre vendas ou mensalidades altas, além de limitarem customização de páginas de registro e CTAs.
  - Impacto: Custo elevado para produtores iniciantes, perda de controle sobre a experiência do funil.

- **Falta de suporte a webinários evergreen (Just-in-Time)**: A maioria das plataformas só suporta eventos ao vivo com data fixa, obrigando o produtor a repetir apresentações ou perder leads que chegam fora do horário.
  - Impacto: Leads frios abandonam antes do evento, redução de conversão.

- **Analytics fragmentados**: Métricas de webinário (registro, comparecimento, CTA, retenção de vídeo) ficam espalhadas entre plataformas de vídeo, e-mail e landing pages.
  - Impacto: Impossibilidade de medir o funil completo, decisões baseadas em intuição.

### Por Que Agora?

- Mercado de marketing digital no Brasil cresceu >30% ao ano, com demanda por ferramentas self-service
- Supabase tornou viável construir apps multi-tenant com RLS sem backend customizado
- A combinação React 19 + Vite 6 permite SPA rápida e moderna com zero configuração de servidor

### Impacto de NÃO Resolver

- **Negócio**: Perda de oportunidade de mercado, produtores migram para concorrentes
- **Técnico**: N/A (produto novo)
- **Usuários**: Continuam pagando caro em plataformas rígidas

---

## 3. Escopo

### ✅ No Escopo — MVP (v1 concluído)

- [x] Multi-tenant com RLS (organizações isoladas)
- [x] Auth completo (registro, login, reset de senha) via Supabase Auth
- [x] CRUD de webinários (título, descrição, tipo, status, vídeo)
- [x] Webinários ao vivo e gravados (YouTube/Vimeo)
- [x] Webinários Just-in-Time (evergreen) com sala de espera
- [x] Páginas de registro com editor de blocos (hero, benefícios, formulário, countdown)
- [x] Chat em tempo real via Supabase Realtime
- [x] Mensagens simuladas para replays (sincronizadas com vídeo)
- [x] CTAs/ofertas com timing, preço original/promoção, banners
- [x] Enquetes com múltiplas opções e respostas
- [x] Notificações de prova social (vendas simuladas)
- [x] Contador de audiência (fixo ou dinâmico)
- [x] E-mails automáticos (confirmação, lembrete, replay) — stub
- [x] Analytics por webinar (registros, comparecimento, CTA, watch time, funil)
- [x] Dashboard global com KPIs, gráfico de funil, donut, comparação
- [x] Customização da tela de login
- [x] Replay com expiração configurável
- [x] Internacionalização (pt-BR, en)
- [x] Design system próprio (CSS Custom Properties, tema vermelho de marca)

### ✅ No Escopo — v1.5 (planejado)

- [ ] Administradores da conta (múltiplos usuários por org)
- [ ] Audit log (registro de ações de admin)
- [ ] Templates de página reutilizáveis entre webinars
- [ ] Export CSV de métricas
- [ ] Script de verificação multi-tenant (teste de isolamento RLS)
- [ ] Edge Function de convite de administrador

### ✅ No Escopo — v2 (backlog)

- [ ] Integrações CRM (RD Station, HubSpot, ActiveCampaign)
- [ ] Chatbot de IA para interação automática
- [ ] Split testing (A/B test de páginas de registro e CTAs)
- [ ] Domínio customizado (white label)
- [ ] Agente de IA para geração de conteúdo de chat
- [ ] Atendimento ao vivo (chat com operador)
- [ ] Billing / planos pagos (Stripe)

### ❌ Fora do Escopo

- Aplicativo mobile nativo (por enquanto, SPA responsiva cobre mobile web)
- Transmissão de vídeo própria (depende de YouTube/Vimeo)
- White label completo com DNS customizado (só em v2)
- Integração com Facebook Ads / Google Ads para tracking automático

---

## 4. Solução Técnica

### Visão Geral da Arquitetura

A plataforma adota uma arquitetura **SPA + BaaS** (Backend as a Service):

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT (Browser)                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  │
│  │  React 19 │  │  Router  │  │ i18next  │  │  Recharts  │  │
│  │  (Vite 6) │  │  v7 SPA  │  │ (pt+en)  │  │ (charts)   │  │
│  └─────┬─────┘  └──────────┘  └──────────┘  └────────────┘  │
│        │ @supabase/supabase-js                               │
└────────┼────────────────────────────────────────────────────┘
         │ HTTPS (TLS 1.3)
         ▼
┌─────────────────────────────────────────────────────────────┐
│                      SUPABASE                                │
│  ┌───────────┐  ┌──────────────┐  ┌───────────────────┐     │
│  │   Auth    │  │  PostgreSQL   │  │     Realtime       │     │
│  │ (JWT+RLS) │  │  (15 tables)  │  │  (WebSocket chat)  │     │
│  └───────────┘  └──────┬───────┘  └───────────────────┘     │
│                        │                                      │
│  ┌─────────────────────▼──────────────────────────────┐     │
│  │              Edge Functions (Deno)                   │     │
│  │  send-email · process-email-queue · schedule-reminders│    │
│  └─────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                    DEPLOY (Vercel)                            │
│  Static SPA + rewrites para index.html                       │
└─────────────────────────────────────────────────────────────┘
```

### Componentes-Chave

| Componente | Responsabilidade | Tecnologia |
|-----------|-----------------|------------|
| **App Shell** | Roteamento SPA, lazy loading, auth guards | React Router 7 + Suspense |
| **AuthContext** | Estado de autenticação, signUp/signIn/signOut, perfil | Supabase Auth |
| **OrgContext** | Organização do usuário logado, derivado do perfil | React Context |
| **useWebinar** | CRUD de webinários, slug único, defaults automáticos | Supabase JS |
| **useChat** | Mensagens em tempo real + simulação sincronizada | Supabase Realtime |
| **useAnalytics** | Métricas agregadas (registros, CTA, watch time, funil) | Supabase queries |
| **useCountdown** | Countdown regressivo para sala de espera e JIT | JS puro |
| **Email Engine** | Fila de e-mails disparada por Edge Functions | Supabase Edge Functions |
| **Design System** | Tokens CSS, tipografia, componentes, tema de marca | CSS Custom Properties |

### Fluxo de Dados — Participante Assistindo Webinar

```
1. Usuário acessa /register/:slug
2. RegistrationPage busca webinar + registration_pages por slug
3. Usuário preenche formulário → INSERT em registrations
4. Trigger: analytics_events (event: registration)
5. Email de confirmação enfileirado em email_queue
6. Usuário acessa /wait/:slug → WaitRoomPage com countdown
7. Na hora do evento (ou imediatamente no JIT):
   → /room/:slug → WebinarRoomPage
   → Player YouTube/Vimeo + chat Realtime
   → CTAs disparam por tempo de vídeo
   → Enquetes disparam por tempo de vídeo
   → Notificações de venda disparam
8. Analytics events: join, video_progress (15/30/45/60min), 
   pitch_reached, offer_shown, cta_click
9. Pós-evento: /replay/:slug disponível por X horas
10. Email de replay enfileirado
```

### APIs & Endpoints

Não há servidor de API tradicional. Toda comunicação é direta entre o frontend e o Supabase:

| Operação | Método | Implementação |
|----------|--------|---------------|
| Auth (sign up/in/out) | `supabase.auth.*` | SDK Supabase |
| CRUD webinars | `supabase.from('webinars').*` | RLS + queries |
| Registro de participante | `supabase.from('registrations').insert()` | RLS público |
| Chat em tempo real | `supabase.channel().on('postgres_changes')` | Realtime |
| Analytics | `supabase.from('analytics_events').insert()` | RLS público |
| Envio de e-mail | Edge Function `send-email` | Deno + HTTP |

**Edge Functions:**

| Function | Trigger | Descrição |
|----------|---------|-----------|
| `send-email` | HTTP POST | Envia e-mail individual (stub — integrar com Resend/SendGrid) |
| `process-email-queue` | Cron/pg_cron | Processa fila `email_queue` (pending → sent) |
| `schedule-reminders` | Cron/pg_cron | Cria entradas na fila para lembretes antes do evento |

### Banco de Dados

#### Modelo de Dados

```
┌──────────────────┐       ┌──────────────────┐
│  organizations   │1────*│     profiles     │
│  id (PK)         │       │  id (PK)         │
│  name            │       │  user_id (FK auth)│
│  slug (UNIQUE)   │       │  org_id (FK)     │
│  owner_id (FK)   │       │  role            │
│  settings (JSONB)│       │  display_name    │
└──────┬───────────┘       └──────────────────┘
       │
       │ 1
       │
       │ *
┌──────▼───────────┐       ┌──────────────────┐
│    webinars      │1────*│  registrations   │
│  id (PK)         │       │  id (PK)         │
│  org_id (FK)     │       │  webinar_id (FK) │
│  title           │       │  name, email     │
│  slug (UNIQUE)   │       │  phone           │
│  type (live/rec) │       │  attended        │
│  status          │       │  session_start_at│
│  video_url       │       └──────────────────┘
│  is_just_in_time │
│  use_wait_room   │
│  settings (JSONB)│
└──────┬───────────┘
       │
       │ 1:1 / 1:*
       │
       ├── registration_pages (1:1, blocos JSONB + tema)
       ├── cta_configs (1:*, ofertas com timing)
       ├── polls (1:*, enquetes)
       │    └── poll_responses (1:*)
       ├── chat_messages (1:*, realtime)
       ├── simulated_messages (1:*, chat falso)
       ├── sales_notifications (1:*, prova social)
       ├── email_configs (1:*, config de e-mail)
       │    └── email_queue (1:*, fila de envio)
       ├── audience_configs (1:1, contador)
       ├── login_customizations (1:1, tela de entrada)
       └── analytics_events (1:*, tracking)
```

#### Tabelas Principais (15 tabelas)

| Tabela | Linhas por Webinar | Descrição |
|--------|-------------------|-----------|
| `organizations` | 1 por cliente | Tenant — isolado por RLS |
| `profiles` | 1+ por org | Usuários da organização |
| `webinars` | N por org | Webinários com slug público único |
| `registrations` | 1-100k+ | Participantes inscritos |
| `registration_pages` | 1:1 com webinar | Página de registro (blocos JSON) |
| `cta_configs` | 2-5 | Ofertas com timing e preços |
| `polls` / `poll_responses` | 1-3 / 10-1000 | Enquetes e respostas |
| `chat_messages` | 10-1000+ | Chat em tempo real |
| `simulated_messages` | 10-100 | Chat falso para replay |
| `sales_notifications` | 5-20 | Prova social |
| `email_configs` / `email_queue` | 3 / N*3 | E-mails automáticos |
| `audience_configs` | 1:1 | Contador de audiência |
| `login_customizations` | 1:1 | Customização da tela de login |
| `analytics_events` | 1k-100k+ | Eventos de tracking |

#### Estratégia de Segurança (RLS)

Cada tabela tem políticas RLS que garantem:

- **Isolamento multi-tenant**: `org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())`
- **Acesso público controlado**: `registration_pages`, `chat_messages`, `polls`, `cta_configs` têm SELECT público
- **Inserts anônimos**: `registrations`, `analytics_events`, `chat_messages`, `poll_responses` aceitam INSERT sem auth
- **Service role apenas no backend**: Edge Functions usam service_role key (nunca exposta ao client)

#### Estratégia de Migrations

- Migrations SQL versionadas (`001_initial_schema.sql`, `002_jit_and_conversion.sql`, `003_*.sql` para v1.5)
- Sempre aditivas (novas colunas nullable, novas tabelas)
- Backward-compatible: colunas novas com defaults ou nullable
- Backfill scripts incluídos na migration quando necessário (ex: `UPDATE webinars SET slug = id::text WHERE slug IS NULL`)

---

## 5. Riscos

| Risco | Impacto | Probabilidade | Mitigação |
|-------|---------|---------------|-----------|
| Supabase outage | Alto | Baixo (99.9% SLA) | SPA com fallback offline básico; cache local de páginas públicas |
| Vazamento cross-tenant por RLS mal configurada | Alto | Baixo | Script de verificação multi-tenant (`verify-multi-tenant.mjs` na v1.5); testes automatizados de RLS |
| Performance do Realtime com muitos participantes | Médio | Médio | Limite de 10 events/s por canal; paginação de histórico (100 msgs); considerar migration para Broadcast em v2 |
| YouTube/Vimeo derrubarem vídeo | Alto | Baixo | Status do webinar reflete disponibilidade do vídeo; fallback visual no player |
| Edge Functions timeout (Deno Deploy) | Médio | Baixo | Processamento assíncrono via fila (`email_queue`); retry em caso de falha |
| Exposição de chave anon key no client | Baixo | Alto (esperado) | RLS como única defesa — a anon key é pública por design. Políticas RLS são a barreira real |
| Scope creep na v1.5 | Médio | Alto | Plano detalhado em `specs/v1-PLAN.md` com escopo fechado e checkpoints de verificação |

---

## 6. Plano de Implementação

### MVP (v1 — concluído)

| Fase | Tarefa | Status |
|------|--------|--------|
| **Setup** | Projeto Vite + React 19 + Supabase | ✅ |
| | Design system CSS tokens | ✅ |
| | Configuração ESLint + alias `@/` | ✅ |
| **Auth + Multi-tenant** | AuthContext com signUp/signIn/signOut | ✅ |
| | OrgContext derivado do perfil | ✅ |
| | Trigger `handle_new_user()` no PostgreSQL | ✅ |
| | RLS em todas as tabelas | ✅ |
| **Core** | Migration 001 (schema inicial — 13 tabelas) | ✅ |
| | Migration 002 (JIT, oferta, audiência, login) | ✅ |
| | CRUD de webinars com slug único | ✅ |
| | Páginas públicas (registro, espera, sala, replay) | ✅ |
| | Chat realtime + simulado | ✅ |
| | CTAs, enquetes, prova social | ✅ |
| **Analytics** | Tracking de eventos (funnel: 15/30/45/60min, pitch, offer) | ✅ |
| | Dashboard por webinar + global | ✅ |
| | Comparação entre webinars | ✅ |
| **Polish** | i18n (pt-BR + en) | ✅ |
| | Design system HotWebinar (vermelho de marca) | ✅ |
| | Deploy Vercel | ✅ |

### v1.5 (planejado — ver `specs/v1-PLAN.md`)

| Fase | Tarefa | Dependência |
|------|--------|-------------|
| **Migration 003** | `audit_logs`, `page_templates`, colunas em `webinars` | — |
| **Audit** | `lib/audit.js` + wiring nos mutation points | Migration 003 |
| | `AuditLogPage.jsx` em `/audit` | lib/audit.js |
| **Admin** | Edge Function `invite-administrator` | — |
| | `UsersPage.jsx` (lista + convite) | invite-administrator |
| **Templates** | `PageTemplatesEditor.jsx` (CRUD de templates) | Migration 003 |
| | Seletor de template no wizard do webinar | PageTemplatesEditor |
| **Export** | Botão CSV no AnalyticsDashboard | — |
| **Verificação** | `scripts/verify-multi-tenant.mjs` | Migration 001+002 |

### v2 (backlog)

| Fase | Tarefa |
|------|--------|
| **Integrações** | Webhooks para CRM (RD Station, HubSpot, ActiveCampaign) |
| **Chatbot IA** | Geração de mensagens via LLM, integração com chat simulado |
| **Split Testing** | A/B test de páginas de registro e CTAs |
| **Domínio Customizado** | White label com DNS customizado |
| **Agente IA** | Geração automática de conteúdo (chat, descrições, e-mails) |
| **Billing** | Planos pagos, Stripe, limite de webinars/org |

---

## 7. Considerações de Segurança

### Autenticação & Autorização

- **Autenticação**: Supabase Auth (JWT com refresh token automático)
- **Autorização**: Row-Level Security no PostgreSQL — cada query é automaticamente filtrada pelo `org_id` do usuário autenticado
- **Convidados**: Páginas públicas (`/register/:slug`, `/room/:slug`, `/replay/:slug`) não requerem autenticação

### Proteção de Dados

**Criptografia:**

- **Em Trânsito**: TLS 1.3 em todas as conexões (Supabase obriga HTTPS)
- **Em Repouso**: Criptografia AES-256 no PostgreSQL (gerenciado pelo Supabase)
- **Segredos**: `VITE_SUPABASE_ANON_KEY` é pública por design; `SUPABASE_SERVICE_ROLE_KEY` nunca exposta ao client (apenas Edge Functions)

**Dados Pessoais (PII):**

| Dado | Coletado | Base Legal | Retenção |
|------|----------|------------|----------|
| Nome | Sim (registrations.name) | Consentimento (formulário) | Até remoção do webinar |
| E-mail | Sim (registrations.email) | Consentimento | Até remoção do webinar |
| Telefone | Opcional (registrations.phone) | Consentimento | Até remoção do webinar |
| IP / Navegador | Não armazenado ativamente | — | Logs do Supabase (retenção padrão) |

### Boas Práticas de Segurança

- ✅ Sanitização de XSS: `src/lib/sanitize.js` com HTML entity encoding
- ✅ SQL Injection: Prevenido pelo Supabase SDK (prepared statements)
- ✅ CSRF: Tokens gerenciados pelo Supabase Auth automaticamente
- ✅ Rate Limiting: Gerenciado pelo Supabase (nível de infraestrutura)
- ✅ Content Security Policy: A ser implementado (identificado como gap)
- ⚠️ Audit Log: Planejado para v1.5 (rastreamento de ações de admin)

### Compliance

| Regulação | Requisito | Status |
|-----------|-----------|--------|
| **LGPD** | Base legal, consentimento, direito à exclusão | ✅ Consentimento no formulário; ⚠️ endpoint de exclusão pendente |
| **GDPR** | Equivalente LGPD para usuários EU | ⚠️ Não implementado ativamente (foco inicial no Brasil) |

---

## 8. Estratégia de Testes

### Tipos de Teste

| Tipo | Escopo | Abordagem |
|------|--------|-----------|
| **Unit Tests** | Hooks (`useWebinar`, `useChat`, `useAnalytics`), `sanitize.js` | Vitest + React Testing Library |
| **Integration Tests** | Fluxo de registro → analytics, RLS cross-tenant | Playwright ou script manual |
| **E2E Tests** | Jornada completa: criar webinar → registro → assistir → analytics | Playwright |
| **RLS Tests** | Verificação de isolamento multi-tenant | Script `verify-multi-tenant.mjs` (v1.5) |

### Cenários de Teste Críticos

**Unitários:**

- ✅ `sanitizeInput()` escapa tags HTML e scripts XSS
- ✅ `useCountdown()` calcula tempo restante corretamente
- ✅ `useCountdownSeconds()` decrementa até zero
- ✅ CRUD de webinar cria defaults (registration_page, email_configs, audience_configs)
- ✅ Slug único não colide entre orgs

**Integração:**

- ✅ Registro de participante → INSERT em `registrations` + `analytics_events`
- ✅ Chat Realtime → mensagem aparece para todos os participantes
- ✅ CTA dispara no tempo correto do vídeo
- ✅ Enquete coleta respostas sem duplicação
- ✅ E-mail é enfileirado e processado pela Edge Function

**E2E:**

- ✅ Criar conta → criar webinar → publicar → participar → ver analytics
- ✅ Dois usuários em orgs diferentes não veem dados um do outro
- ✅ Webinar Just-in-Time inicia contagem ao entrar
- ✅ Replay expira após tempo configurado

**Carga:**

- Pico: 500 participantes simultâneos em um webinar
- Realtime: 10 mensagens/segundo sustentado
- Analítica: 1000 eventos/min sem degradação

---

## 9. Monitoramento e Observabilidade

### Stack Atual (limitado — MVP)

| Camada | Ferramenta | O que monitora |
|--------|-----------|----------------|
| Frontend | Supabase Dashboard | Erros de API, latência de queries |
| Database | Supabase Dashboard | Conexões, CPU, disco |
| Edge Functions | Supabase Logs | Erros, duração, invocações |
| Deploy | Vercel Analytics | Page views, Core Web Vitals |
| Erros | Console do navegador + Supabase logs | Debug durante desenvolvimento |

### Recomendado para Produção (v1.5+)

| Métrica | Threshold | Alerta |
|---------|-----------|--------|
| Taxa de erro de queries Supabase | >1% em 5min | Slack / e-mail |
| Latência p95 de queries | >500ms | Dashboard |
| Falhas em Edge Functions | >5 em 1min | Slack |
| Core Web Vitals (LCP) | >2.5s | Vercel Analytics |
| Registros por webinar | Métrica de negócio | Dashboard |
| Taxa de comparecimento | <30% | Dashboard (não alerta) |

### O que Logar (Edge Functions)

```json
{
  "level": "info",
  "function": "send-email",
  "to": "user@example.com",
  "status": "sent",
  "duration_ms": 120,
  "timestamp": "2026-07-22T12:00:00Z"
}
```

---

## 10. Plano de Rollback

### Estratégia de Deploy

- **Vercel**: Deploy atômico (build → upload → switch). Reverter é instantâneo no dashboard.
- **Supabase Migrations**: Aditivas e backward-compatible. Rollback = rodar migration reversa.
- **Edge Functions**: Deploy individual por função. Rollback = re-deploy da versão anterior.

### Gatilhos de Rollback

| Gatilho | Ação |
|---------|------|
| Build quebrado (Vercel) | Reverter para deploy anterior no dashboard Vercel |
| Migration com erro | NÃO prosseguir — investigar antes de continuar |
| RLS quebrada (dados vazando) | Rollback imediato da migration + investigação |
| Edge Function com loop/erro | Desabilitar cron trigger + corrigir função |

### Passos de Rollback

1. **Deploy Vercel**: Reverter para o último deploy bem-sucedido no dashboard (1 clique)
2. **Migration SQL**: Executar script de `DROP COLUMN`/`DROP TABLE` reverso (já preparado)
3. **Edge Functions**: Re-deploy com `--no-cache` da versão funcional anterior
4. **Comunicação**: Notificar no Slack interno + atualizar status do projeto

---

## 11. Dependências

| Dependência | Tipo | Status | Risco |
|------------|------|--------|-------|
| Supabase (Auth + DB + Realtime) | Externa (PaaS) | Produção | Médio (vendor lock-in, mas open-source self-hostable) |
| Vercel (Deploy) | Externa (PaaS) | Produção | Baixo (SPA estática, fácil migrar para Netlify/Cloudflare) |
| YouTube / Vimeo | Externa (API de embed) | Produção | Baixo (fallback visual no player) |
| Resend / SendGrid (e-mail) | Externa (API) | Planejado v1.5 | Baixo |
| React 19 | Open-source | Produção | Baixo |
| Vite 6 | Open-source | Produção | Baixo |
| Recharts | Open-source | Produção | Baixo |

---

## 12. Alternativas Consideradas

| Alternativa | Prós | Contras | Decisão |
|------------|------|---------|---------|
| **Supabase (escolhido)** | + BaaS completo (auth + DB + realtime)<br>+ Open-source<br>+ RLS nativo<br>+ Preço previsível | - Vendor lock-in (mitigado: open-source)<br>- Cold start em Edge Functions | ✅ Escolhido |
| Firebase | + Ecossistema Google<br>+ Firestore realtime | - NoSQL (sem joins/SQL)<br>- Sem RLS declarativo<br>- Mais caro em escala | ❌ NoSQL não adequado para dados relacionais |
| NestJS + PostgreSQL próprio | + Controle total<br>+ Sem vendor lock-in | - Muito mais código (API server)<br>- Gerenciar infra (DevOps)<br>- Sem realtime built-in | ❌ Overhead desproporcional para MVP |
| Custom API + AWS RDS | + Escalabilidade cloud | - Complexidade DevOps<br>- Custo inicial alto | ❌ Não justifica para estágio atual |

---

## 13. Requisitos de Performance

| Métrica | Alvo | Medição |
|---------|------|---------|
| LCP (Largest Contentful Paint) | < 2.5s | Vercel Analytics / Lighthouse |
| FID (First Input Delay) | < 100ms | Vercel Analytics |
| CLS (Cumulative Layout Shift) | < 0.1 | Vercel Analytics |
| Carregamento inicial (SPA) | < 3s em 3G | DevTools |
| Lazy loading de página | < 500ms (skeleton → conteúdo) | Percepção do usuário |
| Realtime chat (latência) | < 200ms | Supabase Realtime |
| Queries Supabase (p95) | < 300ms | Supabase Dashboard |

### Otimizações Aplicadas

- **Lazy loading**: Todas as páginas usam `React.lazy()` + `Suspense`
- **Code splitting**: Vite automaticamente divide por rota
- **Cache HTTP**: Assets estáticos com hash no nome (cache forever)
- **Fontes**: Google Fonts com `preconnect` + `display=swap`
- **Ícones**: Lucide React com tree-shaking (só importa o que usa)

---

## 14. Questões em Aberto

| # | Questão | Status |
|---|---------|--------|
| 1 | Migrar `registration_pages.blocks` de `json` string para `jsonb` nativo? | 🔴 Pendente |
| 2 | Adicionar retry com backoff nas Edge Functions de e-mail? | 🔴 Pendente (v1.5) |
| 3 | CSP headers — adicionar via `vercel.json` ou meta tags? | 🔴 Pendente |
| 4 | Rate limiting no client para chat (evitar spam)? | 🔴 Pendente |
| 5 | Suporte a upload de imagem (logo, banner) — usar Supabase Storage? | 🔴 Pendente (v1.5) |

---

## 15. Glossário

| Termo | Definição |
|-------|-----------|
| **Webinar** | Seminário online transmitido ao vivo ou gravado (YouTube/Vimeo embed) |
| **Just-in-Time (JIT)** | Webinar evergreen que inicia quando o participante entra (sem data fixa) |
| **Sala de Espera** | Página com countdown exibida antes do webinar começar |
| **CTA (Call to Action)** | Oferta/botão exibido durante o webinar (ex: "Comprar agora") |
| **Prova Social** | Notificações simuladas de vendas para criar urgência |
| **Chat Simulado** | Mensagens pré-programadas sincronizadas com o vídeo (replay) |
| **RLS (Row-Level Security)** | Política PostgreSQL que filtra queries por usuário/org automaticamente |
| **Edge Function** | Função serverless em Deno executada no Supabase |
| **SPA** | Single Page Application — app React que roda no navegador |
| **BaaS** | Backend as a Service — Supabase substitui o servidor tradicional |
| **Org / Tenant** | Organização (cliente) — unidade de isolamento multi-tenant |
| **Funil de Assistência** | Métrica que mostra quantos % dos participantes assistiram 15/30/45/60 min |
| **Pitch** | Momento do vídeo onde o apresentador faz a oferta principal |

---

## 16. Aprovação

| Papel | Status | Data |
|-------|--------|------|
| Tech Lead | ✅ Aprovado | 2026-07-22 |

---

> **Próximos passos:** Validar escopo da v1.5 com stakeholders, criar tasks no board, iniciar implementação conforme `specs/v1-PLAN.md`.
