# Gablive: PRD de melhoria brownfield para medição de valor, nota de saúde e planos por assento

> **Status:** rascunho v0.1, aguardando revisão dos requisitos (FR/NFR/CR) e da sequência de stories.
> **Origem:** prioridades 1 e 2 de `docs/brainstorms/2026-09-24-retencao-expansao.md`.

## 1. Análise do projeto e contexto

### 1.1 Visão geral do projeto existente

**Fonte da análise:** análise feita diretamente no código do repositório, em 2026-09-24. Nenhum `document-project` havia sido gerado antes.

**Estado atual:** o Gablive é uma plataforma de webinários multi-tenant para funis de vendas, com webinars ao vivo, gravados e JIT evergreen. É uma SPA em React 19 + Vite com Supabase (Postgres + RLS, Auth, Realtime e Edge Functions em Deno), hospedada na Vercel. O painel tem CRUD de webinars, leads, analytics, usuários, integrações de vendas (Hotmart e SellFlux), agentes de IA e um console de administração da plataforma (`AdminGatewayPage`).

### 1.2 Documentação disponível

- [x] Stack técnica: `claude.md`, `PRODUCT.md`
- [x] Estrutura de código: `claude.md` (seções "Structure" e "Where to look")
- [x] Padrões de código: `claude.md` (seção "Conventions")
- [ ] Documentação de API: apenas parcial, espalhada pelas migrations e RPCs
- [x] APIs externas: `docs/INTEGRACOES-VENDAS.md`
- [x] Guia de UX/UI: `DESIGN.md`, `specs/DESIGN-SYSTEM.md`
- [ ] Dívida técnica: não documentada

**Personas de origem** (`docs/hous3/personas.md`): **Equipe da plataforma** para métricas, nota de saúde e gestão de planos (FR1–FR4, FR12); **Administrador da organização** para assentos e "Meu plano" (FR9–FR11, FR13).

### 1.3 Escopo da melhoria

**Tipo:** adição de nova funcionalidade (medição e cobrança) e modificação de uma funcionalidade existente (convite de usuários).

**Descrição:** o Gablive passa a agregar, por organização, o valor que entrega (inscritos, presença, cliques em CTA e vendas atribuídas) e a calcular uma nota de saúde, que só a equipe Gablive vê. Também passa a ter planos com limite de **assentos** (usuários por organização). A equipe ativa os planos manualmente, sem cobrança automática nesta fase.

**Impacto:** moderado. Surgem tabelas e RPCs novas, a Edge Function `invite-administrator` muda, a RPC de criação de organização (`ensure_user_profile`) é ajustada e três telas são alteradas.

### 1.4 Objetivos e contexto

**Objetivos**
- Medir por organização a métrica-norte: **receita atribuída ao Gablive por organização por mês**.
- Identificar organizações em risco de churn antes do cancelamento.
- Criar a estrutura de planos e assentos, que torna a receita mensurável e expansível.
- Preparar o terreno para cobrança automática e para o modelo de agência, sem implementar nenhum dos dois agora.

**Contexto**
Hoje não existe plano, assinatura ou limite de uso. `investor-materials/facts.md` mostra MRR, churn e clientes pagantes como `[A PREENCHER]`, e não há como preencher esses campos a partir do produto. Por outro lado, os dados de valor já existem: `analytics_events` registra entrada na sala, progresso do vídeo, visualização e clique no CTA, e `purchases` guarda as vendas atribuídas com valor (via `purchase-webhook`). A medição, portanto, é sobretudo **agregação**, não instrumentação nova.

A decisão de cobrar por assento é do negócio. Ela se encaixa no modelo de dados atual, já que `profiles` é 1:1 com a organização. Cobrar por organização cliente, que é o modelo de agência, exige que um usuário participe de várias organizações e fica para a fase 2 (ver §6).

### 1.5 Change log

| Mudança | Data | Versão | Descrição | Autor |
|---|---|---|---|---|
| Criação | 2026-09-24 | 0.1 | Rascunho inicial a partir do brainstorming de retenção e expansão | Morgan (pm) |

## 2. Requisitos

### 2.1 Funcionais

- **FR1:** O sistema agrega, por organização e por janela de tempo (padrão: últimos 30 dias, comparados aos 30 dias anteriores): webinars publicados, inscrições, taxa de presença, cliques em CTA, número de compras aprovadas e receita atribuída (soma de `purchases.amount` com `status = 'approved'`).
- **FR2:** O sistema calcula uma **nota de saúde de 0 a 100** por organização e a classifica como `saudável` (≥ 70), `atenção` (40–69) ou `risco` (< 40), com base em quatro sinais:
  - dias desde a última inscrição recebida (40%)
  - variação de inscrições em relação ao período anterior (25%)
  - taxa de presença (15%)
  - existência de venda atribuída no período (20%)

  Os pesos e os cortes são iniciais e devem ficar em um único ponto de configuração, para ajuste posterior.
- **FR3:** O `AdminGatewayPage` ganha a aba **"Saúde"**. Ela lista todas as organizações com nota, classificação, os quatro sinais, plano atual e assentos usados/limite. A lista pode ser ordenada e filtrada por classificação.
- **FR4:** Só administradores da plataforma (`platform_admins`) acessam a nota de saúde e os dados agregados de outras organizações.
- **FR5:** O sistema passa a ter um catálogo de **planos**. Cada plano tem nome, limite de assentos (`NULL` = ilimitado), preço de referência mensal (apenas informativo), se está ativo e um campo `features` (JSONB) reservado para add-ons futuros.
- **FR6:** Cada organização tem exatamente uma **assinatura** vigente, com plano, status (`trial`, `active`, `past_due`, `canceled`), início, fim do trial e observações internas.
- **FR7:** Toda organização criada a partir desta mudança recebe automaticamente a assinatura no plano de entrada, com status `trial`.
- **FR8:** Um **assento** é um usuário da organização com papel `admin`, `presenter` ou `attendee` (a contagem do `attendee` está em aberto, §7 questão 3). Também está em aberto se o convite ainda não aceito conta como assento (§7 questão 5), já que hoje ele cria um registro em `profiles` no momento do convite. O participante de webinar (`registrations`) **não** ocupa assento.
- **FR9:** `invite-administrator` recusa o convite quando os assentos usados já atingiram o limite do plano, com o erro `seat_limit_reached` e uma mensagem amigável em pt-BR e en.
- **FR10:** O `UsersPage` mostra "X de Y assentos usados". Quando o limite é atingido, desabilita o botão de convidar e mostra uma chamada para falar com a equipe sobre upgrade.
- **FR11:** Em Configurações, a nova seção **"Meu plano"** mostra ao admin da organização: nome do plano, status, fim do trial (se houver), assentos usados/limite e um contato para upgrade. Ela não mostra a nota de saúde.
- **FR12:** A equipe Gablive, pelo `AdminGatewayPage`, pode trocar o plano de uma organização, mudar o status da assinatura e estender o trial. Cada ação grava um registro em `audit_logs` com `is_platform_action = true`.
- **FR13:** Se um downgrade ou uma troca de plano deixar a organização acima do limite, nenhum usuário é removido. Apenas novos convites ficam bloqueados até os assentos voltarem ao limite.

### 2.2 Não funcionais

- **NFR1:** Toda tabela nova tem RLS habilitado. A organização lê apenas a própria assinatura, e somente administradores da plataforma (ou o `service_role`) escrevem em `plans` e `org_subscriptions`.
- **NFR2:** A agregação da aba "Saúde" responde em menos de 2 s para até 500 organizações. Se isso não for atingido, a story 1.2 deve introduzir uma view materializada atualizada por agendamento, sem mudar o contrato da RPC.
- **NFR3:** O limite de assentos é aplicado **no servidor** (Edge Function ou RPC). A UI apenas reflete o limite e nunca é a única barreira.
- **NFR4:** Nenhuma chave `service_role` entra no bundle do cliente nem em variáveis `VITE_*` (convenção de `claude.md`).
- **NFR5:** Todos os textos novos passam pelo i18next, em pt-BR (padrão) e en.
- **NFR6:** A lógica pura (cálculo da nota, contagem de assentos, decisão de bloqueio) fica em `src/lib/` e tem teste em `tests/unit/*.test.js` (`node --test`).
- **NFR7:** Nenhum `catch` silencioso. Os erros de limite são exibidos ao usuário, e os erros inesperados são registrados em log.

### 2.3 Compatibilidade

- **CR1 (APIs):** O contrato atual de `invite-administrator` (entrada `{ email, role, orgId }`, respostas de sucesso e erros existentes) continua o mesmo. Entra apenas o novo erro `seat_limit_reached`.
- **CR2 (esquema):** As tabelas existentes não perdem nenhuma coluna. As migrations são aditivas e numeradas a partir de `032_`. Toda organização existente recebe a assinatura no plano **"Legado"** (assentos ilimitados, status `active`), para que nenhum cliente atual seja bloqueado.
- **CR3 (UI/UX):** As telas novas usam as custom properties de `src/styles/index.css` e os componentes e padrões de tabela, badge e card que o `AdminGatewayPage` e o `UsersPage` já usam. O grid do Bootstrap é a única parte do Bootstrap permitida.
- **CR4 (integrações):** `purchase-webhook`, `process-email-queue` e os fluxos públicos de inscrição, espera e sala não mudam. As inscrições de participantes nunca são bloqueadas por plano nesta fase.

## 3. Objetivos de interface

### 3.1 Integração com a UI existente
A aba "Saúde" segue a estrutura de abas e tabelas do `AdminGatewayPage` (Organizações, Usuários, Webinários, Registros), com badges de classificação nos mesmos estilos de status já usados ("Ativa", "Suspensa", "Pendente"). "Meu plano" entra como uma seção do `SettingsPage`.

### 3.2 Telas novas ou alteradas
- `AdminGatewayPage`: nova aba **Saúde** e ação **Gerenciar plano** na linha da organização.
- `UsersPage`: indicador de assentos e bloqueio do convite.
- `SettingsPage`: nova seção **Meu plano**.

### 3.3 Consistência
- As cores de classificação usam os tokens semânticos existentes (sucesso, alerta e perigo). Nenhuma cor nova é criada.
- As mensagens de limite têm tom neutro e sempre indicam o próximo passo (falar com a equipe). Nunca devem parecer um erro do sistema.

## 4. Restrições técnicas e integração

### 4.1 Stack atual
- **Linguagens:** JavaScript/JSX (sem TypeScript) no front-end e TypeScript/Deno nas Edge Functions
- **Frameworks:** React 19, React Router 7, Vite 6, i18next
- **Banco:** Supabase Postgres 17 com RLS, e RPCs `SECURITY DEFINER` para leituras públicas e agregadas
- **Infraestrutura:** Vercel (SPA) e Supabase (projeto `lgmtuabuuarxyfnhidbr`)
- **Dependências externas:** Resend, Hotmart, SellFlux e Gemini (com a chave de cada organização)

### 4.2 Abordagem de integração
- **Banco:**
  - Novas tabelas `plans` e `org_subscriptions` (esta com `UNIQUE (org_id)`).
  - Nova RPC `get_org_value_metrics(p_org_id, p_from, p_to)`, que junta `webinars` → `registrations` / `analytics_events`, mais `purchases`.
  - Nova RPC `get_platform_org_health()`, restrita a `platform_admins`.
  - Nova RPC `get_org_seat_usage(p_org_id)`.
  - `ensure_user_profile` (migration 014) passa a criar a assinatura em trial.
- **API:** `invite-administrator` consulta os assentos antes de `inviteUserByEmail`. A troca de plano pela equipe é uma nova ação do `admin-api`, que já roda com `service_role`.
- **Front-end:** um novo hook `usePlan.js` (plano, status e assentos da organização atual) e o helper `src/lib/orgHealth.js` com o cálculo puro da nota.
- **Testes:** testes unitários de `orgHealth.js` e da regra de assentos. Os cenários críticos de e2e (convite bloqueado no limite) ficam em `tests/e2e/specs/critical/`.

### 4.3 Organização do código
- **Arquivos:** hooks em camelCase (`usePlan.js`), páginas e componentes em PascalCase, migrations `032_…`, `033_…`.
- **Convenções:** mutações retornam objetos novos; HTML sanitizado com DOMPurify; commits convencionais com a seção "How to test" (regra de `claude.md`).
- **Documentação:** atualizar `investor-materials/facts.md` com a definição da métrica-norte e a tabela "Where to look" em `claude.md`.

### 4.4 Deploy e operação
- **Build:** nenhuma mudança (`vite build`).
- **Deploy:** aplicar as migrations em ordem no Supabase antes do deploy do front-end, e fazer o deploy das Edge Functions alteradas (`invite-administrator` e `admin-api`) logo depois das migrations.
- **Monitoramento:** registrar em log cada bloqueio `seat_limit_reached` para ver a demanda por upgrade.
- **Configuração:** os pesos e os cortes da nota ficam em uma constante de `src/lib/orgHealth.js` (ou numa tabela de configuração, se precisarem mudar sem deploy; a decisão fica para a story 1.2).

### 4.5 Riscos
- **Técnico:** consultar `analytics_events` sem `org_id` exige join com `webinars` e pode ficar lento com volume alto. **Mitigação:** medir contra o NFR2 e usar a view materializada como plano B.
- **Integração:** a migration que cria as assinaturas precisa cobrir 100% das organizações existentes. Uma organização sem assinatura quebraria o convite. **Mitigação:** a Edge Function trata "sem assinatura" como ilimitada e registra um alerta em log. Um teste verifica a cobertura depois da migration.
- **Deploy:** o front-end publicado antes das migrations chamaria RPCs inexistentes. **Mitigação:** a ordem de deploy acima, e hooks que degradam com elegância (escondendo o indicador) quando a RPC falha.
- **Negócio:** os preços e os limites de assento ainda não foram definidos. **Mitigação:** o catálogo é só dado. Os valores entram por seed e podem mudar sem deploy.

## 5. Estrutura do épico

**Decisão:** **um único épico**. Medição e planos compartilham o mesmo destino (o console da equipe) e as mesmas decisões de modelo de dados. A sequência abaixo entrega primeiro o que é só leitura (sem risco) e só depois o que muda comportamento (o bloqueio de convite).

## Épico 1: Medição de valor, nota de saúde e planos por assento

**Objetivo do épico:** dar à equipe Gablive visibilidade sobre o valor entregue e o risco de churn de cada organização, e criar a base de planos por assento, sem afetar os fluxos dos clientes atuais.

**Requisitos de integração:** migrations aditivas; plano "Legado" ilimitado para as organizações existentes; fluxos públicos intactos; limite aplicado no servidor.

### Story 1.1 Métricas de valor por organização
Como administrador da plataforma,
quero consultar inscrições, presença, cliques, vendas e receita atribuída de cada organização num período,
para medir o valor que o Gablive entrega.

**Critérios de aceite**
1. A RPC `get_org_value_metrics` retorna os campos do FR1 para o período informado e para o período anterior de mesma duração.
2. A receita considera apenas `purchases.status = 'approved'`, agrupada por moeda.
3. Chamadas de quem não é administrador da plataforma para outra organização retornam erro de permissão.

**Verificação de integração**
- IV1: a aba Analytics existente e o `useAnalytics` continuam com os mesmos números.
- IV2: nenhuma política RLS existente foi alterada.
- IV3: a RPC responde em < 500 ms para uma organização com 10 mil inscrições.

### Story 1.2 Nota de saúde e aba "Saúde"
Como administrador da plataforma,
quero ver todas as organizações ordenadas por nota de saúde,
para agir antes de um cliente cancelar.

**Critérios de aceite**
1. `src/lib/orgHealth.js` calcula a nota e a classificação conforme o FR2, com testes unitários cobrindo os três cortes e os casos-limite (organização sem webinars, sem vendas ou recém-criada).
2. A aba "Saúde" lista nota, classificação, os quatro sinais, plano e assentos, com ordenação e filtro por classificação.
3. Uma organização criada há menos de 14 dias aparece como "nova", e não como "risco".

**Verificação de integração**
- IV1: as abas existentes do `AdminGatewayPage` continuam funcionando.
- IV2: um usuário que não é administrador da plataforma não vê a aba nem consegue chamar a RPC.
- IV3: o NFR2 foi medido e o resultado registrado no PR.

### Story 1.3 Esquema de planos e assinaturas
Como equipe Gablive,
quero um catálogo de planos e uma assinatura por organização,
para que cada cliente tenha um plano definido.

**Critérios de aceite**
1. As migrations criam `plans` e `org_subscriptions` com RLS (NFR1) e fazem o seed dos planos "Legado" (ilimitado, inativo para novas vendas) e de entrada (limite a definir, ver §7).
2. Todas as organizações existentes recebem uma assinatura "Legado" `active`, e uma consulta de verificação confirma 0 organizações sem assinatura.
3. `ensure_user_profile` cria a assinatura `trial` no plano de entrada para cada organização nova.

**Verificação de integração**
- IV1: o cadastro de um novo operador (`/auth/register`) continua funcionando de ponta a ponta.
- IV2: os testes existentes em `tests/unit` continuam passando.
- IV3: a migration é idempotente (pode rodar duas vezes sem erro).

### Story 1.4 Limite de assentos no convite
Como admin da organização,
quero saber quantos assentos uso e ser avisado quando atingir o limite,
para entender quando preciso de upgrade.

**Critérios de aceite**
1. `invite-administrator` retorna `seat_limit_reached` quando os assentos usados são ≥ o limite, antes de chamar `inviteUserByEmail`.
2. O `UsersPage` mostra "X de Y assentos usados" e, no limite, desabilita o convite e mostra a chamada de upgrade (FR10).
3. Um plano com limite `NULL` nunca bloqueia, e uma organização sem assinatura é tratada como ilimitada, com alerta em log.
4. Um downgrade não remove usuários (FR13).

**Verificação de integração**
- IV1: convites abaixo do limite funcionam como antes, inclusive o e-mail de magic link.
- IV2: a troca de papel de um membro existente não é afetada.
- IV3: um teste e2e crítico cobre "convite bloqueado no limite".

### Story 1.5 Seção "Meu plano"
Como admin da organização,
quero ver meu plano, o status e o uso de assentos em Configurações,
para acompanhar minha assinatura.

**Critérios de aceite**
1. A seção mostra o plano, o status, o fim do trial (se houver) e os assentos usados/limite.
2. Um membro que não é admin vê a seção apenas para leitura, ou não a vê (a definir na story).
3. Os textos estão em pt-BR e en.

**Verificação de integração**
- IV1: as seções existentes de Configurações continuam salvando normalmente.
- IV2: se a RPC falhar, a seção mostra uma mensagem de erro e o resto da página não quebra.

### Story 1.6 Gestão de planos pela equipe
Como administrador da plataforma,
quero trocar o plano, o status e o trial de uma organização,
para ativar clientes pagantes manualmente enquanto não há gateway de pagamento.

**Critérios de aceite**
1. A ação "Gerenciar plano" no `AdminGatewayPage` permite trocar o plano, o status e a data de fim do trial.
2. Cada alteração grava em `audit_logs` (usuário, organização, valores antes e depois, `is_platform_action = true`).
3. A mudança é refletida imediatamente em "Meu plano" e no limite de convite da organização.

**Verificação de integração**
- IV1: as ações existentes de suspender ou ativar a organização continuam funcionando.
- IV2: o `admin-api` mantém a validação de administrador da plataforma em todas as ações.

## 6. Fora do escopo (fase 2 em diante)

- **Modelo de agência:** um usuário em várias organizações, troca de organização e cobrança por cliente da agência. Exige mudar o 1:1 de `profiles` e é o próximo épico recomendado.
- **Cobrança automática** (gateway de pagamento, checkout, webhooks de assinatura e cobrança de inadimplentes).
- **Relatório mensal por e-mail para o cliente** (prioridade 3 do brainstorming). Esta fase entrega a métrica que alimentará esse relatório.
- Limites por inscritos, webinars ou volume de e-mail, e add-ons (o campo `features` fica reservado).
- Nota de saúde visível para o cliente.

## 7. Questões em aberto

1. **Preços e limites de assentos** de cada plano (por exemplo, entrada = 2 assentos, profissional = 5, escala = 15). Cabe ao negócio decidir; o PRD não inventa valores.
2. **Duração do trial** e o que acontece quando ele expira sem ativação (apenas aviso ou bloqueio de convites?). Proposta: 14 dias, e só aviso nesta fase.
3. O papel `attendee` (atendente interno) deve ocupar assento pago ou ser gratuito? Pelo FR8, hoje ocupa.
4. Membros que não são admin podem ver "Meu plano"?
5. Um convite enviado e ainda não aceito ocupa assento? Hoje `invite-administrator` cria o registro em `profiles` já no convite.
