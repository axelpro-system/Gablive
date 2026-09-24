# Spec: valor entregue, nota de saúde e planos por assento

**Status:** ready-for-agent, com as decisões provisórias listadas em "Decisões pendentes com valor padrão".
**Origem:** `docs/prd.md` (épico 1) · `docs/hous3/valor-saude-planos.md` (3 funcionalidades HOUS3) · `docs/hous3/personas.md`.
**Vocabulário:**
- **Org:** tenant.
- **Equipe da plataforma:** `platform_admins`.
- **Administrador da org:** `admin`.
- **Operador:** `presenter`.
- **Atendente:** `attendee`.
- **Lead:** inscrito em `registrations`.
- **Assento:** usuário da org que conta no limite do plano.

## Problem Statement

A equipe da plataforma não sabe quais orgs estão recebendo valor do Gablive, nem quais estão prestes a abandonar. O console `/admin` lista orgs, usuários, webinários e registros, mas não compara períodos nem mostra vendas por cliente. Uma org que parou de receber inscrições só é notada quando some.

Além disso, o produto não tem planos: todo cliente tem o mesmo acesso, e receita recorrente, clientes pagantes e churn não podem ser medidos pelo sistema. A equipe ativa clientes pagantes "de cabeça".

Do lado do cliente, o Administrador da org não tem nenhum limite hoje. Quando os planos entrarem em vigor, um convite recusado sem explicação vira chamado de suporte.

## Solution

1. **Medição por org.** Para cada org e para um período (padrão: últimos 30 dias contra os 30 anteriores), o sistema mostra à equipe da plataforma inscrições, taxa de presença, cliques em oferta, vendas aprovadas e receita atribuída. Tudo isso já existe no banco; o trabalho é de agregação.
2. **Nota de saúde.** Uma nota de 0 a 100 classifica cada org como saudável, atenção, risco ou nova. Ela aparece numa aba "Saúde" do console, visível só para a equipe.
3. **Planos por assento.** Cada org tem uma assinatura com plano e status, e a equipe ativa e ajusta manualmente, sem cobrança automática. Orgs existentes ficam no plano Legado, sem limite. Orgs novas entram em trial no plano de entrada.
4. **Limite de convite.** O Administrador da org vê "X de Y assentos" em Usuários e em "Meu plano". No limite, o convite é recusado pelo servidor com uma mensagem clara de como pedir mais assentos.

## User Stories

### Equipe da plataforma: medição e saúde
1. Como equipe da plataforma, quero ver quantas inscrições cada org recebeu no período, para saber quem está usando o Gablive.
2. Como equipe da plataforma, quero comparar as inscrições do período com o período anterior, para perceber queda antes que a org pare.
3. Como equipe da plataforma, quero ver a taxa de presença de cada org, para distinguir quem capta mas não entrega o webinário.
4. Como equipe da plataforma, quero ver os cliques em oferta de cada org, para saber se o funil chega ao pitch.
5. Como equipe da plataforma, quero ver quantas vendas aprovadas foram atribuídas a cada org, para ter argumento de ROI na renovação.
6. Como equipe da plataforma, quero ver a receita atribuída separada por moeda, para não somar valores incompatíveis.
7. Como equipe da plataforma, quero que só vendas aprovadas entrem na receita, para não inflar o resultado com reembolsos e pendentes.
8. Como equipe da plataforma, quero ver uma nota de saúde de 0 a 100 por org, para priorizar contatos rapidamente.
9. Como equipe da plataforma, quero ver a classificação saudável, atenção ou risco, para agir sem interpretar números.
10. Como equipe da plataforma, quero ver quais sinais levaram à classificação, para saber o que conversar com o cliente.
11. Como equipe da plataforma, quero que uma org recém-criada apareça como "nova", e não como "risco", para não gastar esforço com quem ainda está começando.
12. Como equipe da plataforma, quero ordenar as orgs pela nota, para começar pelas mais críticas.
13. Como equipe da plataforma, quero filtrar as orgs por classificação, para trabalhar uma fila de cada vez.
14. Como equipe da plataforma, quero ver o plano e o uso de assentos na mesma linha da saúde, para cruzar risco com receita.
15. Como equipe da plataforma, quero ser avisada quando os indicadores de uma org não puderem ser calculados, para não confiar numa classificação incompleta.
16. Como equipe da plataforma, quero que os pesos e os cortes da nota fiquem num único ponto de configuração, para ajustá-los depois de validar com dados reais.

### Equipe da plataforma: planos e assinaturas
17. Como equipe da plataforma, quero um catálogo de planos com limite de assentos, para oferecer níveis diferentes de conta.
18. Como equipe da plataforma, quero que planos possam ser desativados para novas vendas sem afetar quem já está neles, para aposentar ofertas antigas.
19. Como equipe da plataforma, quero que toda org tenha exatamente uma assinatura vigente, para nunca haver conta sem plano definido.
20. Como equipe da plataforma, quero que as orgs existentes entrem automaticamente no plano Legado, sem limite, para que nenhum cliente atual seja bloqueado.
21. Como equipe da plataforma, quero que toda org nova comece em trial no plano de entrada, para que o cadastro continue sem atrito.
22. Como equipe da plataforma, quero trocar o plano de uma org, para ativar o cliente que pagou.
23. Como equipe da plataforma, quero mudar o status da assinatura (trial, ativa, inadimplente, cancelada), para refletir a situação comercial.
24. Como equipe da plataforma, quero estender a data de fim do trial, para dar mais prazo a um cliente em negociação.
25. Como equipe da plataforma, quero registrar observações internas na assinatura, para lembrar do combinado com o cliente.
26. Como equipe da plataforma, quero que toda alteração de plano ou status fique na auditoria, com valores antes e depois, para saber quem mudou o quê.
27. Como equipe da plataforma, quero que a mudança de plano valha imediatamente, para o cliente usar o que pagou na hora.
28. Como equipe da plataforma, quero ver quantos convites foram recusados por limite, para medir a demanda por upgrade.

### Administrador da org: assentos e "Meu plano"
29. Como administrador da org, quero ver o nome e o status do meu plano, para saber em que condição está minha conta.
30. Como administrador da org, quero ver quando termina meu trial, para não ser pego de surpresa.
31. Como administrador da org, quero ver quantos assentos uso e qual é o limite, para planejar a equipe.
32. Como administrador da org, quero ver o uso de assentos na tela de Usuários, no momento de convidar, para decidir sem trocar de tela.
33. Como administrador da org, quero ser impedido de convidar quando o limite é atingido e saber como pedir mais assentos, para não ficar sem resposta.
34. Como administrador da org, quero que o limite valha mesmo se o convite vier por outro caminho, para a regra ser confiável.
35. Como administrador da org, quero que meus usuários atuais não sejam removidos se meu plano diminuir, para a operação não parar.
36. Como administrador da org, quero que um plano sem limite nunca bloqueie convites, para contas Legado seguirem como hoje.
37. Como administrador da org, quero que leads inscritos nos webinários não contem como assento, para pagar só pela equipe.
38. Como administrador da org, quero continuar trocando o papel dos membros existentes normalmente, para o limite não atrapalhar a gestão.
39. Como administrador da org, quero ver "Meu plano" em português e em inglês, conforme meu idioma.
40. Como administrador da org, quero que uma falha ao carregar o plano apareça como aviso, sem quebrar as Configurações, para continuar usando o resto da tela.

### Isolamento (todas as personas)
41. Como administrador da org, quero ver apenas a assinatura da minha org, para que dados comerciais de outros clientes nunca vazem.
42. Como operador, quero que nada disso mude o meu fluxo de criar e rodar webinários, para a medição não atrapalhar a operação.
43. Como lead, quero que a minha inscrição nunca seja bloqueada por plano, para o funil do operador continuar captando.

## Implementation Decisions

### Módulos
- **Módulo de domínio `orgHealth` (novo, puro):** recebe os indicadores agregados de uma org e a data de criação, e retorna `{ score, classification, signals[] }`. Contém os pesos, os cortes e a carência de "nova" como constantes exportadas: é o único ponto de configuração da nota. Não conhece Supabase nem React.
- **Módulo de domínio `seats` (novo, puro):** `canInvite({ used, limit })`, que trata `limit = null` como ilimitado, e `seatUsage(members, rules)`, que aplica as regras de contagem (papéis que contam, convite pendente). Também contém as regras provisórias da seção abaixo.
- **Agregação de valor (RPC no banco, nova):** `get_org_value_metrics(org, from, to)` devolve os indicadores do período e do período anterior de mesma duração. Os eventos de analytics não têm `org_id`, então o join é feito por webinário. Receita apenas com `status = 'approved'`, agrupada por moeda.
- **Visão da plataforma (RPC nova):** `get_platform_org_health()` devolve, para todas as orgs, os indicadores, o plano, o status e os assentos. É restrita a `platform_admins`. A nota é calculada no cliente pelo módulo `orgHealth`, para os pesos ficarem no mesmo lugar e testáveis.
- **Uso de assentos (RPC nova):** `get_org_seat_usage(org)` devolve `{ used, limit, plan, status, trial_ends_at }` para a própria org, e para qualquer org quando chamada pela equipe.
- **Convite (Edge Function existente, alterada):** antes de enviar o convite, consulta o uso de assentos e retorna o erro `seat_limit_reached` quando `canInvite` é falso. O contrato de entrada (`email`, `role`, `orgId`) e os erros atuais não mudam. Org sem assinatura é tratada como ilimitada, com alerta em log.
- **Gestão de planos (ação nova no `admin-api` existente):** trocar plano, status, fim do trial e observações, com validação de `platform_admins` e registro em `audit_logs` (`is_platform_action = true`, valores antes e depois).
- **Criação de org (RPC existente `ensure_user_profile`, alterada):** passa a criar a assinatura em trial no plano de entrada.
- **Front-end:**
  - hook `usePlan` (plano, status e assentos da org atual);
  - aba "Saúde" no console da plataforma, com a ação "Gerenciar plano" na linha da org;
  - indicador de assentos e bloqueio do convite em Usuários;
  - seção "Meu plano" em Configurações.

  Avisos usam o `InlineAlert` e confirmações usam o `ConfirmDialog` que já existem. Textos novos entram no i18n (pt-BR e en).

### Esquema (migrations aditivas, numeradas depois da última existente)
- `plans`: `id`, `name`, `seat_limit` (`null` = ilimitado), `reference_price_monthly` (informativo), `is_active`, `features` (JSONB reservado), timestamps.
- `org_subscriptions`: `id`, `org_id` (UNIQUE), `plan_id`, `status` (`trial` | `active` | `past_due` | `canceled`), `started_at`, `trial_ends_at`, `internal_notes`, timestamps.
- Seed de `plans`: "Legado" (ilimitado, `is_active = false`) e "Entrada" (limite provisório abaixo). Os preços entram como dado, sem deploy.
- Backfill: toda org existente recebe "Legado" com status `active`. A migration deve ser idempotente e terminar com 0 orgs sem assinatura.
- RLS: a org lê só a própria assinatura; `plans` é legível por usuários autenticados; escrita só por `platform_admins` ou `service_role`.

### Pesos da nota (provisórios, no módulo `orgHealth`)
| Sinal | Peso |
|---|---|
| Dias desde a última inscrição | 40% |
| Variação de inscrições em relação ao período anterior | 25% |
| Taxa de presença | 15% |
| Existência de venda atribuída no período | 20% |

**Cortes:** saudável ≥ 70; atenção de 40 a 69; risco < 40. **Carência de "nova":** 14 dias desde a criação da org.

### Decisões pendentes com valor padrão (mudar aqui não exige refatoração)
| Pergunta aberta | Padrão provisório | Onde mudar |
|---|---|---|
| Limite de assentos do plano de entrada | 2 | seed de `plans` |
| Duração do trial | 14 dias | criação de org |
| Trial expirado sem ativação | só aviso em "Meu plano"; convites **não** bloqueados | regra no módulo `seats` |
| Atendente ocupa assento? | sim | regras do módulo `seats` |
| Convite pendente ocupa assento? | sim (o registro em `profiles` já existe no convite) | regras do módulo `seats` |
| Membro que não é admin vê "Meu plano"? | sim, só leitura | tela de Configurações |

### Ordem de entrega (fatias verticais)
1. RPC de métricas → 2. `orgHealth` + aba Saúde → 3. esquema, seed e backfill → 4. limite no convite + indicador em Usuários → 5. "Meu plano" → 6. gestão de planos pela equipe.

As fatias 1 e 2 só leem dados, sem risco. As fatias que mudam comportamento vêm depois.

**Deploy:** migrations antes das Edge Functions, e Edge Functions antes do front-end. Os hooks escondem o indicador quando a RPC ainda não existe.

## Testing Decisions

- **Bom teste:** exercita comportamento observável pela interface pública do módulo ou pelo contrato da API (entrada → saída/erro). Não testa estado interno de componente nem forma de consulta SQL.
- **Seam 1: módulos de domínio puros (unit, `node --test`).**
  - `orgHealth`: os três cortes, casos-limite (org sem webinários, sem vendas, recém-criada, período anterior zerado) e a ordem dos sinais.
  - `seats`: `limit` nulo, uso igual ao limite, uso acima do limite (downgrade) e contagem por papel e por convite pendente.
  - Prior art: `tests/unit/countdown.test.js`, `tests/unit/format.test.js`, `tests/unit/leadKpis.test.js`.
- **Seam 2: contrato de banco e permissões (script de verificação multi-tenant existente, estendido).** Com os usuários de teste das orgs A e B:
  - a org A não lê a assinatura da org B;
  - usuários que não são da equipe recebem erro ao chamar a RPC da plataforma;
  - o convite acima do limite retorna `seat_limit_reached`;
  - o backfill deixa 0 orgs sem assinatura.
  - Prior art: `scripts/verify-multi-tenant.mjs` (helpers `ok`/`fail`, login por org).
- **Seam 3 (opcional, só o caminho crítico): e2e Playwright** "convite bloqueado no limite", ao lado dos specs críticos existentes (prior art: `tests/e2e/specs/critical/registration.spec.ts`).
- Não entram: testes de componente (o projeto não tem runner de componente) e snapshot de tela.
- **Gates por fatia:** `npm run lint` com 0 erros e 0 avisos, `npm run test:unit` e `npm run build`.

## Out of Scope

- Cobrança automática: gateway de pagamento, checkout, webhooks de assinatura, cobrança de inadimplentes.
- Modelo de agência: um usuário em várias orgs, troca de org e cobrança por org cliente. Exige remover o 1:1 de `profiles` e será um épico próprio.
- Nota de saúde visível para o cliente.
- Alertas automáticos (e-mail ou WhatsApp) para orgs em risco.
- Relatório mensal de resultado enviado ao cliente (prioridade 3 do brainstorming de retenção).
- Limites por inscritos, webinários ou volume de e-mail, e add-ons (o campo `features` fica reservado).
- Upgrade ou compra de plano dentro do produto.

## Implementation Log (2026-09-24)

Código das 6 fatias escrito na branch `feat/valor-saude-planos`. **As migrations 032–035 e as Edge Functions ainda não foram aplicadas nem publicadas**, porque o projeto Supabase não está acessível desta máquina. Os gates passam: lint 0/0, unit 140/140 (27 novos), build ok, SQL e PL/pgSQL validados com libpg_query, e a Edge Function de convite passa no `deno check`.

Desvios em relação à spec (SPEC_DEVIATION):
- **Assinatura de org nova:** a spec dizia para alterar `ensure_user_profile`. Implementei um trigger `AFTER INSERT` em `organizations`, porque a org também nasce pelo trigger `handle_new_user` e pelo `admin-api`; o trigger cobre todos os caminhos sem tocar nessas funções.
- **Regra de assento:** a spec punha a regra no módulo JS `seats`. A decisão "pode convidar?" ficou no banco (`org_seat_status.can_invite`, contando com `_org_seats_used`), para servidor e tela usarem a mesma regra. O `seats.js` só interpreta a resposta para exibição.
- **Acesso revogado libera o assento:** `invite_status = 'revoked'` não conta. A spec não previa esse caso.
- **Observações internas:** `org_subscriptions` não tem política de leitura para a org, e a org lê o próprio plano só via `get_org_seat_usage`, que não expõe `internal_notes`.
- **Bug pré-existente corrigido no `admin-api`:** a auditoria da plataforma gravava `platform_admins.id` em `audit_logs.user_id` (FK para `auth.users`), então todo insert falhava em silêncio, e a trava "não remover a si mesmo" nunca disparava. Agora `adminUser.id` é o id do usuário de autenticação, e falhas de auditoria vão para o log.
- **Seam 2:** o script multi-tenant cobre métricas, saúde, assinaturas e assentos. O teste "convite acima do limite" ficou fora do script porque enviaria e-mail real. Os usuários de teste `org-a@test.com`/`org-b@test.com` não existem no projeto, então o script ainda não roda lá.

Observação: o convite cria um usuário de autenticação, e o trigger `handle_new_user` cria uma org própria para esse convidado. Com a migration 034, essas orgs órfãs também recebem trial e aparecem na aba Saúde como "nova". Esse comportamento já existia e merece uma correção à parte.

### Deploy (2026-09-24)
- **Migrations aplicadas:** 032–036 (as da feature foram renumeradas de 032–035 para 033–036).
- **Edge Functions publicadas:** `invite-administrator` e `admin-api` (v3).
- **Esquema real diverge do repositório:** `platform_admins` real = `id, email, name, is_active, last_login_at, created_at` (sem `user_id`). O admin é identificado pelo e-mail confirmado em `auth.users`. `is_platform_admin()` e `admin-api` foram ajustados para isso.
- **Migration 032 (segurança):** a `platform_admins` tinha a política `USING true` para `public` e grants totais para `anon`/`authenticated`; foi fechada.
- **Migrations remotas sem arquivo:** 018–020 foram recuperadas para o repositório.
- **Verificado após o deploy:** 0 orgs sem assinatura, anônimo negado em tudo, `admin-api` com 401 para quem não é admin.

## Further Notes

- **Persona sem validação:** a persona Equipe da plataforma foi derivada do código, não de call. As frustrações estão como `[PENDENTE]` em `docs/hous3/personas.md`. Os pesos da nota são hipótese e devem ser recalibrados com dados reais depois das fatias 1 e 2.
- **Divergência com o `PRODUCT.md`:** ele promete uma agência gerenciando vários clientes na mesma sessão, mas o código permite uma org por usuário. Prevalece o código.
- **Desempenho:** a aba Saúde deve responder em menos de 2 s para até 500 orgs. Se não atingir, usar uma view materializada atualizada por agendamento, sem mudar o contrato da RPC.
- **Métrica-norte:** receita atribuída por org por mês. Registrar a definição em `investor-materials/facts.md` ao entregar a fatia 1.
