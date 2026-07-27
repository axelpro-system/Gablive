# WAVES.md - Template de Orquestração

Este documento define como organizar projetos em waves para desenvolvimento paralelo com OpenCode.

## Como Usar

### 1. Criar Plano de Waves

Para um novo projeto, crie um arquivo JSON com a estrutura de waves:

```json
{
  "project": "Nome do Projeto",
  "waves": [
    {
      "number": 1,
      "name": "Fundação",
      "description": "Tasks independentes que podem rodar em paralelo",
      "issues": [
        {
          "title": "Implementar X",
          "body": "## Contexto\nDescrição do que deve ser feito.\n\n## Critérios de Aceite\n- [ ] Critério 1\n- [ ] Critério 2\n- [ ] Testes passando\n\n## Dependências\nNenhuma (Wave 1)\n\n## Arquivos Afetados\n- src/components/X.jsx\n\n## Notas Técnicas\n- Usar padrão existente",
          "labels": ["wave-1", "feature"]
        }
      ]
    }
  ]
}
```

### 2. Criar Issues

```bash
./scripts/create-wave-issues.sh waves.json
```

### 3. Executar Wave

No OpenCode, diga:
```
orquestrar wave 1
```

O Commander irá:
1. Listar issues da wave 1
2. Criar worktree isolado para cada task
3. Spawn executor agents em paralelo
4. Aguardar todos completarem
5. Verificar CI
6. Fazer merge dos PRs aprovados

### 4. Verificar Status

```bash
./scripts/check-wave-status.sh 1
```

Ou no OpenCode:
```
status da wave 1
```

## Estrutura de Waves

### Wave 1 - Fundação
Tasks independentes, sem dependências entre si.

**Exemplos:**
- Criar schema de banco de dados
- Implementar componentes UI básicos
- Configurar autenticação
- Criar hooks utilitários

### Wave 2 - Integração
Depende de Wave 1. Tasks que integram componentes da Wave 1.

**Exemplos:**
- Integrar frontend com backend
- Conectar componentes em páginas
- Implementar fluxos completos

### Wave 3 - Polimento
Depende de Wave 2. Tasks de refinamento e features adicionais.

**Exemplos:**
- Adicionar validações
- Implementar edge cases
- Otimizações de performance
- Documentação

## Regras

1. **Tasks pequenas**: Cada ticket deve ser completável em 1-2 horas
2. **Máximo 5-7 tasks por wave**: Para evitar sobrecarga
3. **Dependências explícitas**: Documentar no body do issue
4. **Critérios claros**: Checklist de aceite obrigatório
5. **Worktrees isolados**: Cada executor em branch separada

## Exemplo Completo

Ver `specs/waves-example.json` para um exemplo completo de estrutura de waves.

## Comandos do Commander

| Comando | Ação |
|---------|------|
| `orquestrar wave N` | Executa todos os tickets da wave N em paralelo |
| `status da wave N` | Mostra status dos issues e PRs da wave |
| `criar waves para [projeto]` | Analisa projeto e cria waves + issues |
| `próxima wave` | Executa próxima wave pendente |

## Fluxo Completo

```
1. Planejar waves (WAVES.md + waves.json)
2. Criar issues (./scripts/create-wave-issues.sh)
3. Executar wave 1 (Commander: "orquestrar wave 1")
4. Aguardar merges
5. Executar wave 2
6. ...
7. Projeto completo!
```
