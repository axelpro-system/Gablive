# Plan: v2 AI Agents & Chat Platform

**Branch:** `feat/v2-ai-agents` (nova worktree a partir de `feat/qa-section`)

## Escopo

5 features:

1. **🔌 AiProvider genérico** — abstrair provedor de IA (Gemini hoje, OpenAI/Claude amanhã)
2. **🤖 Agente de IA no chat da sala** — IA responde participantes diretamente no chat
3. **💬 Geração de chat simulado via IA** — gerar mensagens de chat simulado por prompt
4. **🪙 Token counting + planos** — contar tokens consumidos, bloquear se saldo zerar
5. **🧑‍💼 Sala de Atendimento ao vivo** — dashboard de atendimento em tempo real

---

## Dependências

```
Fase A (Foundation)
├── A1: AiProvider interface + OpenAI adapter
├── A2: ai_usage table + token counting
├── A3: organizations.plan + monthly token limit
│
Fase B (Chat Agent)          Fase C (Simulated AI)     Fase D (Attendance)
├── B1: chat-agent EF        ├── C1: generate-chat EF  ├── D1: AttendanceRoom page
├── B2: UI toggle na sala    ├── C2: UI no editor      ├── D2: Rota /admin/attendance
├── B3: mentions IA          └── C3: botão "Gerar"     └── D3: Realtime sync
```

**Ordem de execução:** A1 → A2 → A3 → B1+B2 → C1+C2 → D1+D2+D3

---

## Fase A — Foundation (banco + shared)

### A1: AiProvider Interface Genérica

**Arquivos:**

| Arquivo | Ação |
|---------|------|
| `supabase/functions/_shared/ai-provider.ts` | **Criar** — Interface `AiProvider` + factory |
| `supabase/functions/_shared/gemini.ts` | **Refatorar** — implementar `AiProvider` |
| `supabase/functions/_shared/openai.ts` | **Criar** — adapter OpenAI (compatível ChatGPT/Claude via API) |
| `supabase/functions/qa-answer/index.ts` | **Refatorar** — usar `getAiProvider()` |

**Interface:**

```ts
interface AiProvider {
  generateContent(params: {
    apiKey: string;
    model: string;
    systemPrompt?: string;
    messages: { role: 'user' | 'assistant'; content: string }[];
    maxTokens?: number;
    temperature?: number;
  }): Promise<{
    text: string;
    promptTokens: number;
    responseTokens: number;
    totalTokens: number;
  }>;
}
```

**Factory:** `getAiProvider(providerName: string): AiProvider`
- Lê `provider` do `ai_agent_configs` (armazenado como 'gemini', 'openai')
- Retorna adapter correto
- `ai_agent_configs.provider` já existe (`TEXT NOT NULL DEFAULT 'gemini'`)

**shared/openai.ts:**
- Chama `POST https://api.openai.com/v1/chat/completions` (ou compatible)
- Mapeia `model` (ex: 'gpt-4o', 'gpt-4o-mini')
- Retorna tokens da resposta
- Clientes Claude (Anthropic) podem ser adicionados depois via `claude.ts`

**shared/gemini.ts:**
- Refatorar `generateContent()` para implementar `AiProvider`
- Adaptar signature atual para nova interface
- Manter compatibilidade com chamadas existentes

### A2: Token Counting (`ai_usage`)

**Migration `010_ai_usage.sql`:**

```sql
-- Track AI token usage per organization
CREATE TABLE ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  webinar_id UUID REFERENCES webinars(id) ON DELETE SET NULL,
  provider TEXT NOT NULL DEFAULT 'gemini',
  model TEXT NOT NULL DEFAULT 'gemini-2.5-pro',
  feature TEXT NOT NULL CHECK (feature IN ('qa_answer', 'chat_agent', 'simulated_chat')),
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  response_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_usage_org ON ai_usage(org_id, created_at DESC);

ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;
-- Org members can view their own usage
CREATE POLICY "Org members view AI usage"
  ON ai_usage FOR SELECT
  USING (org_id IN (
    SELECT org_id FROM profiles WHERE user_id = auth.uid()
  ));
-- Service role only for INSERT
CREATE POLICY "Service role insert AI usage"
  ON ai_usage FOR INSERT
  WITH CHECK (auth.role() = 'service_role');
```

**Helper `_shared/tokenTracker.ts`:**
```ts
export async function recordAiUsage(orgId, webinarId, provider, model, feature, promptTokens, responseTokens)
// INSERT into ai_usage with total_tokens = prompt + response
// Returns total tokens used this month for the org
export async function getMonthlyTokenUsage(orgId): Promise<number>
// SELECT SUM(total_tokens) FROM ai_usage WHERE org_id = $1 AND created_at >= date_trunc('month', now())
```

### A3: Planos + Monthly Limit

**Migration `011_org_plans.sql`:**

```sql
ALTER TABLE organizations ADD COLUMN plan TEXT NOT NULL DEFAULT 'free'
  CHECK (plan IN ('free', 'starter', 'pro', 'enterprise'));

ALTER TABLE organizations ADD COLUMN monthly_token_limit INTEGER NOT NULL DEFAULT 100000;  -- free tier
ALTER TABLE organizations ADD COLUMN monthly_tokens_used INTEGER NOT NULL DEFAULT 0;
```

**Helper function `check_ai_quota(orgId)`:**
- Compara `monthly_tokens_used + incoming_tokens <= monthly_token_limit`
- Se exceder, retorna `{ blocked: true, reason: 'monthly_limit' }`

**Onde aplicar:** Em toda Edge Function que consome IA (qa-answer, chat-agent, generate-chat).

---

## Fase B — Agente de IA no Chat da Sala

### B1: Edge Function `chat-agent`

**Arquivo:** `supabase/functions/chat-agent/index.ts`

**Trigger:** Realtime subscription ou HTTP endpoint chamado quando uma nova mensagem de participante chega.

**Duas abordagens (fazer a #1 primeiro, #2 depois):**

**Abordagem #1 — HTTP endpoint (acionado pelo cliente ou via Supabase Webhook):**
- `POST /chat-agent` com `{ webinar_id, message_id }`
- Autenticado via `x-chat-agent-secret` (mesmo padrão do send-email)
- Busca a mensagem, o config do AI agent, contexto do chat (últimas 20 mensagens)
- Verifica se `auto_reply` está ativo + se a pergunta não é do próprio agente
- Gera resposta via `AiProvider`
- Insere resposta como `chat_messages` com `user_name = "Assistente IA"` (ou o nome do agente)
- Registra em `ai_usage`

**Abordagem #2 — Supabase Database Webhook (para depois):**
- Configurar webhook no Supabase para `INSERT on chat_messages`
- Edge Function recebe via POST, processa, responde
- Mais real-time, mas precisa configurar webhook no dashboard do Supabase

**Contexto enviado para IA:**
```
System: [system_prompt do AIAgentEditor]
FAQ: [faq_items]
Document: [document_text]
Chat history (últimas 20 mensagens):
[user1: msg]
[user2: msg]
...
[Participante: nova pergunta]
```

**Regras:**
- Só responde se `ai_agent_configs.enabled = true` e `auto_reply = true`
- Ignora mensagens do próprio agente (por `user_name`)
- Rate limit: máximo 1 resposta a cada 10s por webinar (evita loop)
- Verifica `check_ai_quota(orgId)` antes de chamar IA

### B2: UI — Indicador na sala

**Arquivo:** `src/pages/public/WebinarRoomPage.jsx`

- Adicionar badge "IA Online" no header do chat quando `ai_agent_configs.enabled = true`
- Botão "Perguntar ao assistente" (opcional, se `auto_reply = false`)
- Indicador de digitação "Assistente IA está respondendo..."

**Detalhes:**
- Buscar `ai_agent_configs` via hook próprio (ou endpoint público)
- Cache: só busca 1x, arredondado
- Se `auto_reply = true`, não mostra UI extra — já responde automaticamente
- Se `auto_reply = false`, mostrar botão "Perguntar ao assistente" abaixo do input

### B3: Menção @IA no chat

- Se o participante digitar `@ia` ou `@assistente` no chat, a mensagem é roteada para o agente
- Mesmo que `auto_reply = false`, menções são respondidas
- Implementado no frontend: ao detectar `@ia` no início da mensagem, chama `supabase.functions.invoke('chat-agent')`

---

## Fase C — Geração de Chat Simulado via IA

### C1: Edge Function `generate-chat`

**Arquivo:** `supabase/functions/generate-chat/index.ts`

**Payload:**
```json
{
  "webinar_id": "uuid",
  "prompt": "Gere 10 mensagens de chat para um webinário de marketing digital",
  "count": 10,
  "locale": "pt-BR"
}
```

**Flow:**
1. Verifica JWT (admin/presenter do webinar)
2. Busca `ai_agent_configs` do webinar para pegar provider config
3. Monta prompt: "Gere {count} mensagens de chat simuladas para um webinário. As mensagens devem parecer reais, com nomes brasileiros comuns. Use {locale}. Prompt do usuário: {prompt}. Retorne em JSON array: [{author_name, message, timestamp_seconds}]"
4. Chama IA via `AiProvider`
5. Retorna array de mensagens geradas

**Formato de retorno:**
```json
{
  "messages": [
    { "author_name": "Maria S.", "message": "Adorei o conteúdo!", "timestamp_seconds": 120 },
    ...
  ]
}
```

### C2: UI no InteractionsEditor

**Arquivo:** `src/components/editor/InteractionsEditor.jsx`

- Botão "Gerar com IA" no sub-tab "Chat Simulado"
- Modal/panel com:
  - Campo de prompt: "Descreva o tipo de chat que quer gerar..."
  - Select de quantidade (5, 10, 15, 20)
  - Select de idioma (pt-BR / en)
  - Botão "Gerar"
- Loading state enquanto gera
- Preview das mensagens geradas
- Botão "Adicionar todas" (insere no `simulated_messages`)
- Botão "Regenerar"

---

## Fase D — Sala de Atendimento ao Vivo

### D1: Página de Atendimento

**Arquivo:** `src/pages/dashboard/AttendanceRoomPage.jsx` + CSS

**Rota:** `/admin/attendance/:slug` ou `/webinars/:id/attendance`

**Funcionalidades:**
- Feed em tempo real (Realtime) de `chat_messages` do webinar
- Sidebar com participantes online (baseado em `registrations`)
- Input para atendente responder (insere como `chat_messages` com destaque "Atendente")
- Filtro: todas / não lidas / respondidas
- Badge de não lidas

**Layout:**
```
┌───────────────────────────────────────────┐
│  Header: [Webinar title]  [Online: 12]    │
├───────────────────┬───────────────────────┤
│                   │                       │
│   Feed do Chat    │  Participantes         │
│   em tempo real   │  ─ João Silva         │
│                   │  ─ Maria Santos       │
│   [msg]           │  ─ Carlos Pereira     │
│   [msg]           │                       │
│   [msg]           │                       │
│                   │                       │
│  ┌──────────────┐ │                       │
│  │ Digite...    │ │                       │
│  └──────────────┘ │                       │
└───────────────────┴───────────────────────┘
```

### D2: Rota no Dashboard

**Arquivo:** `src/App.jsx` ou router config

```jsx
<Route path="/webinars/:id/attendance" element={<AttendanceRoomPage />} />
```

- Link na página de edição do webinar ou no dashboard
- Apenas admin/presenter pode acessar

### D3: Realtime Sync

- Usa o mesmo canal `chat:${webinarId}` já existente
- Distingue atendente vs participante por `user_email` ou flag `is_attendant`
- Mensagens do atendente aparecem com estilo diferente no chat da sala (cor destacada, badge "Atendente")

---

## Arquivos Afetados (resumo)

### Shared / Edge Functions

| Arquivo | Ação |
|---------|------|
| `supabase/functions/_shared/ai-provider.ts` | **CRIAR** |
| `supabase/functions/_shared/openai.ts` | **CRIAR** |
| `supabase/functions/_shared/tokenTracker.ts` | **CRIAR** |
| `supabase/functions/_shared/gemini.ts` | **REFATORAR** |
| `supabase/functions/qa-answer/index.ts` | **REFATORAR** |
| `supabase/functions/chat-agent/index.ts` | **CRIAR** |
| `supabase/functions/generate-chat/index.ts` | **CRIAR** |

### Migrations

| Arquivo | Ação |
|---------|------|
| `supabase/migrations/010_ai_usage.sql` | **CRIAR** |
| `supabase/migrations/011_org_plans.sql` | **CRIAR** |

### Frontend

| Arquivo | Ação |
|---------|------|
| `src/pages/public/WebinarRoomPage.jsx` | **MODIFICAR** (badge IA, menção @ia) |
| `src/pages/public/WebinarRoomPage.css` | **MODIFICAR** (estilos do badge) |
| `src/components/editor/InteractionsEditor.jsx` | **MODIFICAR** (botão Gerar com IA) |
| `src/components/editor/InteractionsEditor.css` | **MODIFICAR** |
| `src/pages/dashboard/AttendanceRoomPage.jsx` | **CRIAR** |
| `src/pages/dashboard/AttendanceRoomPage.css` | **CRIAR** |
| `src/components/editor/AIAgentEditor.jsx` | **MODIFICAR** (add provider selector) |
| `src/components/editor/AIAgentEditor.css` | **MODIFICAR** |
| `src/lib/constants.js` | **MODIFICAR** (add PROVIDERS, FEATURES) |
| `src/locales/pt-BR.json` | **MODIFICAR** |
| `src/locales/en.json` | **MODIFICAR** |
| Router config | **MODIFICAR** (add /attendance rota) |

---

## Como entregar

Cada fase é um commit atômico na worktree `feat/v2-ai-agents`.

1. **Commit A:** AiProvider + OpenAI adapter + tokenTracker + ai_usage migration
2. **Commit B:** Org plans + quota check + provider selector no AIAgentEditor
3. **Commit C:** chat-agent EF + badge IA na sala + @ia mention
4. **Commit D:** generate-chat EF + botão "Gerar com IA" no InteractionsEditor
5. **Commit E:** AttendanceRoom page + routing + realtime sync

---

## Pronto para começar?

Quer que eu inicie pela **Fase A (Foundation)** — a base que todas as outras dependem?
