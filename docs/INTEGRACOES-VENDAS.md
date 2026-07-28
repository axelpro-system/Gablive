# Integracoes de venda: Hotmart e Selflux/SellFlux

Este documento define o setup operacional das integracoes de venda do GabLive. A regra central e multi-tenant: cada organizacao configura suas proprias credenciais e nenhum segredo deve ser colocado em variaveis `VITE_*`, no bundle React ou em codigo versionado.

## Modelo de seguranca

- Credenciais sao sempre por `org_id` e `provider`.
- Provedores iniciais: `hotmart` e `selflux`.
- Segredos ficam apenas no servidor, preferencialmente via Supabase Vault ou outro armazenamento criptografado server-side.
- O frontend pode exibir status mascarado, como "configurado", "ultimo teste", "ativo" e "falhou", mas nunca exibe `client_secret`, token Basic, Hottok, API key ou shared secret apos salvar.
- Webhooks sempre passam por Supabase Edge Function. O browser nao valida webhooks e nao chama APIs privadas dos provedores diretamente.
- Eventos recebidos precisam ser idempotentes por `provider + provider_event_id` ou fallback equivalente.

## URL de webhook

Formato planejado:

```text
https://<project-ref>.supabase.co/functions/v1/purchase-webhook?provider=<provider>
```

Exemplos:

```text
https://lgmtuabuuarxyfnhidbr.supabase.co/functions/v1/purchase-webhook?provider=hotmart
https://lgmtuabuuarxyfnhidbr.supabase.co/functions/v1/purchase-webhook?provider=selflux
```

## Hotmart

### Credenciais esperadas

- `client_id`
- `client_secret`
- Credencial Basic gerada no Hotmart Developers
- Hottok ou segredo equivalente configurado para webhook

### Setup

1. Criar ou acessar a aplicacao no Hotmart Developers.
2. Copiar `client_id`, `client_secret` e credencial Basic.
3. No GabLive, abrir Integracoes -> Hotmart.
4. Informar as credenciais e salvar.
5. Executar "Testar conexao". O teste deve ser feito por Edge Function server-side.
6. Configurar o webhook da Hotmart apontando para a URL com `provider=hotmart`.
7. Configurar o Hottok/segredo do webhook.
8. Criar o mapeamento entre produto Hotmart e webinar GabLive.

### Eventos

Escopo inicial:

- compra aprovada;
- eventos duplicados por retry devem ser ignorados;
- eventos sem mapeamento devem ser armazenados como `unmapped`.

Eventos de reembolso, chargeback, assinatura e afiliado ficam fora do primeiro escopo, salvo se forem necessarios para nao quebrar o payload recebido.

### Sandbox/testes

- Usar ambiente sandbox ou payload mockado quando disponivel.
- Nao testar com credenciais de producao em ambiente local compartilhado.
- Confirmar que uma compra aprovada cria exatamente um evento normalizado e uma conversao no webinar mapeado.
- Reenviar o mesmo payload deve retornar sucesso sem duplicar conversao.

## Selflux/SellFlux

O nome de UI ainda precisa ser confirmado: "Selflux" ou "SellFlux". O identificador tecnico planejado e `selflux`.

### Credenciais esperadas

Material publico encontrado indica API REST/Webhook com API Key. Antes da implementacao completa, confirmar na conta ou documentacao oficial:

- nome exato do header de autenticacao;
- se webhook usa API Key, shared secret, assinatura HMAC ou outro mecanismo;
- campos de produto/oferta;
- campos de transacao;
- campos de comprador;
- nomes dos eventos de compra aprovada, reembolso e cancelamento.

### Setup planejado

1. No GabLive, abrir Integracoes -> Selflux/SellFlux.
2. Informar API Key e segredo de webhook, conforme confirmacao oficial.
3. Executar "Testar conexao" por Edge Function server-side.
4. Configurar o webhook no painel Selflux/SellFlux apontando para a URL com `provider=selflux`.
5. Criar o mapeamento entre produto/oferta Selflux/SellFlux e webinar GabLive.

### Sandbox/testes

- Preferir sandbox/test mode do provedor, se existir.
- Se nao houver sandbox, usar payload mockado capturado de documentacao ou evento real anonimizado.
- Validar compra aprovada, payload duplicado e produto/oferta sem mapeamento.

## Rotacao de segredo

1. Gerar nova credencial no provedor.
2. Salvar a nova credencial no GabLive.
3. Testar conexao.
4. Atualizar webhook no provedor, quando o segredo de webhook mudar.
5. Desativar/revogar a credencial antiga no provedor.
6. Conferir se novos eventos continuam sendo recebidos e se eventos antigos continuam preservados.

## Checklist antes de producao

- [ ] Credenciais nao aparecem no payload de leitura do frontend.
- [ ] RLS impede que uma organizacao leia integracoes de outra.
- [ ] Webhook rejeita segredo invalido.
- [ ] Webhook aceita payload valido do provedor correto.
- [ ] Idempotencia impede duplicidade.
- [ ] Compra mapeada gera analytics/conversao no webinar correto.
- [ ] Compra sem mapeamento fica visivel como `unmapped`.
- [ ] Documentacao do payload Selflux/SellFlux foi confirmada.
