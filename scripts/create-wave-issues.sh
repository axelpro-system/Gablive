#!/bin/bash
# Cria múltiplos GitHub Issues agrupados por wave
# Uso: ./scripts/create-wave-issues.sh <waves-file.json>
#
# Formato do JSON:
# {
#   "project": "Nome do Projeto",
#   "waves": [
#     {
#       "number": 1,
#       "name": "Fundação",
#       "issues": [
#         {
#           "title": "Implementar X",
#           "body": "## Contexto\n...\n\n## Critérios\n- [ ] ...",
#           "labels": ["wave-1", "feature"]
#         }
#       ]
#     }
#   ]
# }

set -e

WAVES_FILE=$1

if [ -z "$WAVES_FILE" ]; then
  echo "Uso: $0 <waves-file.json>"
  exit 1
fi

if [ ! -f "$WAVES_FILE" ]; then
  echo "Erro: Arquivo $WAVES_FILE não encontrado"
  exit 1
fi

PROJECT=$(jq -r '.project' "$WAVES_FILE")
echo "=== Criando issues para: $PROJECT ==="
echo ""

# Para cada wave
jq -c '.waves[]' "$WAVES_FILE" | while read -r wave; do
  WAVE_NUM=$(echo "$wave" | jq -r '.number')
  WAVE_NAME=$(echo "$wave" | jq -r '.name')
  
  echo "--- Wave $WAVE_NUM: $WAVE_NAME ---"
  
  # Para cada issue na wave
  echo "$wave" | jq -c '.issues[]' | while read -r issue; do
    TITLE=$(echo "$issue" | jq -r '.title')
    BODY=$(echo "$issue" | jq -r '.body')
    LABELS=$(echo "$issue" | jq -r '.labels | join(",")')
    
    # Criar issue
    ISSUE_URL=$(gh issue create \
      --title "[Wave $WAVE_NUM] $TITLE" \
      --body "$BODY" \
      --label "$LABELS")
    
    echo "✓ Criado: $TITLE"
    echo "  URL: $ISSUE_URL"
  done
  
  echo ""
done

echo "=== Issues criados com sucesso ==="
echo ""
echo "Próximos passos:"
echo "1. Revisar os issues criados"
echo "2. Executar wave 1: 'orchestrate wave 1'"
