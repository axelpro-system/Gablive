# Tasks: Unificar sistema de integrações de venda

| ID | Task | Files | Reqs | Depends |
|---|---|---|---|---|
| T1 | Helpers `encryptSecretsObject`/`decryptSecretsObject` em crypto.ts (compatível com dados legados em texto puro) | `_shared/crypto.ts` | R2 | - |
| T2 | `manage-sales-integration`: criptografar ao salvar, descriptografar ao ler secrets | `manage-sales-integration/index.ts` | R2 | T1 |
| T3 | `purchase-webhook`: descriptografar secrets; criar `registration` em compra aprovada; cancelar em reembolso/chargeback | `purchase-webhook/index.ts` | R1, R2, R5 | T1 |
| T4 | Implementar `update_mapping` de verdade (edge function + client) | `manage-sales-integration/index.ts`, `salesIntegrationApi.js` | R4 | - |
| T5 | `buildWebhookUrl` apontar para `purchase-webhook` | `salesIntegrationApi.js` | R3 | - |
| T6 | Migration: dropar tabelas do Sistema B; remover `save-integration-config` e `receive-integration-webhook` | nova migration, delete 2 pastas de function | R6 | T3 (garantir que nada do B é mais necessário) |

Gate: sem framework de teste/typecheck disponível para Deno neste ambiente (confirmado na task anterior) — verificação por leitura de código. `npm run lint` + `npm run build` rodam ao final para garantir que o frontend (`salesIntegrationApi.js`) não quebrou.
