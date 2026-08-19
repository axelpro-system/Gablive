# Roadmap

**Current Milestone:** Fechar Maturidade Funcional
**Status:** Milestones 1-4 COMPLETE — ver "Future Considerations" para o que ficou fora deste ciclo

---

## Milestone 1 — Segurança e Integridade de Venda (crítico)

**Goal:** Nenhum webhook pode ser aceito sem validação real; nenhum toggle/ação na UI pode fingir sucesso sem persistir.
**Target:** Antes de qualquer outra melhoria — risco de segurança e financeiro ativo.

### Features

**Corrigir bypass de secret no webhook** - COMPLETE
- Remover fallback que processa webhook mesmo com falha de descriptografia (`receive-integration-webhook/index.ts:213-226`)
- Remover chave de criptografia fallback hardcoded (`_shared/crypto.ts:9-13`) — falhar no startup se `INTEGRATION_ENCRYPTION_KEY` ausente

**Unificar sistema de integrações de venda** - COMPLETE
- Decidir sistema único (A: `org_sales_integrations`/`provider_webhook_events` vs B: `integration_credentials`/`integration_events`) e migrar/depreciar o outro
- Corrigir `salesIntegrationApi.js` para gerar URL de webhook do sistema realmente alimentado pela UI
- Implementar `updateProductMapping` de verdade (remover stub `not yet implemented`)

**Propagar reembolso/chargeback** - COMPLETE
- `purchase-webhook/index.ts`: processar eventos `refunded`/`chargeback`/`cancelled` já mapeados pelos adapters e cancelar a inscrição correspondente

---

## Milestone 2 — Eliminar Dados Fake/Placeholder

**Goal:** Nenhuma tela mostra número ou estado que não reflete a realidade.
**Target:** Alto impacto de credibilidade, sem risco de segurança.

### Features

**KPIs reais do dashboard** - COMPLETE
- Calcular "Total de Participantes" e "Taxa Média de Conversão" em `DashboardPage.jsx:48-58` a partir de dados reais (hoje são `'—'` hardcoded)

**Contador de espectadores real na sala** - COMPLETE (novo modo `real` via Presence, mantendo `fixed`/`dynamic` como opções legítimas configuráveis)
- Substituir `useSimulatedAudience.js` (usa `Math.random()`) por presence real via Supabase Realtime

---

## Milestone 3 — Robustez do Funil Público

**Goal:** Fluxo de inscrição/participação com o mesmo nível de acabamento de um SaaS maduro.

### Features

**Captura de UTM e cap de vagas** - COMPLETE
- Capturar/persistir UTM em `RegistrationPage.jsx` / `useRegistrationSubmit.js`
- Adicionar coluna de capacidade + lista de espera (nova migration)

**Tratamento de erro amigável** - COMPLETE
- `useRegistrationSubmit.js:85-88`: nunca expor mensagem crua do Postgres/PostgREST
- Distinguir "webinar não existe" de "falha de rede" em `RegistrationPage`, `WaitRoomPage`, `ReplayPage` (com retry)

**CTA explícito de recuperação de inscrição** - COMPLETE
- Expor "Já se inscreveu? Reenviar acesso" em vez do fluxo escondido atual

---

## Milestone 4 — Paridade de Robustez: Chat/IA ao Vivo

**Goal:** Chat e agente de IA na sala com o mesmo padrão de tratamento de erro do módulo de agentes do dashboard.

### Features

**Moderação de chat** - COMPLETE
- Banir participante / deletar mensagem (operador)

**Rate limit de IA + reconexão de realtime** - COMPLETE
- Rate limit por usuário/sala nas chamadas a `gemini-chat`
- Retry/backoff em `useChat.js` quando o canal cair (`CHANNEL_ERROR`/`CLOSED`)
- Timeout (`AbortController`) na chamada Gemini em `gemini-chat/index.ts:113`

---

## Future Considerations

- Onboarding guiado para operador novo
- CRUD de webinar: duplicar/arquivar/templates
- Billing/plano/limites de uso visíveis
- Analytics com comparação temporal e funil por etapa
- Notificações in-app/e-mail de eventos importantes (webinar prestes a começar, webhook falhando)
- Replay como gravação real da sessão (não o mesmo link do vídeo ao vivo)
- `.ics` anexado no e-mail de confirmação + timezone visível no countdown
- Suporte a mais provedores de venda (Kiwify, Eduzz, Monetizze)
