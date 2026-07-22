# Spec: Webinar SaaS — Backlog v1.5/v2 (pós-MVP)

**Status:** Validado — avançando para Plan da release v1 (uma release por vez)

**Decisões confirmadas em 2026-07-22:**
- Execução **uma release por vez**: Plan+Tasks só da v1 agora; v1.5 e v2 ficam para depois que v1 for validada.
- **Sem Vitest por enquanto** — o teste de isolamento multi-tenant (item pendente do MVP) será feito como script Node standalone (`scripts/verify-multi-tenant.mjs`), não como suíte Vitest.
- **Provedor de IA ainda não decidido** — a interface `AiProvider` do v2 fica agnóstica de provedor; decisão real fica para mais perto da implementação do v2.
**Fonte:** `.tmp/hotwebinar-scrape/PRD.md` (seções "Fases de entrega recomendadas" e "Seams de arquitetura")
**Pré-requisito:** MVP já implementado (migration `002_jit_and_conversion.sql` + JIT, sala de espera, oferta com timing, funil canônico, prova social, audiência, login customization). Este spec cobre o que resta.

---

## ASSUMPTIONS I'M MAKING

1. **Escopo** = tudo que ficou de fora do MVP no PRD: Administrators/Usuários, Audit log, Páginas (templates reaproveitáveis), Integrações CRM, Chatbot (keywords), Split Testing (A/B), Domínio custom, Agente de IA, Geração de chat via IA, Atendimento ao vivo (Attendance Room), Billing/Plano/Tokens (Firepay).
2. Dado o tamanho, este spec **fatia o backlog em 3 releases independentes** (v1 → v1.5 → v2, mesma nomenclatura do PRD) em vez de tratar tudo como uma entrega única. Cada release tem seu próprio Plan/Tasks antes de eu implementar — não vou implementar v2 antes de v1 estar fechado e validado.
3. **Sem credenciais reais de terceiros** (ActiveCampaign, Keap, Kommo, ManyChat, Firepay, provedor de IA). As integrações serão construídas como **adapters com interface estável + fila de outbox**, mas o transporte HTTP real fica atrás de uma env var (`INTEGRATION_MODE=mock|live`). Em `mock`, o adapter grava o payload que teria sido enviado numa tabela de log, sem chamar a API externa — permite testar o fluxo fim-a-fim sem chave.
4. **Agente de IA / geração de chat**: mesma lógica — interface `AiProvider` (chat completion) por trás de env var `AI_PROVIDER_API_KEY`. Sem a chave, o app deve degradar graciosamente (mostrar erro amigável "IA não configurada"), nunca quebrar o resto do produto.
5. **Billing/Firepay** fica restrito a: plano da conta, contagem de tokens de IA consumidos, histórico de uso — sem processar pagamento real. Webhook de venda do Firepay é modelado mas não testável sem credencial.
6. **Stack não muda**: React 19 + Vite + react-router-dom + Supabase (Postgres/Auth/Realtime) + Edge Functions (Deno) para lógica de servidor (chamadas de IA, webhooks assinados, cron de integrações). Sem TypeScript (mantém convenção atual do repo).
7. **Testes**: o repo não tem test runner hoje. Este spec assume a **adoção de Vitest** (+ Testing Library para componentes críticos) como parte da Fase v1, porque o PRD exige explicitamente teste de isolamento multi-tenant e 80% de cobertura em auth/billing — isso é uma mudança de dependências, então marco como **"ask first"** abaixo e só instalo após confirmação.
8. **Atendimento ao vivo (Attendance Room)** usa Supabase Realtime (mesmo mecanismo já usado no chat), não um serviço de terceiros (ex.: nada de Zendesk/Twilio).
9. Fora de escopo mesmo em v2 (conforme "Out of Scope" do PRD): streaming WebRTC ao vivo real, marketplace de templates, app mobile nativo, editor drag-and-drop, migração de dados de terceiros.

> Corrija agora qualquer suposição errada, ou eu prossigo com estas.

---

## Objective

Fechar o restante do PRD do HotWebinar/EvergreenRoom em cima da base já implementada (MVP), entregando as 3 releases pós-MVP definidas pelo próprio PRD:

- **v1** — Usuários/Administrators, Audit log, Páginas (templates reaproveitáveis entre webinars), export de métricas.
- **v1.5** — Integrações CRM (ActiveCampaign, Keap, Kommo, ManyChat) por webinar + globais, Chatbot (keywords), Split Testing (A/B), domínio custom.
- **v2** — Agente de IA no chat da sala, geração de chat simulado via IA, Atendimento ao vivo (sala de atendimento), Billing/Plano/Tokens (Firepay).

Usuário-alvo: operador de marketing e administrador da conta (personas já definidas no PRD principal). Sucesso = cada seam do PRD sai de "NÃO IMPLEMENTADO" para "IMPLEMENTADO COMPLETO" na tabela de gap analysis já produzida nesta conversa.

## Tech Stack

- React 19 + Vite 6, react-router-dom 7, i18next, lucide-react, recharts, date-fns
- Supabase (`@supabase/supabase-js`) — Postgres com RLS multi-tenant, Auth, Realtime, Edge Functions (Deno) para lógica server-side
- Sem TypeScript (JS/JSX, seguindo o padrão já estabelecido no repo)
- **Novo nesta fase (ask first):** Vitest + @testing-library/react para testes automatizados

## Commands

```
Dev:      npm run dev
Build:    npm run build
Preview:  npm run preview
Lint:     npm run lint          (⚠ falta eslint.config.js no repo — precisa ser criado antes de funcionar)
Test:     npm test               (a criar — vitest run)
Test cov: npm run test:coverage  (a criar — vitest run --coverage)
Migração: aplicar supabase/migrations/*.sql via Supabase SQL editor ou `supabase db push`
```

## Project Structure

```
src/
  components/editor/     → editores por seam (um arquivo por aba do wizard)
  pages/dashboard/        → telas autenticadas (admin)
  pages/public/           → telas públicas (registro, sala, espera, replay)
  hooks/                  → um hook por domínio de dados (useX.js)
  contexts/               → Auth, Org (multi-tenant)
  lib/                    → constants.js, supabase.js, sanitize.js, i18n.js
supabase/
  migrations/             → uma migration numerada por incremento de schema
  functions/              → Edge Functions (Deno) — lógica de servidor
specs/                    → specs deste fluxo spec-driven (este arquivo e os que vierem)
tests/                    → (a criar) testes unitários/integração com Vitest
  tests/multi-tenant.test.js → isolamento RLS entre orgs (item explícito do MVP, ainda pendente)
```

## Code Style

Exemplo real do padrão já usado no repo (`InteractionsEditor.jsx`) — seguir o mesmo formato para novos editores de seam:

```jsx
const addSale = async (e) => {
  e.preventDefault();
  if (!newSale.buyer_name || !newSale.product_name) return;

  const { data } = await supabase.from('sales_notifications').insert({
    webinar_id: webinarId,
    ...newSale,
  }).select().single();

  if (data) {
    setSales([...sales, data].sort((a, b) => a.show_at_seconds - b.show_at_seconds));
    setNewSale({ buyer_name: '', buyer_location: '', product_name: '', show_at_seconds: 0 });
  }
};
```

Convenções:
- Componente de editor = função nomeada, export default, recebe `webinarId` como prop
- Chamadas Supabase inline no componente (sem camada de repositório separada — é o padrão já estabelecido, não introduzir uma nova abstração)
- Estado local via `useState`, sem lib de gerenciamento de estado global além dos Contexts existentes (Auth/Org)
- Constantes de enum (status, tipos, modos) sempre em `lib/constants.js`, nunca strings soltas no componente
- CSS: um arquivo `.css` por componente/página, classes utilitárias globais (`card`, `input-group`, `btn`, `toggle-label`) já definidas em `styles/index.css` — reaproveitar, não recriar

## Testing Strategy

- **Sem test runner nesta fase** (decisão confirmada — sem Vitest por ora).
- **Isolamento multi-tenant** (item pendente do checklist de aceite do MVP): script Node standalone `scripts/verify-multi-tenant.mjs`, executável via `node scripts/verify-multi-tenant.mjs`, que usa `@supabase/supabase-js` com duas contas de teste (org A / org B) e falha (`process.exit(1)`) se a RLS deixar vazar dado entre orgs. Não é uma suíte automatizada de CI, é uma verificação sob demanda.
- **Verificação de cada task:** `npm run build` limpo + checagem manual do fluxo no navegador (sem Playwright neste spec).
- **E2E:** fora de escopo deste spec.

## Boundaries

- **Sempre fazer:** manter o envelope de dados consistente com o schema já existente; toda nova tabela ganha RLS scoped por `org_id` seguindo o padrão das migrations 001/002; toda integração externa fica atrás de adapter + env var de modo mock/live; rodar `npm run build` antes de considerar uma task concluída.
- **Perguntar antes:** criar `eslint.config.js` (o repo não tem um hoje); qualquer decisão de qual provedor de IA usar de fato (nome do SDK, modelo, custo) — fica para v2; criar/rodar Edge Functions que fazem chamadas HTTP para serviços externos reais; alterar o schema de `webinars`/`registrations` de forma destrutiva.
- **Nunca fazer:** commitar chaves de API reais (ActiveCampaign, Keap, Kommo, ManyChat, Firepay, provedor de IA) — sempre `import.meta.env.VITE_*` com fallback seguro; implementar qualquer coisa listada em "Out of Scope" do PRD principal (WebRTC ao vivo, app nativo, marketplace, editor drag-and-drop).

## Success Criteria

Por release, todas as seams do PRD saem de "NÃO IMPLEMENTADO"/"PARCIAL" para "IMPLEMENTADO COMPLETO":

**v1:** Administrators (convite/gestão de usuários da conta com papéis admin/operador/atendente), Audit log (toda mutação relevante grava quem/quando/o quê), Páginas (templates de registro/espera reaproveitáveis entre webinars, não 1:1 com o webinar), export de métricas em CSV funcional (hoje é um botão sem ação), `tests/multi-tenant.test.js` passando.

**v1.5:** Integrações CRM configuráveis por webinar com regras (evento → tag/webhook) e execução via outbox com retry (mesmo em modo mock); Chatbot com keywords/auto-resposta funcionando na sala; Split Testing distribuindo tráfego entre webinar A/B e reportando métricas isoladas por variante; domínio custom configurável em Settings.

**v2:** Agente de IA respondendo no chat da sala com base em instruções/contexto/FAQ configurados, com contagem de tokens persistida e bloqueio em saldo zero; geração de chat simulado via IA a partir de um prompt; sala de Atendimento ao vivo (atendente vê e responde participantes em tempo real via Realtime); Plano/Tokens/Pagamentos visível em "Meu plano" (mesmo que Firepay fique em modo mock).

## Open Questions

1. ~~Ordem de execução~~ — **resolvido:** uma release por vez, v1 primeiro.
2. ~~Vitest~~ — **resolvido:** não instalar por ora; isolamento multi-tenant vira script Node standalone.
3. ~~Provedor de IA~~ — **resolvido:** ainda não decidido; interface `AiProvider` fica agnóstica até a implementação do v2.
4. Split Testing e domínio custom (v1.5) dependem de decisões de infraestrutura (DNS, wildcard subdomain) que este spec não cobre — a confirmar quando chegarmos na v1.5: ficam só no nível de configuração dentro do app, a parte de infra/DNS real fica por sua conta?
