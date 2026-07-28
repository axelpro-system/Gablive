# Manual do Workflow de Ondas

**Versão:** 1.0
**Padrão:** ASD-STE100 (Simplified Technical English) em pt-BR
**Revisão:** Julho 2026

---

## 1. Escopo

Este manual descreve o workflow de desenvolvimento paralelo do projeto Gablive.
O workflow usa ondas (waves) para executar múltiplas tarefas ao mesmo tempo.
Cada onda tem tarefas independentes. Uma onda só começa quando a anterior termina.

---

## 2. Definições

| Termo | Definição |
|-------|-----------|
| **Onda (wave)** | Grupo de tarefas que rodam ao mesmo tempo |
| **Tarefa (ticket)** | Uma unidade de trabalho individual |
| **Issue** | Um registro de tarefa no GitHub |
| **PR** | Pull Request — proposta de alteração no código |
| **Worktree** | Cópia isolada do repositório para cada tarefa |
| **Executor** | Agente que implementa uma tarefa |
| **Commander** | Agente que coordena as ondas |
| **CI** | Integração contínua — testes automáticos |

---

## 3. Fluxo do Workflow

### 3.1 Visão Geral

```
Ideia
  ↓
Planejamento
  ↓
GitHub Issues
  ↓
Onda 1 (paralelo)
  ├── Tarefa A → Executor → PR → CI → Merge
  ├── Tarefa B → Executor → PR → CI → Merge
  └── Tarefa C → Executor → PR → CI → Merge
  ↓
Merge na branch principal
  ↓
Onda 2 (paralelo)
  ├── Tarefa D → Executor → PR → CI → Merge
  └── Tarefa E → Executor → PR → CI → Merge
  ↓
Projeto completo
```

### 3.2 Regras

1. Execute uma onda por vez.
2. Não inicie a onda N+1 antes de finalizar a onda N.
3. Cada executor usa um worktree isolado.
4. Cada PR precisa de CI aprovado antes do merge.
5. Um PR = uma funcionalidade completa.
6. Máximo de 7 tarefas por onda.

---

## 4. Como Planejar Ondas

### 4.1 Passo 1 — Defina o projeto

Escreva uma descrição curta do projeto.
Exemplo: "Export CSV de Analytics".

### 4.2 Passo 2 — Liste as tarefas

Divida o projeto em tarefas pequenas.
Cada tarefa deve levar de 1 a 2 horas.
Defina dependências entre tarefas.

### 4.3 Passo 3 — Agrupe em ondas

Coloque tarefas sem dependências na onda 1.
Coloque tarefas que dependem da onda 1 na onda 2.
Repita até todas as tarefas estarem em ondas.

### 4.4 Passo 4 — Crie o arquivo JSON

Crie um arquivo JSON com a estrutura:

```json
{
  "project": "Nome do Projeto",
  "waves": [
    {
      "number": 1,
      "name": "Nome da Onda",
      "issues": [
        {
          "title": "Título da Tarefa",
          "body": "Descrição da tarefa",
          "labels": ["wave-1", "frontend"]
        }
      ]
    }
  ]
}
```

### 4.5 Passo 5 — Salve o arquivo

Salve o arquivo em `specs/waves-example.json`.

---

## 5. Como Criar Issues

### 5.1 Comando

Execute o script:

```bash
./scripts/create-wave-issues.sh specs/waves-example.json
```

### 5.2 Resultado

O script cria um issue no GitHub para cada tarefa.
Cada issue recebe labels da onda correspondente.

### 5.3 Verificação

 Liste os issues criados:

```bash
gh issue list --label "wave-1"
```

---

## 6. Como Executar uma Onda

### 6.1 Comando

Digite no OpenCode:

```
orquestrar wave 1
```

### 6.2 O que o Commander faz

1. Lista os issues da onda 1.
2. Cria um worktree para cada issue.
3. Spawna um executor para cada tarefa.
4. Cada executor implementa, testa e cria um PR.
5. O Commander aguarda todos os PRs.
6. O Commander verifica o CI de cada PR.
7. O Commander faz merge dos PRs aprovados.

### 6.3 Duração estimada

- 1 tarefa: 5 a 15 minutos.
- 3 tarefas paralelas: 10 a 20 minutos.
- 5 tarefas paralelas: 15 a 30 minutos.

---

## 7. Como Verificar Status

### 7.1 Comando

Execute o script:

```bash
./scripts/check-wave-status.sh 1
```

### 7.2 Ou no OpenCode

Digite:

```
status da wave 1
```

### 7.3 Saída esperada

```
Wave 1 Status
  Issues abertos: 0
  PRs abertos: 0
  PRs merged: 3
  Status: Completa
```

---

## 8. Como Iniciar a Próxima Onda

### 8.1 Pré-requisito

A onda anterior deve estar completa.
Todos os PRs devem estar merged.

### 8.2 Comando

Digite no OpenCode:

```
orquestrar wave 2
```

### 8.3 Fluxo

O Commander repete o fluxo da seção 6.

---

## 9. Estrutura de Arquivos

```
webinar-saas/
  .opencode/
    skills/
      wave-orchestration/
        SKILL.md              ← Skill do Commander
  scripts/
    create-wave-issues.sh     ← Cria issues do JSON
    check-wave-status.sh     ← Verifica status de onda
  specs/
    waves-example.json        ← Exemplo de ondas
    wave-playbook.md          ← Playbook completo
  WAVES.md                    ← Guia de uso
  WORKFLOW.md                 ← Documentação do workflow
```

---

## 10. Comandos de Referência

| Ação | Comando |
|------|---------|
| Criar ondas para um projeto | `criar waves para [descrição]` |
| Executar uma onda | `orquestrar wave N` |
| Ver status de uma onda | `status da wave N` |
| Ver status de todas | `status das waves` |
| Criar issues do JSON | `criar issues de [arquivo].json` |
| Executar próxima onda | `próxima wave` |
| Cancelar execução | `cancelar wave N` |

---

## 11. Regras de Segurança

1. Nunca execute duas ondas ao mesmo tempo.
2. Nunca faça merge sem CI aprovado.
3. Nunca exponha chaves de API no código.
4. Nunca trabalhe na branch main diretamente.
5. Sempre use worktree isolado para cada tarefa.

---

## 12. Solução de Problemas

### 12.1 CI falhou

1. Leia o log do CI.
2. Corrija o erro no código.
3. Faça push para a branch da tarefa.
4. Aguarde o CI rodar novamente.

### 12.2 Conflito de merge

1. Atualize a branch main localmente.
2. Faça rebase na branch da tarefa.
3. Resolva os conflitos.
4. Faça push da resolução.

### 12.3 Executor travou

1. Verifique o log do executor.
2. Se necessário, cancele a execução.
3. Execute a tarefa manualmente.

### 12.4 Issue não foi fechado

1. Verifique se o PR está merged.
2. Se estiver, feche o issue manualmente:

```bash
gh issue close <número> --comment "Feito via PR <número>"
```

---

## 13. Exemplo Completo

### Projeto: Export CSV de Analytics

**Onda 1 — Backend**

| Issue | Tarefa | Status |
|-------|--------|--------|
| #1 | Edge Function export-csv | Fechado |
| #152 | PR criado, CI aprovado, merged | — |

**Onda 2 — Frontend**

| Issue | Tarefa | Status |
|-------|--------|--------|
| #2 | Botão Export CSV | Fechado |
| #153 | PR criado, CI aprovado, merged | — |

**Resultado:** 2 ondas, 2 issues, 2 PRs, 0 erros.

---

## 14. Notas

- Este manual segue o padrão ASD-STE100.
- Frases são curtas (máximo 20 palavras).
- Verbos estão no imperativo.
- Cada palavra tem um único significado.
- Não há sinônimos.
- A voz ativa é usada em todas as instruções.
