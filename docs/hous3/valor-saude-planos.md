# Funcionalidades HOUS3: valor entregue, nota de saúde e planos por assento

**Destino:** backlog. As três funcionalidades têm decisões bloqueantes em aberto (preço, limites, trial e validação da persona).
**Personas:** Equipe da plataforma (principal) e Administrador da organização. Ver `docs/hous3/personas.md`.
**Origem:** `docs/brainstorms/2026-09-24-retencao-expansao.md` → `docs/prd.md` (os IDs FRx do PRD aparecem em "Referências").

**Lacuna de processo:** a HOUS3 pede Processo → Persona → Funcionalidade. Não existe fluxograma do processo "acompanhar clientes e ativar plano" da equipe. A persona Equipe da plataforma foi derivada do código e está com frustrações `[PENDENTE]`. Esse é o primeiro bloqueio para sair do backlog.

**Divergência entre fontes:** o `PRODUCT.md` diz que a agência gerencia vários clientes na mesma sessão, mas o banco hoje permite uma organização por usuário (`profiles.user_id` UNIQUE). Prevalece o código. O modelo de agência (cobrança por organização cliente) ficou fora destas funcionalidades por decisão tomada na sessão do PRD.

---

# Como equipe da plataforma, quero ver o valor entregue e o risco de abandono de cada organização, para agir antes que o cliente cancele

## Descrição
### Contexto
Acompanhamento da base de clientes no console `/admin`, de forma recorrente e antes de conversas de renovação.

### Problema atual
O console lista organizações, usuários, webinários e registros, mas não compara períodos nem junta vendas. Uma organização que parou de receber inscrições só é notada quando some. As vendas atribuídas já chegam em `purchases` (Hotmart e SellFlux), mas ninguém as vê por cliente, e sem esse número não há argumento de ROI na renovação.

### Resultado esperado
A equipe enxerga, por organização, quanto valor o Gablive entregou no período e quais contas estão em risco, e prioriza o contato com elas.

### Escopo
Inclui:
- inscrições, taxa de presença, cliques em oferta, vendas e receita atribuída por organização, no período atual e no anterior;
- classificação de cada organização (saudável, atenção, risco ou nova);
- lista ordenável e filtrável por classificação.

Não inclui:
- mostrar a nota para o cliente;
- alertas automáticos por e-mail ou WhatsApp;
- relatório mensal de resultado para o cliente (outra funcionalidade, prioridade 3 do brainstorming).

### Pendências conhecidas
- Quantos dias sem inscrição fazem uma organização ser considerada em risco? A proposta do PRD usa quatro sinais com pesos 40/25/15/20, mas isso é hipótese.
- Por quanto tempo uma organização recém-criada fica como "nova", fora da classificação de risco? Proposta: 14 dias.
- As frustrações da persona Equipe da plataforma são reais hoje? Validar antes de priorizar.

## Referências
- `docs/prd.md`: FR1, FR2, FR3, FR4; stories 1.1 e 1.2
- `docs/hous3/personas.md` (Equipe da plataforma)
- `docs/brainstorms/2026-09-24-retencao-expansao.md` (prioridade 1)
- `supabase/migrations/016_sales_integrations_reconcile.sql` (tabela `purchases`)

## Personas relacionadas
- Principal: Equipe da plataforma

## Business Points
- 5 BP
- Justificativa: é o único jeito de medir retenção e de reagir ao churn, e sustenta a renovação e a captação com números reais.

## Design
- Requer design? Sim. Informação densa (4 sinais, 2 períodos, classificação) e sem padrão pronto no console.
- Responsável: [PENDENTE] definir.

## Requisitos funcionais
- RF-001 — O sistema deve apresentar, por organização, inscrições, taxa de presença, cliques em oferta, quantidade de vendas aprovadas e receita atribuída no período selecionado.
- RF-002 — O sistema deve apresentar os mesmos indicadores no período anterior de mesma duração, para comparação.
- RF-003 — A receita atribuída deve considerar apenas vendas aprovadas e deve ser apresentada separada por moeda.
- RF-004 — O sistema deve classificar cada organização como saudável, atenção ou risco, e mostrar os sinais que levaram à classificação.
- RF-005 — Uma organização criada dentro do período de carência deve aparecer como "nova", e não como "risco".
- RF-006 — A equipe deve conseguir ordenar a lista pela classificação e filtrá-la.
- RF-007 — Somente membros da equipe da plataforma devem acessar os indicadores de organizações que não são a sua.
- RF-008 — Quando os indicadores de uma organização não puderem ser calculados, o sistema deve sinalizar que a classificação daquela organização está incompleta.

## Destino
- Backlog, até a decisão do critério de risco e a validação da persona.

---

# Como equipe da plataforma, quero definir e ajustar o plano de cada organização, para ativar clientes pagantes enquanto não existe cobrança automática

## Descrição
### Contexto
Fechamento de venda e renovação, feitos fora do produto. Depois que o cliente paga, a equipe precisa refletir isso na conta.

### Problema atual
Não existe plano, assinatura ou limite no produto. Todo cliente tem acesso igual, e MRR, churn e clientes pagantes não saem do sistema: o `investor-materials/facts.md` está com esses campos como `[A PREENCHER]`.

### Resultado esperado
Cada organização tem um plano e um status de assinatura definidos pela equipe. As mudanças ficam auditadas e os clientes atuais não são prejudicados.

### Escopo
Inclui:
- catálogo de planos com limite de assentos;
- uma assinatura por organização (trial, ativa, inadimplente ou cancelada);
- plano de entrada em trial para toda organização nova;
- plano "Legado", sem limite, para todas as organizações existentes;
- troca de plano, status e fim do trial pela equipe, com registro em auditoria.

Não inclui:
- cobrança automática, checkout ou gateway de pagamento;
- cobrança por organização cliente de agência (depende do modelo de várias organizações por usuário);
- limites por inscritos, webinários ou e-mails;
- add-ons.

### Pendências conhecidas
- Quais planos existem, quanto custam e quantos assentos cada um libera? O PRD não inventa valores.
- Quanto dura o trial?
- O que acontece quando o trial expira sem ativação: só um aviso, ou bloqueio de novos convites?
- Quem decide o plano de um cliente: a equipe ou o comercial?

## Referências
- `docs/prd.md`: FR5, FR6, FR7, FR12; CR2 (plano Legado); stories 1.3 e 1.6
- `docs/hous3/personas.md` (Equipe da plataforma)
- `investor-materials/facts.md`

## Personas relacionadas
- Principal: Equipe da plataforma
- Secundárias: Administrador da organização (a conta dele passa a ter plano e status)

## Business Points
- 5 BP
- Justificativa: desbloqueia receita recorrente mensurável, pré-requisito de qualquer expansão e de material para investidor.

## Design
- Requer design? Não. Ação no console com o padrão de modal e tabela que já existe.

## Requisitos funcionais
- RF-001 — Toda organização deve ter exatamente uma assinatura vigente, com plano e status.
- RF-002 — Toda organização criada deve receber automaticamente o plano de entrada com status trial.
- RF-003 — Toda organização que já existia antes desta funcionalidade deve receber o plano Legado, sem limite de assentos e com status ativo.
- RF-004 — A equipe deve conseguir alterar o plano, o status da assinatura e a data de fim do trial de uma organização.
- RF-005 — Cada alteração de plano ou status deve registrar em auditoria quem alterou, quando, e os valores antes e depois.
- RF-006 — Somente membros da equipe da plataforma devem conseguir alterar planos e assinaturas.
- RF-007 — Uma alteração de plano deve valer imediatamente para os limites da organização.

## Destino
- Backlog, até a definição de planos, preços, assentos e duração do trial.

---

# Como administrador da organização, quero saber quantos assentos uso e o que fazer no limite, para planejar convites da equipe sem ser surpreendido

## Descrição
### Contexto
Configurações da conta e tela de Usuários, ao convidar alguém para a equipe.

### Problema atual
Hoje não existe limite, e o administrador convida quantas pessoas quiser. Com planos por assento (funcionalidade anterior), um convite recusado sem explicação viraria chamado de suporte.

### Resultado esperado
O administrador vê seu plano e o uso de assentos, entende quando atingiu o limite e sabe como pedir mais.

### Escopo
Inclui:
- seção "Meu plano" (plano, status, fim do trial, assentos usados/limite);
- indicador de assentos na tela de Usuários;
- bloqueio de novo convite no limite, com orientação para upgrade;
- nenhuma remoção de usuário quando o limite cai abaixo do uso.

Não inclui:
- compra ou upgrade dentro do produto;
- nota de saúde da própria conta.

### Pendências conhecidas
- O papel atendente (`attendee`) ocupa assento pago?
- Um convite enviado e ainda não aceito ocupa assento? (Hoje o sistema já cria o usuário no momento do convite. Contar evita estourar o limite com convites em massa; não contar evita cobrar por quem nunca entrou.)
- Membros que não são administradores podem ver "Meu plano"?

## Referências
- `docs/prd.md`: FR8, FR9, FR10, FR11, FR13; stories 1.4 e 1.5
- `docs/hous3/personas.md` (Administrador da organização)

## Personas relacionadas
- Principal: Administrador da organização
- Secundárias: Equipe da plataforma (recebe os pedidos de upgrade)

## Business Points
- 3 BP
- Justificativa: evita atrito e chamados quando o limite entrar em vigor, e cria o ponto natural de upgrade.

## Design
- Requer design? Não. Reutiliza as seções de Configurações e o aviso inline existente.

## Requisitos funcionais
- RF-001 — A seção "Meu plano" deve apresentar o nome do plano, o status, a data de fim do trial (quando houver) e os assentos usados sobre o limite.
- RF-002 — A tela de Usuários deve apresentar os assentos usados sobre o limite do plano.
- RF-003 — Quando os assentos usados atingirem o limite, o sistema deve recusar novos convites e informar como solicitar mais assentos.
- RF-004 — O limite deve ser aplicado no servidor, independentemente da tela usada para convidar.
- RF-005 — Participantes inscritos em webinários não devem contar como assento.
- RF-006 — Quando o plano da organização passar a ter limite menor que o uso atual, nenhum usuário deve ser removido; apenas novos convites devem ser bloqueados.
- RF-007 — Plano sem limite de assentos nunca deve bloquear convites.

## Destino
- Backlog. Depende da funcionalidade de planos e das pendências sobre o papel atendente.
