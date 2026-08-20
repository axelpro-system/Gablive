# Como operador, quero selecionar e apagar em massa itens de Chat, Oferta e Vendas, para limpar a timeline de interações sem remover um a um

Como operador, quero selecionar e apagar em massa mensagens de chat simulado, ofertas e notificações de venda, para corrigir a timeline sem retrabalho item a item.

## Descrição

### Contexto
Etapa **Configurar webinário → Interações**, nas listas **Chat Simulado**, **Ofertas (CTAs)** e **Vendas**.

Dispara depois de importar CSV, trocar o roteiro do pitch ou revisar itens duplicados / no tempo errado.

### Problema atual
Cada item só saía pela lixeira individual. Em listas longas o operador apaga um a um, erra o alvo e atrasa a publicação.

### Resultado esperado
O operador escolhe o que sai, confirma e a lista reflete só o que permanece — sem afetar Enquetes, Audiência, sala ao vivo ou o lead.

### Escopo

Inclui:
- seleção individual e selecionar todos da aba atual;
- exclusão em massa dos selecionados, com confirmação;
- feedback de quantidade e de falha;
- exclusão individual por item.

Não inclui:
- Enquetes ou Audiência;
- desfazer depois de confirmar;
- edição em massa;
- chat ao vivo (Moderação).

### Pendências conhecidas
- Nenhuma decisão bloqueante.

## Referências
- `docs/MANUAL-CRIAR-WEBINAR.md`
- `PRODUCT.md` (persona Operador / Presenter)

## Personas relacionadas
- Principal: Operador (presenter)
- Secundárias: nenhuma com ação direta

## Business Points
- 3 BP — reduz retrabalho recorrente na preparação; o processo já funcionava item a item.

## Design
- Requer design? Não

## Requisitos funcionais
- RF-001 — O operador deve ver um seletor em cada item de Chat, Ofertas e Vendas quando a lista tiver ao menos um item.
- RF-002 — O operador deve conseguir marcar e desmarcar itens; os marcados devem permanecer distinguíveis.
- RF-003 — O operador deve conseguir selecionar todos os itens da aba atual e desmarcar todos.
- RF-004 — O sistema deve informar a quantidade selecionada e habilitar a exclusão em massa só com quantidade maior que zero.
- RF-005 — Ao apagar em massa, o sistema deve pedir confirmação com quantidade e tipo (mensagem, oferta ou venda).
- RF-006 — Se o operador cancelar, nada é removido e a seleção permanece.
- RF-007 — Se confirmar, o sistema remove só os selecionados daquela aba e daquele webinário.
- RF-008 — A exclusão individual por item continua disponível.
- RF-009 — Lista vazia não exibe a barra de seleção em massa.
- RF-010 — Falha total ou parcial deve ser informada, não travar novas tentativas e refletir o que já saiu.
- RF-011 — A seleção de uma aba não se aplica a outra aba nem a outro webinário.

## Destino
- Release atual

---

# Tasks

Cada task é trabalho executável. O RF descreve o comportamento. A entrega descreve como verificar.

| Task | Tipo | RFs | Depende de | Status |
|------|------|-----|------------|--------|
| T-001 | AFK | RF-002, RF-003, RF-004, RF-011 | — | Feito |
| T-002 | AFK | RF-001 a RF-009, RF-011 | T-001 | Feito |
| T-003 | AFK | RF-001 a RF-009, RF-011 | T-001, T-002 | Feito |
| T-004 | AFK | RF-001 a RF-009, RF-011 | T-001, T-002 | Feito |
| T-005 | AFK | RF-010, RF-007 | T-002 | Feito |
| T-006 | AFK | RF-005 a RF-011 | T-002, T-003, T-004, T-005 | Feito |
| T-007 | AFK | — (rastreio operacional da entrega) | T-002, T-003, T-004 | Feito |

---

## T-001 — Extrair regras de seleção em massa testáveis

### Trabalho
Criar helpers imutáveis de marcar, desmarcar, selecionar todos, contar seleção, filtrar ids removidos, mensagem de confirmação por tipo e lote de exclusão.

### Entrega
- `npm run test:unit` cobre toggle, select all, filtro, confirmação singular/plural e chunk.
- Nenhum helper muta o `Set` original.

### Como testar
Rodar `npm run test:unit` e conferir `tests/unit/bulkSelection.test.js`.

---

## T-002 — Entregar exclusão em massa no Chat Simulado

### Trabalho
Colocar seletor em cada mensagem, barra selecionar todos / apagar selecionados, confirmação e delete no banco só das mensagens daquele webinário.

### Entrega
O operador apaga N mensagens de uma vez no Chat e as outras abas não mudam. Cancelar o diálogo não apaga nada. Lista vazia esconde a barra.

### Como testar
1. Abrir webinário → Interações → Chat Simulado.
2. Marcar 2 mensagens → Apagar selecionados → cancelar → as 2 continuam.
3. Apagar de novo → confirmar → só as marcadas saem.
4. Marcar Selecionar todos e apagar → lista vazia, barra some.
5. A lixeira individual continua funcionando.

---

## T-003 — Entregar exclusão em massa em Ofertas (CTAs)

### Trabalho
Reusar a mesma seleção e exclusão na lista de ofertas, com confirmação no plural/singular de “oferta”.

### Entrega
O operador apaga ofertas selecionadas sem afetar Chat ou Vendas.

### Como testar
1. Interações → Ofertas (CTAs).
2. Selecionar todos → Apagar selecionados → confirmar.
3. Ver “Nenhuma oferta configurada.”
4. Conferir que Chat e Vendas não mudaram.

---

## T-004 — Entregar exclusão em massa em Vendas

### Trabalho
Reusar a mesma seleção e exclusão na lista de notificações de venda, com confirmação de “venda”.

### Entrega
O operador apaga vendas selecionadas sem afetar Chat ou Ofertas.

### Como testar
1. Interações → Vendas.
2. Marcar 1 venda → Apagar selecionados → confirmar.
3. A outra venda permanece.
4. Conferir que Chat e Ofertas não mudaram.

---

## T-005 — Tratar falha, lote e trava da exclusão

### Trabalho
Apagar em lotes para listas longas (CSV). Em erro, informar a falha, soltar o botão e mostrar na lista o que já saiu. Enquanto apaga, bloquear a exclusão em massa nas três abas.

### Entrega
Falha não deixa o botão preso. CSV grande não quebra por limite de URL. Escopo sempre inclui `webinar_id`.

### Como testar
1. Importar CSV grande de chat, selecionar todos, apagar — a lista esvazia.
2. Se a API falhar, a tela mostra o erro e o botão volta a aceitar clique.

---

## T-006 — Cobrir o fluxo ponta a ponta com teste automatizado

### Trabalho
Automatizar o caminho do operador: selecionar, cancelar, confirmar, trocar de aba e apagar em Chat, Oferta e Vendas.

### Entrega
`npx playwright test specs/critical/interactions-bulk-delete.spec.ts --config=tests/e2e/playwright.config.ts --project=critical-flows` passa.

### Como testar
Rodar o comando acima. Esperado: 1 passed.

---

## T-007 — Documentar o passo a passo no manual do operador

### Trabalho
Incluir no manual como apagar Chat, Oferta e Vendas em massa, no mesmo estilo do restante do documento.

### Entrega
`docs/MANUAL-CRIAR-WEBINAR.md` descreve o fluxo com a mesma linguagem do painel.

### Como testar
Abrir o manual, seguir a seção **Como apagar interações em massa** no painel e concluir a exclusão sem inventar passos.
