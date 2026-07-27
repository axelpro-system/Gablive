#!/bin/bash
# Verifica status de uma wave específica
# Uso: ./scripts/check-wave-status.sh <wave-number>

set -e

WAVE=$1

if [ -z "$WAVE" ]; then
  echo "Uso: $0 <wave-number>"
  exit 1
fi

echo "=== Wave $WAVE Status ==="
echo ""

# Contar issues
TOTAL_ISSUES=$(gh issue list --label "wave-$WAVE" --limit 1000 --json number | jq length)
OPEN_ISSUES=$(gh issue list --label "wave-$WAVE" --state open --limit 1000 --json number | jq length)
CLOSED_ISSUES=$(gh issue list --label "wave-$WAVE" --state closed --limit 1000 --json number | jq length)

echo "📋 Issues:"
echo "  Total: $TOTAL_ISSUES"
echo "  Abertos: $OPEN_ISSUES"
echo "  Fechados: $CLOSED_ISSUES"
echo ""

# Listar issues abertas
if [ "$OPEN_ISSUES" -gt 0 ]; then
  echo "Issues abertas:"
  gh issue list --label "wave-$WAVE" --state open --json number,title,assignee --jq '.[] | "  #\(.number) - \(.title) (\(.assignee.login // "unassigned"))"'
  echo ""
fi

# Contar PRs
OPEN_PRS=$(gh pr list --label "wave-$WAVE" --state open --limit 1000 --json number | jq length)
MERGED_PRS=$(gh pr list --label "wave-$WAVE" --state merged --limit 1000 --json number | jq length)

echo "🔀 Pull Requests:"
echo "  Abertos: $OPEN_PRS"
echo "  Merged: $MERGED_PRS"
echo ""

# Listar PRs abertas com status do CI
if [ "$OPEN_PRS" -gt 0 ]; then
  echo "PRs abertas:"
  gh pr list --label "wave-$WAVE" --state open --json number,title,statusCheckRollup --jq '.[] | "  #\(.number) - \(.title) | CI: \(.statusCheckRollup[0].conclusion // "pending")"'
  echo ""
fi

# Listar PRs merged
if [ "$MERGED_PRS" -gt 0 ]; then
  echo "PRs merged:"
  gh pr list --label "wave-$WAVE" --state merged --json number,title,mergedAt --jq '.[] | "  #\(.number) - \(.title) (merged: \(.mergedAt))"'
  echo ""
fi

# Resumo
echo "=== Resumo ==="
if [ "$OPEN_ISSUES" -eq 0 ] && [ "$OPEN_PRS" -eq 0 ]; then
  echo "✅ Wave $WAVE completa!"
elif [ "$OPEN_ISSUES" -eq 0 ] && [ "$OPEN_PRS" -gt 0 ]; then
  echo "⏳ Aguardando merge de $OPEN_PRS PR(s)"
else
  echo "🚧 Wave $WAVE em progresso"
fi
