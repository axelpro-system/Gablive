# UX Onda 1: especificação dos bugs visíveis e riscos de dado errado

**Tamanho:** Grande (10 correções, cerca de 14 arquivos). Não há decisões de arquitetura, então a fase Design foi pulada e as pequenas decisões estão em "Decisões inline" abaixo.
**Origem:** `docs/audits/2026-09-24-ux-codigo.md`, Onda 1.

## Problema

O painel e as páginas públicas têm defeitos que aparecem na tela ou gravam dados errados:
- modais sem fundo escurecido;
- horário deslocado em 3h ao editar um webinário;
- preço exibido como "R$ 497.00";
- texto da IA ilegível no chat;
- KPIs sem estilo;
- mensagens de sucesso falsas;
- ação destrutiva ("Encerrar ao vivo") sem confirmação;
- ações sem retorno ao usuário.

Esses problemas minam a confiança do operador e, no caso do horário e do preço, afetam a conversão.

## Objetivos

- [ ] Nenhum dado gravado errado por causa de fuso na edição do webinário.
- [ ] Nenhuma ação de salvar mostra sucesso quando a gravação falhou.
- [ ] Os 10 itens da Onda 1 corrigidos, com lint, testes unitários e build passando.

## Fora do escopo

| Item | Motivo |
|---|---|
| Fuso escolhido na criação (`CreateWebinarPage`) | Onda 2. Exige conversão com `date-fns-tz` e decisão de UX |
| Sistema global de Toast e remoção de todos os `alert()` | Onda 3. Aqui trocamos só os `alert()` dos arquivos tocados |
| Componente `<Modal>` com foco preso | Onda 3. Aqui corrigimos só a classe do fundo escurecido |
| Tema claro da página de inscrição | Onda 2 |
| i18n das páginas públicas | Onda 3. Textos novos entram no i18n quando o arquivo já usa `t()` |

## Decisões inline (substituem design.md)

- **D1:** um novo `src/lib/format.js` com funções puras: `formatCurrency`, `toDatetimeLocalValue` e `fromDatetimeLocalValue`. Cada uma tem teste unitário.
- **D2:** um novo `src/components/ui/InlineAlert.jsx`, que reproduz o padrão `settings-alert` do `SettingsPage` (ícone, `role`, `aria-live`, botão de fechar). Os estilos ficam globais em `index.css` como `.inline-alert`. O `SettingsPage` não será refatorado.
- **D3:** um novo `src/components/ui/ConfirmDialog.jsx`, que usa `.modal-overlay`/`.modal`, `role="dialog"`, `aria-modal` e fecha com Esc. Será reutilizado na Onda 3.
- **D4:** o retorno de "Copiar link" usa as classes `.toast-container`/`.toast` que já existem em `index.css`, com um estado local e sem criar um provider global.

---

## User stories

### P1: Horário e preço corretos ⭐ MVP

**Persona:** Operador (UX1-01 a 03, e UX1-04 no editor) e Lead (UX1-04 na sala). Ver `docs/hous3/personas.md`.


**User story:** como operador, quero que o horário que vejo e gravo seja o meu horário local, e que o preço apareça no formato brasileiro, para não perder participantes nem vendas por informação errada.

**Critérios de aceite**
1. **UX1-01:** QUANDO o operador abre a aba Configuração de um webinário marcado para 20:00 (horário local), ENTÃO o campo de data e hora DEVE mostrar 20:00.
2. **UX1-02:** QUANDO o operador altera só os minutos e salva, ENTÃO a hora gravada DEVE manter a hora local escolhida, sem deslocamento de fuso.
3. **UX1-03:** QUANDO o operador limpa o campo de data e hora, ENTÃO a tela NÃO DEVE quebrar, e o valor gravado DEVE ser `null`.
4. **UX1-04:** QUANDO a sala exibe uma oferta com preço 1497 e preço original 1997, ENTÃO DEVE mostrar "R$ 1.497,00" e "R$ 1.997,00". O mesmo formato vale para a pré-visualização no editor de interações.

**Teste independente:** criar um webinário às 20:00, abrir a edição e ver 20:00. Alterar para 20:15, salvar e recarregar: continua 20:15.

### P1: Retorno honesto ao salvar ⭐ MVP

**Persona:** Operador.


**User story:** como operador, quero saber de verdade se minhas alterações foram salvas, para não achar que a régua de e-mails está ativa quando não está.

**Critérios de aceite**
1. **UX1-05:** QUANDO qualquer atualização em E-mails falha, ENTÃO o sistema DEVE mostrar um aviso de erro inline e NÃO DEVE mostrar a mensagem de sucesso.
2. **UX1-06:** QUANDO salvar em Configuração falha, ENTÃO o sistema DEVE mostrar um aviso de erro inline. QUANDO dá certo, DEVE mostrar um aviso de sucesso inline no lugar do `alert()`.
3. **UX1-07:** QUANDO o operador salva a Tela de Entrada, ENTÃO o sistema DEVE mostrar um aviso de sucesso ou de erro.
4. **UX1-08:** QUANDO o carregamento da Tela de Entrada falha, ENTÃO o sistema DEVE mostrar um estado de erro com "Tentar de novo", e não um spinner infinito.

**Teste independente:** com a rede desligada no DevTools, salvar E-mails: aparece o erro, e não o sucesso.

### P1: Proteção contra ação destrutiva ⭐ MVP

**Persona:** Operador (ação que atinge o Lead que está na sala).


**Critérios de aceite**
1. **UX1-09:** QUANDO o operador clica em "Encerrar ao vivo", ENTÃO o sistema DEVE pedir confirmação num diálogo. Só DEVE encerrar se ele confirmar.
2. **UX1-10:** QUANDO a troca de status falha, ENTÃO o sistema DEVE mostrar um erro inline, sem `alert()`.

### P2: Modais e KPIs com estilo correto

**Persona:** Operador; o modal de convite (UX1-11) também é do Administrador da organização.


**Critérios de aceite**
1. **UX1-11:** QUANDO os modais de Convidar usuário, Templates ou Excluir webinário são abertos, ENTÃO DEVEM aparecer centralizados, sobre um fundo escurecido que cobre a tela.
2. **UX1-12:** QUANDO a tela Relatórios carrega, ENTÃO os 4 cards de KPI DEVEM usar o mesmo markup e estilo `stat-card-*` do Início, sem cores RGBA fixas.

### P2: Legibilidade e retorno nas páginas públicas e na lista

**Persona:** Lead (UX1-13 e UX1-14) e Operador (UX1-15 e UX1-16).


**Critérios de aceite**
1. **UX1-13:** QUANDO a IA responde no chat da sala, ENTÃO o texto do balão DEVE ter contraste de pelo menos 4.5:1 com o fundo.
2. **UX1-14:** QUANDO a inscrição retorna um erro, ENTÃO a mensagem DEVE aparecer estilizada (sem depender do CSS de login), com `role="alert"`, e a página DEVE rolar até ela.
3. **UX1-15:** QUANDO o operador clica em "Copiar link", ENTÃO DEVE aparecer o aviso "Link copiado". SE o clipboard falhar, DEVE aparecer um aviso de erro.
4. **UX1-16:** QUANDO o menu ⋮ está aberto e o operador clica fora dele ou aperta Esc, ENTÃO o menu DEVE fechar. O botão ⋮ DEVE ter `aria-label` e `aria-expanded`.

## Casos-limite

- QUANDO `scheduled_at` é `null`, ENTÃO o campo de data e hora DEVE ficar vazio, sem erro.
- QUANDO o preço é `null` ou não numérico, ENTÃO o preço NÃO DEVE ser exibido (nunca "R$ NaN").
- QUANDO o diálogo de confirmação está aberto e a ação está em andamento, ENTÃO os botões DEVEM ficar desabilitados.

## Rastreabilidade

| ID | Story | Tarefa | Status |
|---|---|---|---|
| UX1-01, UX1-02, UX1-03 | P1 Horário | T1, T5 | Implementado (verificação manual pendente) |
| UX1-04 | P1 Preço | T1, T10 | Implementado (verificação manual pendente) |
| UX1-05 | P1 Retorno | T2, T6 | Implementado (verificação manual pendente) |
| UX1-06 | P1 Retorno | T2, T5 | Implementado (verificação manual pendente) |
| UX1-07, UX1-08 | P1 Retorno | T2, T7 | Implementado (verificação manual pendente) |
| UX1-09, UX1-10 | P1 Destrutiva | T3, T8 | Implementado (verificação manual pendente) |
| UX1-11 | P2 Modais | T4 | Implementado (verificação manual pendente) |
| UX1-12 | P2 KPIs | T12 | Implementado (verificação manual pendente) |
| UX1-13 | P2 Chat | T11 | Implementado (verificação manual pendente) |
| UX1-14 | P2 Inscrição | T13 | Implementado (verificação manual pendente) |
| UX1-15, UX1-16 | P2 Lista | T9 | Implementado (verificação manual pendente) |

**Cobertura:** 16 requisitos, 16 mapeados, 0 sem tarefa.

## Critérios de sucesso

- [ ] `npm run lint`, `npm run test:unit` e `npm run build` passam.
- [ ] Os novos testes de `format.js` passam, e nenhum teste existente foi removido.
- [ ] Os 16 critérios foram verificados manualmente no navegador (checklist em `tasks.md`, T14).
