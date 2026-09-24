# Tarefas da UX Onda 1

**Spec:** `.specs/features/ux-onda-1/spec.md`. As decisões D1 a D4 estão na própria spec; não há `design.md`.
**Status:** em execução: T1 a T13 concluídas; T14 com gates ok e checklist manual pendente
**Branch:** `fix/ux-onda-1`

## Gates (de `claude.md`; não há TESTING.md)

| Gate | Comando | Linha de base (2026-09-24) |
|---|---|---|
| quick | `npm run lint && npm run test:unit` | lint: 0 erros e 35 avisos · unit: 104/104 passando |
| build | `npm run build` | a medir no T14 |

**Regra:** o lint não pode ganhar nenhum **erro** novo nem avisos novos nos arquivos tocados, e o número de testes só pode aumentar.

**Matriz de testes:** funções puras em `src/lib/` têm teste unitário (`tests/unit/*.test.js`, `node --test`). Componentes JSX não têm runner de componente no projeto: a verificação deles é o gate quick mais o checklist manual do T14.

---

## Plano de execução

### Fase 1: base (paralela)
```
T1 (format.js + testes)   T2 (InlineAlert)   T3 (ConfirmDialog)   T4 (modais)
```

### Fase 2: correções (paralela, cada uma depende só da base)
```
T1 ─┬→ T5 (ConfigEditor) ←─ T2
    └→ T10 (preço)
T2 ──→ T6 (EmailsEditor)
T2 ──→ T7 (LoginCustomizationEditor)
T3 ──→ T8 (WebinarStatusControl)  ←─ T2
T9 (lista) · T11 (chat IA) · T12 (Relatórios) · T13 (erro da inscrição)   ← sem dependência
```

### Fase 3: fechamento
```
T5..T13 → T14 (gates + checklist manual)
```

---

## Detalhamento

### T1: Helpers de formatação [P]
- **O quê:** criar `formatCurrency(value, currency='BRL')`, que retorna `''` quando o valor é `null` ou não numérico; `toDatetimeLocalValue(iso)`, que retorna `'yyyy-MM-ddTHH:mm'` no fuso local ou `''`; e `fromDatetimeLocalValue(str)`, que retorna um ISO ou `null`.
- **Onde:** `src/lib/format.js` e `tests/unit/format.test.js`
- **Depende de:** nada
- **Reaproveita:** o padrão de `src/lib/countdown.js` e `tests/unit/countdown.test.js`
- **Requisitos:** UX1-01, 02, 03, 04
- **Pronto quando:**
  - [ ] Há testes para: 1497 → `R$ 1.497,00`; `null`/`'abc'` → `''`; ida e volta de `toDatetimeLocalValue`/`fromDatetimeLocalValue` preservando a hora local; `''` → `null`; ISO inválido → `''`.
  - [ ] O gate quick passa com 104 + N testes.
- **Testes:** unit · **Gate:** quick

### T2: Componente InlineAlert [P]
- **O quê:** criar o componente `<InlineAlert type="success|error" onClose>`, com ícone, `role` (alert/status), `aria-live` e botão de fechar com `aria-label`. Os estilos `.inline-alert` ficam globais.
- **Onde:** `src/components/ui/InlineAlert.jsx` e `src/styles/index.css`
- **Depende de:** nada
- **Reaproveita:** o markup e o CSS de `settings-alert` (`SettingsPage.jsx:213-229`, `SettingsPage.css:42-63`)
- **Requisitos:** UX1-05, 06, 07, 10
- **Pronto quando:** [ ] o componente é exportado e usa apenas tokens `--color-*`. [ ] O gate quick passa.
- **Testes:** none · **Gate:** quick

### T3: Componente ConfirmDialog [P]
- **O quê:** criar `<ConfirmDialog open title message confirmLabel tone="danger" busy onConfirm onCancel>`, com `.modal-overlay`/`.modal`, `role="dialog"` e `aria-modal`. Esc cancela, o foco vai para o botão Cancelar ao abrir, e os botões ficam desabilitados quando `busy`.
- **Onde:** `src/components/ui/ConfirmDialog.jsx`
- **Depende de:** nada
- **Reaproveita:** a estrutura de `DeleteWebinarDialog.jsx`
- **Requisitos:** UX1-09
- **Pronto quando:** [ ] o gate quick passa.
- **Testes:** none · **Gate:** quick

### T4: Classe dos modais [P]
- **O quê:** trocar `modal-backdrop` por `modal-overlay` nos três modais.
- **Onde:** `UsersPage.jsx:303`, `PageTemplatesEditor.jsx:401`, `DeleteWebinarDialog.jsx:50`
- **Depende de:** nada
- **Requisitos:** UX1-11
- **Pronto quando:** [ ] `grep modal-backdrop src` não encontra nada. [ ] O gate quick passa.
- **Testes:** none · **Gate:** quick

### T5: ConfigEditor, data local e retorno do salvar
- **O quê:** o campo `datetime-local` passa a usar `toDatetimeLocalValue` e `fromDatetimeLocalValue`. O `handleSaveConfig` passa a mostrar um `InlineAlert` de sucesso ou de erro no lugar do `alert()`. A validação da linha 95 também passa a usar o `InlineAlert`.
- **Onde:** `src/components/editor/ConfigEditor.jsx` (linhas 95, 124-126 e 285-286)
- **Depende de:** T1, T2
- **Requisitos:** UX1-01, 02, 03, 06
- **Pronto quando:** [ ] nenhum `alert(` sobra no arquivo. [ ] Nenhum `toISOString().slice` sobra no arquivo. [ ] O gate quick passa.
- **Testes:** none (a lógica fica coberta no T1) · **Gate:** quick

### T6: EmailsEditor, salvar com verificação de erro [P]
- **O quê:** coletar o `error` de cada `update`. Se algum falhar, mostrar um `InlineAlert` de erro dizendo quantos falharam; se todos derem certo, mostrar um `InlineAlert` de sucesso. Remover o `alert()`.
- **Onde:** `src/components/editor/EmailsEditor.jsx:46-64`
- **Depende de:** T2
- **Requisitos:** UX1-05
- **Pronto quando:** [ ] a mensagem de sucesso só aparece quando todos os updates retornam sem erro. [ ] O gate quick passa.
- **Testes:** none · **Gate:** quick

### T7: LoginCustomizationEditor, retorno e estado de erro [P]
- **O quê:** mostrar um `InlineAlert` depois de salvar. Se o carregamento falhar (`config` nulo depois do fetch), mostrar um estado de erro com o botão "Tentar de novo", que refaz o fetch.
- **Onde:** `src/components/editor/LoginCustomizationEditor.jsx:24-70`
- **Depende de:** T2
- **Requisitos:** UX1-07, 08
- **Pronto quando:** [ ] não há mais spinner infinito quando `loading=false` e `config=null`. [ ] O gate quick passa.
- **Testes:** none · **Gate:** quick

### T8: WebinarStatusControl, confirmar o encerramento
- **O quê:** "Encerrar ao vivo" passa a abrir um `ConfirmDialog`. Os erros de troca de status aparecem num `InlineAlert` ao lado do botão, no lugar do `alert()`. Os textos novos entram no i18n (pt-BR e en), já que o arquivo usa `t()`.
- **Onde:** `src/components/editor/WebinarStatusControl.jsx` e `src/i18n/locales/*.json` (confirmar o caminho)
- **Depende de:** T2, T3
- **Requisitos:** UX1-09, 10
- **Pronto quando:** [ ] iniciar ao vivo não pede confirmação; encerrar pede. [ ] O gate quick passa.
- **Testes:** none · **Gate:** quick

### T9: WebinarsListPage, copiar link e menu acessível [P]
- **O quê:**
  - `copyRegistrationLink` vira `async` com `try/catch` e mostra um toast (usando `.toast-container`/`.toast`) de "Link copiado" ou de erro por 2,5 s.
  - O botão ⋮ ganha `aria-label` e `aria-expanded`.
  - O menu fecha com clique fora (listener no `document`) e com Esc.
- **Onde:** `src/pages/dashboard/WebinarsListPage.jsx:61-65`, `200-205`
- **Depende de:** nada
- **Requisitos:** UX1-15, 16
- **Pronto quando:** [ ] os listeners são removidos no cleanup do efeito. [ ] O gate quick passa.
- **Testes:** none · **Gate:** quick

### T10: Preço em BRL [P]
- **O quê:** trocar `R$ ${Number(x).toFixed(2)}` por `formatCurrency(x)` e não renderizar o preço quando o resultado for vazio.
- **Onde:** `src/pages/public/WebinarRoomPage.jsx:396-398` e `src/components/editor/InteractionsEditor.jsx:568`
- **Depende de:** T1
- **Requisitos:** UX1-04
- **Pronto quando:** [ ] `grep "toFixed(2)"` nesses dois arquivos não encontra nada. [ ] O gate quick passa.
- **Testes:** none (a lógica fica coberta no T1) · **Gate:** quick

### T11: Contraste do balão da IA [P]
- **O quê:** adicionar a regra `.ai-message .room-chat-text { color: var(--color-gray-900); }`.
- **Onde:** `src/pages/public/WebinarRoomPage.css` (perto da linha 1101)
- **Depende de:** nada
- **Requisitos:** UX1-13
- **Pronto quando:** [ ] o contraste entre gray-900 e primary-50 é ≥ 4.5:1. [ ] O gate quick passa.
- **Testes:** none · **Gate:** quick

### T12: KPIs dos Relatórios [P]
- **O quê:** trocar o markup `stat-icon`/`stat-content`/`stat-label`/`stat-value` pelo markup `stat-card-icon`/`stat-card-label`/`stat-card-value` do `DashboardPage` e remover os fundos RGBA fixos.
- **Onde:** `src/pages/dashboard/GlobalAnalyticsPage.jsx:77-128`
- **Reaproveita:** `DashboardPage.jsx:101-111`
- **Depende de:** nada
- **Requisitos:** UX1-12
- **Pronto quando:** [ ] nenhuma classe `stat-icon|stat-content|stat-label|stat-value` sobra no arquivo. [ ] O gate quick passa.
- **Testes:** none · **Gate:** quick

### T13: Erro da inscrição [P]
- **O quê:**
  - Criar a classe `.reg-form-error` em `RegistrationPage.css`, com tokens de erro legíveis sobre o card escuro.
  - Trocar `auth-error` por essa classe, com `role="alert"`.
  - Usar `scrollIntoView({ block: 'center' })` quando o erro aparecer.
- **Onde:** `src/pages/public/RegistrationPage.jsx:378` e `RegistrationPage.css`
- **Depende de:** nada
- **Requisitos:** UX1-14
- **Pronto quando:** [ ] a página não depende mais de `AuthPages.css`. [ ] O gate quick passa.
- **Testes:** none · **Gate:** quick

### T14: Fechamento
- **O quê:** rodar os gates quick e build e percorrer o checklist manual abaixo em `npm run dev`.
- **Depende de:** T4 a T13
- **Pronto quando:**
  - [ ] O lint tem 0 erros e nenhum aviso novo nos arquivos tocados.
  - [ ] O unit passa com 104 + N testes.
  - [ ] O build passa.
  - [ ] Checklist manual (um item por requisito):
    - UX1-01/02/03: editar um webinário às 20:00, alterar os minutos e depois limpar o campo.
    - UX1-04: oferta com preço 1497 na sala e no editor.
    - UX1-05/06/07: salvar com a rede offline (DevTools) e depois online.
    - UX1-08: forçar erro no carregamento da Tela de Entrada.
    - UX1-09/10: encerrar ao vivo, cancelar e confirmar.
    - UX1-11: abrir os 3 modais.
    - UX1-12: tela Relatórios.
    - UX1-13: mensagem da IA no chat.
    - UX1-14: inscrição com e-mail repetido, no celular (375 px).
    - UX1-15/16: copiar link; menu com clique fora e com Esc.

---

## Validação antes da aprovação

### Check 1: granularidade
| Tarefa | Arquivos | Entregável único? |
|---|---|---|
| T1 | 1 + teste | ✅ helpers de formatação |
| T2, T3 | 1 cada (+ CSS no T2) | ✅ um componente cada |
| T4 | 3 | ✅ a mesma troca de classe (mecânica) |
| T5 a T9, T12, T13 | 1 cada (+ i18n/CSS) | ✅ |
| T10 | 2 | ✅ a mesma troca de formatação (mecânica) |
| T11 | 1 | ✅ |

### Check 2: diagrama × dependências
| Tarefa | "Depende de" | No diagrama | OK |
|---|---|---|---|
| T5 | T1, T2 | T1→T5←T2 | ✅ |
| T6, T7 | T2 | T2→T6, T2→T7 | ✅ |
| T8 | T2, T3 | T3→T8←T2 | ✅ |
| T10 | T1 | T1→T10 | ✅ |
| T4, T9, T11, T12, T13 | nada | Fase 1/2 sem seta | ✅ |
| T14 | T4 a T13 | Fase 3 | ✅ |

### Check 3: testes junto do código
| Tarefa | Camada | Teste exigido | Campo "Testes" | OK |
|---|---|---|---|---|
| T1 | `src/lib` (puro) | unit | unit | ✅ |
| Demais | JSX/CSS | sem runner de componente | none + checklist no T14 | ✅ |
