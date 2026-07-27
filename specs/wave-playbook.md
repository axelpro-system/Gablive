# Wave Playbook — Exemplo Prático do Começo ao Fim

Este documento é um walkthrough completo de como usar o sistema de waves.
Mostra **exatamente** o que digitar, o que o Commander faz, e o que você vê.

---

## Cenário

Você é dono do Gablive e quer implementar "Export CSV de Analytics" — uma funcionalidade
que permite baixar os dados de analytics de um webinar em CSV.

---

## Passo 1: Planejar as Waves

No OpenCode, digite:

```
criar waves para "Export CSV de Analytics"
```

### O que o Commander faz:

1. Analisa a funcionalidade
2. Identifica tasks e dependências
3. Cria um JSON como este:

```json
{
  "project": "Export CSV de Analytics",
  "description": "Exportar dados de analytics de webinários em formato CSV com filtros.",
  "waves": [
    {
      "number": 1,
      "name": "Backend",
      "description": "Edge Function que gera o CSV. Não depende de nada.",
      "issues": [
        {
          "title": "Edge Function export-analytics-csv",
          "body": "## Contexto\n\nCriar Edge Function que recebe webinar_id e filtros (date range), consulta analytics_events, e retorna CSV.\n\n## Critérios de Aceite\n\n- [ ] Recebe { webinar_id, start_date?, end_date? }\n- [ ] Retorna Content-Type: text/csv\n- [ ] Headers: event_type, timestamp, metadata\n- [ ] Validação de auth (apenas owner da org)\n- [ ] CSV sanitizado (sem injection)\n- [ ] RLS isolation (apenas dados da org)\n\n## Dependências\n\nNenhuma (Wave 1)\n\n## Arquivos Afetados\n\n- supabase/functions/export-analytics-csv/index.ts (novo)\n\n## Notas Técnicas\n\n- Usar Supabase service_role no server side\n- Streaming CSV se >10k rows\n- BOM para Excel compatibilidade\n- Usar query existente de analytics como base",
          "labels": ["wave-1", "backend", "analytics"]
        }
      ]
    },
    {
      "number": 2,
      "name": "Frontend",
      "description": "Botão de export no dashboard. Depende da EF estar pronta.",
      "issues": [
        {
          "title": "Botão Export CSV no AnalyticsPage",
          "body": "## Contexto\n\nAdicionar botão 'Exportar CSV' na página de analytics que chama a Edge Function e faz download do arquivo.\n\n## Critérios de Aceite\n\n- [ ] Botão visível na página de analytics\n- [ ] Chama export-analytics-csv via Supabase client\n- [ ] Download automático do CSV\n- [ ] Loading state enquanto gera\n- [ ] Toast de sucesso/erro\n- [ ] Design system compliant\n\n## Dependências\n\n- #1 (Edge Function export-analytics-csv) — Wave 1\n\n## Arquivos Afetados\n\n- src/pages/dashboard/AnalyticsPage.jsx (modificar)\n\n## Notas Técnicas\n\n- Usar fetch ou Supabase client\n- Nome do arquivo: analytics-{webinar_slug}-{date}.csv\n- Desabilitar botão durante download",
          "labels": ["wave-2", "frontend", "analytics"]
        }
      ]
    }
  ]
}
```

4. Mostra o plano para aprovação
5. Você aprova

---

## Passo 2: Criar os GitHub Issues

No OpenCode, digite:

```
criar issues do projeto "Export CSV de Analytics"
```

### O que o Commander faz:

```bash
# Cria issue da Wave 1
gh issue create \
  --title "[Wave 1] Edge Function export-analytics-csv" \
  --body "## Contexto\nCriar Edge Function que recebe webinar_id e filtros..." \
  --label "wave-1,backend,analytics"

# Cria issue da Wave 2
gh issue create \
  --title "[Wave 2] Botão Export CSV no AnalyticsPage" \
  --body "## Contexto\nAdicionar botão 'Exportar CSV' na página de analytics..." \
  --label "wave-2,frontend,analytics"
```

### O que você vê no GitHub:

```
Issues criados:
✓ #150 — [Wave 1] Edge Function export-analytics-csv
  Labels: wave-1, backend, analytics
  URL: https://github.com/user/gablive/issues/150

✓ #151 — [Wave 2] Botão Export CSV no AnalyticsPage
  Labels: wave-2, frontend, analytics
  Dependência: #150
  URL: https://github.com/user/gablive/issues/151
```

---

## Passo 3: Executar Wave 1

No OpenCode, digite:

```
orquestrar wave 1
```

### O que o Commander faz:

**Passo 3.1 — Listar issues da wave:**

```bash
gh issue list --label "wave-1" --state open
```

Resultado:
```
#150  [Wave 1] Edge Function export-analytics-csv
```

**Passo 3.2 — Criar worktree isolado:**

```bash
git worktree add ../export-csv-wave1 -b feature/export-csv-backend
```

**Passo 3.3 — Spawn executor agent:**

O Commander usa a Task tool:

```
Task(
  subagent_type="executor",
  prompt="
    Execute o ticket #150: Edge Function export-analytics-csv
    
    Contexto do issue:
    ## Contexto
    Criar Edge Function que recebe webinar_id e filtros (date range),
    consulta analytics_events, e retorna CSV.
    
    ## Critérios de Aceite
    - Recebe { webinar_id, start_date?, end_date? }
    - Retorna Content-Type: text/csv
    - Headers: event_type, timestamp, metadata
    - Validação de auth (apenas owner da org)
    - CSV sanitizado (sem injection)
    - RLS isolation (apenas dados da org)
    
    ## Arquivos Afetados
    - supabase/functions/export-analytics-csv/index.ts (novo)
    
    ## Notas Técnicas
    - Usar Supabase service_role no server side
    - Streaming CSV se >10k rows
    - BOM para Excel compatibilidade
    - Usar query existente de analytics como base
    
    Passos:
    1. Trabalhar no worktree: ../export-csv-wave1
    2. Criar o arquivo supabase/functions/export-analytics-csv/index.ts
    3. Implementar a Edge Function seguindo os critérios
    4. Rodar lint: npm run lint
    5. Commit: feat(analytics): add export-csv edge function (#150)
    6. Push e criar PR:
       gh pr create \
         --title 'feat(analytics): export CSV edge function' \
         --body 'Closes #150' \
         --label 'wave-1,backend'
  ",
  description="Wave 1: Edge Function export-analytics-csv"
)
```

**Passo 3.4 — O executor executa:**

```
Executor agent working...
✓ Criado worktree ../export-csv-wave1
✓ Criado supabase/functions/export-analytics-csv/index.ts
✓ Implementada Edge Function com streaming CSV
✓ Lint passando
✓ Commitado: feat(analytics): add export-csv edge function (#150)
✓ Push para feature/export-csv-backend
✓ PR #152 criado: "feat(analytics): export CSV edge function"
  URL: https://github.com/user/gablive/pull/152
```

**Passo 3.5 — Aguardar CI:**

O Commander monitora o PR:

```bash
gh pr checks 152
```

Resultado:
```
✓ Lint & Build (2m 34s)
  All checks passed
```

**Passo 3.6 — Merge:**

```bash
gh pr merge 152 --squash --delete-branch
```

Resultado:
```
✓ Pull Request #152 merged (squash)
✓ Branch feature/export-csv-backend deleted
```

**Passo 3.7 — Limpar worktree:**

```bash
git worktree remove ../export-csv-wave1
```

**Passo 3.8 — Fechar issue:**

```bash
gh issue close 150 --comment "Implementado via PR #152"
```

### Resumo da Wave 1:

```
Wave 1 — Concluída ✅
├── Issue #150: Edge Function export-analytics-csv
│   ├── PR #152: feat(analytics): export CSV edge function
│   ├── CI: ✅ Lint & Build passed
│   ├── Merge: ✅ Squash merged
│   └── Branch: 🗑️ Deleted
└── Status: 1/1 issues fechados
```

---

## Passo 4: Verificar Status

No OpenCode, digite:

```
status das waves
```

Ou rode o script:

```bash
./scripts/check-wave-status.sh 1
```

Resultado:

```
=== Wave 1 Status ===

📋 Issues:
  Total: 1
  Abertos: 0
  Fechados: 1

🔀 Pull Requests:
  Abertos: 0
  Merged: 1

PRs merged:
  #152 — feat(analytics): export CSV edge function (merged: 2026-07-27T18:30:00Z)

=== Resumo ===
✅ Wave 1 completa!
```

---

## Passo 5: Executar Wave 2

No OpenCode, digite:

```
orquestrar wave 2
```

### O que o Commander faz (mesmo fluxo da Wave 1):

**5.1 — Atualizar main:**

```bash
git checkout main
git pull origin main
```

**5.2 — Listar issues:**

```bash
gh issue list --label "wave-2" --state open
```

Resultado:
```
#151  [Wave 2] Botão Export CSV no AnalyticsPage
```

**5.3 — Criar worktree:**

```bash
git worktree add ../export-csv-wave2 -b feature/export-csv-button
```

**5.4 — Spawn executor agent:**

```
Task(
  subagent_type="executor",
  prompt="
    Execute o ticket #151: Botão Export CSV no AnalyticsPage
    
    Contexto do issue:
    ## Contexto
    Adicionar botão 'Exportar CSV' na página de analytics que chama
    a Edge Function e faz download do arquivo.
    
    ## Critérios de Aceite
    - Botão visível na página de analytics
    - Chama export-analytics-csv via Supabase client
    - Download automático do CSV
    - Loading state enquanto gera
    - Toast de sucesso/erro
    - Design system compliant
    
    ## Arquivos Afetados
    - src/pages/dashboard/AnalyticsPage.jsx (modificar)
    
    ## Notas Técnicas
    - Usar fetch ou Supabase client
    - Nome do arquivo: analytics-{webinar_slug}-{date}.csv
    - Desabilitar botão durante download
    
    Passos:
    1. Trabalhar no worktree: ../export-csv-wave2
    2. Ler AnalyticsPage.jsx atual
    3. Adicionar botão de export
    4. Implementar lógica de download via Supabase
    5. Adicionar loading state e error handling
    6. Rodar lint: npm run lint
    7. Commit: feat(analytics): add export CSV button (#151)
    8. Push e criar PR:
       gh pr create \
         --title 'feat(analytics): export CSV button' \
         --body 'Closes #151' \
         --label 'wave-2,frontend'
  ",
  description="Wave 2: Botão Export CSV"
)
```

**5.5 — CI e Merge (mesmo fluxo):**

```
✓ PR #153 criado
✓ CI: Lint & Build passed ✅
✓ Merged (squash)
✓ Branch deleted
✓ Issue #151 fechada
```

### Resumo da Wave 2:

```
Wave 2 — Concluída ✅
├── Issue #151: Botão Export CSV no AnalyticsPage
│   ├── PR #153: feat(analytics): export CSV button
│   ├── CI: ✅ Lint & Build passed
│   ├── Merge: ✅ Squash merged
│   └── Branch: 🗑️ Deleted
└── Status: 1/1 issues fechados
```

---

## Passo 6: Projeto Completo!

No OpenCode, digite:

```
status das waves
```

Resultado:

```
=== Projeto: Export CSV de Analytics ===

Wave 1 (Backend):
  ✅ #150 — Edge Function export-analytics-csv → PR #152 merged

Wave 2 (Frontend):
  ✅ #151 — Botão Export CSV no AnalyticsPage → PR #153 merged

=== Resumo ===
✅ Projeto completo! 2/2 issues fechados, 2/2 PRs merged.
```

---

## Fluxo Visual

```
Você                              Commander                          GitHub
 │                                   │                                │
 │  "criar waves para Export CSV"    │                                │
 ├──────────────────────────────────►│                                │
 │                                   │  Analisa funcionalidade        │
 │                                   │  Cria JSON com 2 waves         │
 │  Mostra plano:                    │                                │
 │  Wave 1: Backend (1 task)         │                                │
 │  Wave 2: Frontend (1 task)        │                                │
 │◄──────────────────────────────────┤                                │
 │                                   │                                │
 │  "Aprovado"                       │                                │
 ├──────────────────────────────────►│                                │
 │                                   │  gh issue create #150          │
 │                                   │  gh issue create #151          │
 │                                   ├───────────────────────────────►│
 │                                   │                                │  Issues criados
 │                                   │                                │
 │  "orquestrar wave 1"              │                                │
 ├──────────────────────────────────►│                                │
 │                                   │  git worktree add              │
 │                                   │  spawn executor agent          │
 │                                   │  implementa EF                 │
 │                                   │  commit + push                 │
 │                                   │  gh pr create #152             │
 │                                   ├───────────────────────────────►│
 │                                   │                                │  CI roda
 │                                   │  gh pr checks 152              │
 │                                   │  ✅ All checks passed          │
 │                                   │  gh pr merge 152               │
 │                                   ├───────────────────────────────►│
 │                                   │                                │  PR merged
 │                                   │  gh issue close 150            │
 │                                   ├───────────────────────────────►│
 │                                   │                                │  Issue fechada
 │                                   │                                │
 │  "orquestrar wave 2"              │                                │
 ├──────────────────────────────────►│                                │
 │                                   │  (mesmo fluxo para Wave 2)     │
 │                                   │                                │
 │  "status das waves"               │                                │
 ├──────────────────────────────────►│                                │
 │                                   │  ✅ 2/2 issues fechados        │
 │  "Projeto completo!"              │  ✅ 2/2 PRs merged             │
 │◄──────────────────────────────────┤                                │
```

---

## Comandos Rápidos de Referência

| O que você quer | O que digita no OpenCode |
|---|---|
| Criar waves para um projeto | `criar waves para [descrição]` |
| Executar uma wave | `orquestrar wave N` |
| Ver status de uma wave | `status da wave N` |
| Ver status de todas | `status das waves` |
| Criar issues do JSON | `criar issues de [arquivo].json` |
| Próxima wave | `próxima wave` |
| Cancelar execução | `cancelar wave N` |

---

## Dicas

1. **Waves pequenas**: Máximo 5-7 tasks por wave
2. **Dependências explícitas**: Sempre documentar no issue body
3. **CI primeiro**: Nunca mergear sem CI passar
4. **Worktrees isolados**: Nunca trabalhe na main diretamente
5. **Merges atômicos**: Um PR = uma feature completa
6. **Revisão**: Mesmo com IA, revisar antes de merge
