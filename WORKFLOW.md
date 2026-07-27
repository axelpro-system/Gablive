# Workflow de Desenvolvimento Paralelo com OpenCode

## Visão Geral

Este projeto usa um workflow de desenvolvimento em **ondas (waves)** onde múltiplas tasks são executadas em paralelo por executor agents do OpenCode, com integração contínua e merge controlado.

```
Ideia → PM + Design → GitHub Issues (Waves) → Commander (Orquestrador)
                                                        │
                                    ┌───────────────────┼───────────────────┐
                                    ▼                   ▼                   ▼
                              Wave 1 (paralelo)    Wave 2 (após W1)   Wave 3 (após W2)
                              ┌── Ticket A         ┌── Ticket D        ┌── Ticket F
                              ├── Ticket B         └── Ticket E        └── Ticket G
                              └── Ticket C
                                    │
                              Cada ticket:
                              Executor → Worktree → PR → CI → Merge
```

## Componentes

| Componente Original | Adaptado para OpenCode |
|---|---|
| PM + Design | Você (humano) + Commander |
| Linear | GitHub Issues com labels `wave-N` |
| Fable (orquestrador) | Commander agent (OpenCode) |
| GPT-Sol (implementador) | Executor agents (OpenCode) |
| CI/CD | GitHub Actions (`.github/workflows/ci-cd.yml`) |
| Merge humano | `gh pr merge` após CI passar |

## Como Usar

### Passo 1: Planejar Waves

Criar arquivo JSON com estrutura de waves (ver `specs/waves-example.json`):

```json
{
  "project": "Nome do Projeto",
  "waves": [
    {
      "number": 1,
      "name": "Fundação",
      "issues": [...]
    }
  ]
}
```

### Passo 2: Criar Issues

```bash
# No Git Bash:
./scripts/create-wave-issues.sh specs/waves-example.json
```

Ou pedir ao Commander:
```
criar issues para specs/waves-example.json
```

### Passo 3: Executar Wave

No OpenCode:
```
orquestrar wave 1
```

O Commander vai:
1. Listar issues com label `wave-1`
2. Para cada issue, spawnar um executor agent
3. Cada executor cria worktree isolado
4. Implementa, testa, commita, cria PR
5. Aguarda todos completarem
6. Verifica CI
7. Faz merge dos aprovados

### Passo 4: Verificar Status

```bash
./scripts/check-wave-status.sh 1
```

Ou no OpenCode:
```
status da wave 1
```

### Passo 5: Próxima Wave

```
orquestrar wave 2
```

## Estrutura de Diretórios

```
webinar-saas/
├── .opencode/
│   └── skills/
│       └── wave-orchestration/
│           └── SKILL.md          # Skill do Commander
├── scripts/
│   ├── create-wave-issues.sh     # Cria issues do JSON
│   └── check-wave-status.sh     # Status de uma wave
├── specs/
│   └── waves-example.json        # Exemplo de waves
├── WAVES.md                      # Guia de uso
└── WORKFLOW.md                   # Este arquivo
```

## Regras

1. **Uma wave por vez**: Nunca executar Wave N+1 antes de Wave N estar merged
2. **Worktrees isolados**: Cada executor em `../feature-<issue-number>`
3. **CI obrigatório**: PR só merge se CI passar
4. **Merges atômicos**: Um PR = uma feature completa
5. **Máximo 5-7 tasks por wave**: Para não sobrecarregar

## Comandos do Commander

| Comando | O que faz |
|---|---|
| `orquestrar wave N` | Executa wave N em paralelo |
| `status da wave N` | Mostra progresso da wave |
| `criar issues para <json>` | Cria GitHub Issues do JSON |
| `próxima wave` | Executa próxima wave pendente |
| `cancelar wave N` | Cancela execução da wave |

## Documentação

| Arquivo | O que é |
|---|---|
| `WORKFLOW.md` | Visão geral do workflow |
| `WAVES.md` | Guia de uso das waves |
| `.opencode/skills/wave-orchestration/SKILL.md` | Skill do Commander |
| `specs/wave-playbook.md` | **Playbook completo — walkthrough passo-a-passo** |
| `specs/waves-example.json` | Exemplo: AI Agents (4 waves, 10 tasks) |
| `scripts/create-wave-issues.sh` | Cria issues do JSON |
| `scripts/check-wave-status.sh` | Verifica status de wave |

## Exemplo Passo-a-Passo

Para ver um exemplo completo do começo ao fim, leia `specs/wave-playbook.md`.

Resumo rápido:
```
Você: "criar waves para Export CSV de Analytics"
Commander: Analisa → Cria JSON → Mostra plano → Você aprova

Você: "orquestrar wave 1"
Commander: Cria issue → Worktree → Executor agent → PR → CI → Merge → Issue fechada

Você: "orquestrar wave 2"
Commander: Atualiza main → Mesmo fluxo → Merge final

Você: "status das waves"
Commander: "✅ Projeto completo! 2/2 issues fechados, 2/2 PRs merged"
```

## Exemplo: AI Agents (Projeto Atual)

O projeto AI Agents tem 4 waves:

- **Wave 1** (2 tasks): AiProvider interface + Migration 010
- **Wave 2** (3 tasks): chat-agent EF + generate-chat EF + save-ai-config EF
- **Wave 3** (2 tasks): AIAgentEditor + ChatAgent component
- **Wave 4** (3 tasks): Integração no dashboard + toggle + E2E tests

Total: 10 tasks em 4 waves.

## Integração com CI/CD

O CI já está configurado em `.github/workflows/ci-cd.yml`:
- Trigger em push para main/dev e em PRs
- Roda lint + build
- Deploy automático via Vercel

Cada PR criado por executor agent automaticamente trigger CI.
