# Wave Orchestration - Desenvolvimento Paralelo com OpenCode

## Quando usar

Ative este skill quando:
- O usuário diz "wave", "orchestrate", "parallel development", "desenvolvimento paralelo"
- Há um projeto/feature grande que pode ser dividido em tasks independentes
- O usuário quer maximizar paralelismo mantendo qualidade
- Há múltiplas features para implementar com dependências claras

## Conceito

Waves são grupos de tasks que podem ser executadas em paralelo. Cada wave contém tickets independentes entre si, mas pode depender de waves anteriores.

```
Wave 1 (paralelo)
├── Ticket A → executor agent → PR → CI → merge
├── Ticket B → executor agent → PR → CI → merge
└── Ticket C → executor agent → PR → CI → merge

↓ (aguarda todos merges)

Wave 2 (paralelo)
├── Ticket D → executor agent → PR → CI → merge
└── Ticket E → executor agent → PR → CI → merge
```

## Fluxo Completo

### 1. Análise do Projeto

Quando recebido um projeto grande:

```
1. Entender escopo total
2. Identificar tasks individuais
3. Mapear dependências entre tasks
4. Agrupar em waves (tasks independentes na mesma wave)
5. Criar GitHub Issues para cada task
6. Rotular issues com wave-N
```

### 2. Criação de GitHub Issues

Para cada task, criar issue com:

```bash
gh issue create \
  --title "[Wave 1] Implementar X" \
  --body "## Contexto\n...\n\n## Critérios de Aceite\n- [ ] ...\n\n## Dependências\nNenhuma (Wave 1)" \
  --label "wave-1,feature"
```

**Estrutura do body do issue:**

```markdown
## Contexto
Descrição clara do que deve ser implementado.

## Critérios de Aceite
- [ ] Critério 1
- [ ] Critério 2
- [ ] Testes passando

## Dependências
- Nenhuma (Wave 1)
- OU: Depende de #123 (Wave 1)

## Arquivos Afetados
- src/components/X.jsx
- src/hooks/useX.js

## Notas Técnicas
- Usar padrão existente em Y
- Seguir design system em Z
```

### 3. Execução de uma Wave

Para executar Wave N:

```javascript
// 1. Listar issues da wave
const issues = await gh.issue.list({
  labels: ['wave-N'],
  state: 'open'
});

// 2. Para cada issue, spawn executor em paralelo
const executors = issues.map(issue => ({
  agent: 'executor',
  prompt: `
    Execute o ticket #${issue.number}: ${issue.title}
    
    Contexto:
    ${issue.body}
    
    Instruções:
    1. Crie worktree: git worktree add ../feature-${issue.number} -b feature/${issue.number}
    2. Implemente a feature seguindo os critérios de aceite
    3. Rode testes: npm test
    4. Rode lint: npm run lint
    5. Commit com mensagem: feat(scope): descrição (refs #${issue.number})
    6. Push e crie PR: gh pr create --title "..." --body "Closes #${issue.number}"
    
    Worktree: ../feature-${issue.number}
    Branch: feature/${issue.number}
  `,
  description: `Wave ${N}: ${issue.title}`
}));

// 3. Spawn todos em paralelo
spawn_agent({ agents: executors });

// 4. Aguardar todos completarem
// 5. Verificar se todos PRs passaram no CI
// 6. Fazer merge dos PRs aprovados
```

### 4. Merge e Sincronização

Após todos executors de uma wave completarem:

```bash
# Para cada PR da wave:
gh pr merge <number> --squash --delete-branch

# Atualizar main local
git checkout main
git pull origin main

# Verificar se não há conflitos
git log --oneline -10
```

### 5. Próxima Wave

Após merge da Wave N:

```
1. Atualizar main local
2. Listar issues da Wave N+1
3. Repetir processo de execução
```

## Templates

### Template de Projeto com Waves

Criar arquivo `WAVES.md` na raiz do projeto:

```markdown
# Projeto: [Nome]

## Objetivo
Descrição do que será entregue.

## Wave 1 - Fundação
Tasks independentes que podem rodar em paralelo.

- [ ] #123 - Task A
- [ ] #124 - Task B
- [ ] #125 - Task C

## Wave 2 - Integração
Depende de Wave 1.

- [ ] #126 - Task D (depende de #123)
- [ ] #127 - Task E (depende de #124, #125)

## Wave 3 - Polimento
Depende de Wave 2.

- [ ] #128 - Task F
```

### Template de Issue

```markdown
---
name: feature-name
wave: 1
dependencies: []
labels: wave-1, feature
---

## Contexto
[Descrição clara]

## Critérios de Aceite
- [ ] [Critério 1]
- [ ] [Critério 2]
- [ ] Testes passando
- [ ] Lint passando

## Dependências
Nenhuma (Wave 1)

## Arquivos Afetados
- [lista de arquivos]

## Notas Técnicas
- [padrões a seguir]
- [restrições]
```

## Scripts Auxiliares

### create-wave-issues.sh

Script para criar múltiplos issues de uma vez:

```bash
#!/bin/bash
# Uso: ./scripts/create-wave-issues.sh waves.json

# waves.json:
# {
#   "wave": 1,
#   "issues": [
#     {
#       "title": "Implementar X",
#       "body": "## Contexto\n...",
#       "labels": ["wave-1", "feature"]
#     }
#   ]
# }

WAVES_FILE=$1
WAVE=$(jq -r '.wave' $WAVES_FILE)

jq -c '.issues[]' $WAVES_FILE | while read -r issue; do
  TITLE=$(echo $issue | jq -r '.title')
  BODY=$(echo $issue | jq -r '.body')
  LABELS=$(echo $issue | jq -r '.labels | join(",")')
  
  gh issue create \
    --title "$TITLE" \
    --body "$BODY" \
    --label "$LABELS"
  
  echo "Criado: $TITLE"
done
```

### check-wave-status.sh

Script para verificar status de uma wave:

```bash
#!/bin/bash
# Uso: ./scripts/check-wave-status.sh 1

WAVE=$1

echo "=== Wave $WAVE Status ==="
echo ""

# Issues abertas
echo "Issues abertas:"
gh issue list --label "wave-$WAVE" --state open --json number,title

echo ""
echo "PRs abertas:"
gh pr list --label "wave-$WAVE" --state open --json number,title,statusCheckRollup

echo ""
echo "PRs merged:"
gh pr list --label "wave-$WAVE" --state merged --json number,title,mergedAt
```

## Comandos do Commander

### Orquestrar Wave

Quando usuário diz "orquestrar wave N" ou "executar wave N":

```
1. Ler WAVES.md para entender contexto
2. Listar issues da wave N
3. Para cada issue:
   - Criar worktree isolado
   - Spawn executor agent
4. Aguardar todos completarem
5. Verificar CI de todos PRs
6. Fazer merge dos aprovados
7. Reportar status
```

### Criar Waves

Quando usuário diz "criar waves para [projeto]":

```
1. Analisar escopo do projeto
2. Identificar tasks e dependências
3. Agrupar em waves
4. Criar WAVES.md
5. Criar GitHub Issues para cada task
6. Rotular com wave-N
7. Mostrar plano para aprovação
```

### Status das Waves

Quando usuário diz "status das waves" ou "wave status":

```
1. Ler WAVES.md
2. Para cada wave:
   - Contar issues abertas
   - Contar PRs abertas
   - Contar PRs merged
3. Reportar progresso
```

## Boas Práticas

### ✅ FAZER

- **Tasks pequenas e focadas**: Cada ticket deve ser completável em 1-2 horas
- **Critérios claros**: Issue deve ter critérios de aceite explícitos
- **Dependências explícitas**: Documentar quais tasks dependem de quais
- **Worktrees isolados**: Cada executor trabalha em worktree separado
- **CI obrigatório**: Nunca mergear sem CI passar
- **Merges atômicos**: Um PR = uma feature completa

### ❌ EVITAR

- **Tasks muito grandes**: Se leva >4 horas, divida em múltiplas tasks
- **Dependências ocultas**: Documente TODAS as dependências
- **Merges sem review**: Mesmo com IA, review humano é importante
- **Waves muito grandes**: Máximo 5-7 tasks por wave
- **Ignorar conflitos**: Se há conflito de merge, resolva antes de continuar

## Exemplo Prático

### Cenário: Implementar sistema de autenticação

**Wave 1 - Fundação (paralelo)**
- #100 - Criar tabela users no Supabase
- #101 - Implementar formulário de login
- #102 - Implementar formulário de registro

**Wave 2 - Integração (depende de Wave 1)**
- #103 - Integrar login com Supabase Auth (depende de #100, #101)
- #104 - Integrar registro com Supabase Auth (depende de #100, #102)

**Wave 3 - Polimento (depende de Wave 2)**
- #105 - Adicionar recuperação de senha
- #106 - Adicionar validação de email

### Execução

```bash
# Wave 1
gh issue create --title "[Wave 1] Criar tabela users" --label "wave-1"
gh issue create --title "[Wave 1] Formulário de login" --label "wave-1"
gh issue create --title "[Wave 1] Formulário de registro" --label "wave-1"

# Commander executa Wave 1
# → 3 executor agents em paralelo
# → 3 PRs criados
# → CI passa em todos
# → Merge dos 3 PRs

# Wave 2
# Commander executa Wave 2
# → 2 executor agents em paralelo
# → 2 PRs criados
# → CI passa
# → Merge

# Wave 3
# Commander executa Wave 3
# → 2 executor agents em paralelo
# → 2 PRs
# → Merge final
```

## Métricas

Acompanhar:
- **Tempo por wave**: Quanto tempo cada wave leva
- **Taxa de sucesso**: Quantos PRs passam no CI sem revisão
- **Conflitos de merge**: Quantos conflitos surgem entre waves
- **Paralelismo efetivo**: Quantos agents rodando simultaneamente

## Integração com OpenCode

Este skill usa os subagents existentes do OpenCode:

- **executor**: Executa implementação (roda implementer + reviewer)
- **planner**: Cria planos detalhados se necessário
- **reviewer**: Revisa código (já embutido no executor)

O Commander coordena tudo, spawnando executors em paralelo e gerenciando merges.

## Próximos Passos

1. Criar script `create-wave-issues.sh`
2. Criar script `check-wave-status.sh`
3. Documentar em WAVES.md como usar
4. Testar com um projeto real
