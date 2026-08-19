# Spec: Unificar sistema de integrações de venda

## Problema

Existem dois sistemas paralelos de integração de venda (Hotmart/Selflux):

- **Sistema A** (canônico, usado pela UI): `org_sales_integrations`, `org_sales_secrets`, `provider_product_mappings`, `provider_webhook_events`, `purchases` — via `manage-sales-integration` (CRUD) + `purchase-webhook` (receptor).
- **Sistema B** (morto, não usado pela UI): `integration_providers`, `integration_credentials`, `integration_product_mappings`, `integration_events` — via `save-integration-config` + `receive-integration-webhook`.

Problemas concretos:

1. `purchase-webhook` (Sistema A, o receptor real) nunca cria uma `registration` — uma compra aprovada não matricula o comprador no webinar.
2. `org_sales_secrets.secrets` é gravado em **texto puro** (comentário na migration 011 diz "encrypted at rest" mas isso nunca foi implementado para o Sistema A).
3. `salesIntegrationApi.buildWebhookUrl` mostra ao operador a URL do Sistema B (`receive-integration-webhook`), que nunca é populado — o webhook real está em `purchase-webhook?provider=X&org_id=Y`.
4. `updateProductMapping` é um stub que finge sucesso sem persistir (`action: 'update_mapping'` não existe em `manage-sales-integration`).
5. Sistema B é código morto (zero referências fora dele mesmo) mantido junto com o Sistema A funcional — gera confusão e superfície de ataque desnecessária.

## Requisitos

- **R1**: Compra aprovada (`purchase.approved`/`subscription.paid` etc. já mapeados) DEVE criar/atualizar uma `registration` para o `webinar_id` mapeado, igual ao que `processEvent` fazia no Sistema B.
- **R2**: Secrets em `org_sales_secrets.secrets` DEVEM ser armazenados criptografados (AES-GCM via `_shared/crypto.ts`), nunca em texto puro.
- **R3**: `buildWebhookUrl` DEVE apontar para o endpoint realmente ativo (`purchase-webhook`).
- **R4**: Operador DEVE poder habilitar/desabilitar um mapeamento de produto e a mudança DEVE persistir.
- **R5**: Reembolso/chargeback (`purchase.refunded`, `purchase.chargeback`, `purchase.cancelled` — já normalizados pelos adapters) DEVE cancelar a `registration` correspondente.
- **R6**: Sistema B (tabelas, edge functions, referências) DEVE ser removido — não há consumidor.

## Fora de escopo

- Novos provedores de venda.
- UI de log de webhooks mais rica (já existe `list_events`/`provider_webhook_events`).
- Retry/DLQ automático de webhooks falhos.

## Rastreabilidade

| Req | Arquivo(s) |
|---|---|
| R1 | `supabase/functions/purchase-webhook/index.ts` |
| R2 | `supabase/functions/manage-sales-integration/index.ts`, `_shared/crypto.ts`, nova migration |
| R3 | `src/lib/salesIntegrationApi.js` |
| R4 | `supabase/functions/manage-sales-integration/index.ts`, `src/lib/salesIntegrationApi.js` |
| R5 | `supabase/functions/purchase-webhook/index.ts` |
| R6 | nova migration (DROP), remoção dos arquivos do Sistema B |
