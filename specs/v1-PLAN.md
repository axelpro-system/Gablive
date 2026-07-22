# Plan: Release v1 (pós-MVP)

**Spec de origem:** `specs/backlog-v1.5-v2-SPEC.md`
**Escopo desta release:** Administrators/Usuários, Audit log, Páginas (templates reaproveitáveis), export de métricas CSV, script de verificação multi-tenant.
**Fora desta release:** Integrações CRM, Chatbot, Split Testing, domínio custom (v1.5); Agente de IA, geração de chat via IA, Atendimento ao vivo, Billing (v2).

---

## Componentes e dependências

```
migration 003 (audit_logs, page_templates, webinars.*_page_template_id)
        │
        ├──► lib/audit.js (helper de log)
        │        │
        │        └──► wiring nos mutation points existentes (webinar CRUD)
        │                 └──► AuditLogPage.jsx (dashboard)
        │
        ├──► Edge Function invite-administrator (service role)
        │        └──► UsersPage.jsx (lista + convite)
        │
        └──► PageTemplatesEditor.jsx + seletor no wizard do webinar
                 └──► RegistrationPage.jsx / WaitRoomPage.jsx passam a resolver template quando presente

CSV export (independente, sem dependência de migration) ─────────────► AnalyticsDashboard.jsx
scripts/verify-multi-tenant.mjs (independente, só precisa da migration 001+002 já aplicada)
```

## Ordem de implementação

1. **Migration 003** — `audit_logs`, `page_templates`, colunas `registration_page_template_id`/`wait_page_template_id` em `webinars` (nullable, backward-compatible: quando `null`, continua usando o `registration_pages` 1:1 existente).
2. **`lib/audit.js`** — helper `logAudit({ orgId, userId, action, webinarId, description })` que insere em `audit_logs`.
3. **Wiring de audit** nos pontos de mutação já existentes: `useWebinar.js` (create/update/delete), convite de administrador (passo 5). Escopo explícito — não é retrofit exaustivo de todo o app.
4. **`AuditLogPage.jsx`** — nova tela `/audit` listando `audit_logs` da org (usuário, data, webinar, ação, descrição).
5. **Edge Function `invite-administrator`** — recebe e-mail + papel, usa a service-role key (só no servidor) para criar o usuário via Supabase Auth admin API + a profile já com `org_id` correto, dispara magic link.
6. **`UsersPage.jsx`** — lista de administradores da conta (nome, e-mail, papel, ação) + modal de convite chamando a Edge Function.
7. **`PageTemplatesEditor.jsx`** — CRUD de templates de página (tipo: registro botão+form / registro form fixo / registro legada / espera JIT / espera legada / espera único), reaproveitáveis entre webinars.
8. **Seletor de template** no wizard do webinar (aba Início ou Registro): se um template for escolhido, `RegistrationPage.jsx`/`WaitRoomPage.jsx` resolvem o template em vez do `registration_pages` 1:1 (mantendo o caminho antigo como fallback).
9. **Export CSV** — implementar de fato o botão "Exportar CSV" do `AnalyticsDashboard.jsx` (gera Blob client-side a partir dos dados já carregados, sem endpoint novo).
10. **`scripts/verify-multi-tenant.mjs`** — script Node standalone com duas contas de teste, falha se RLS vazar dado entre orgs.

Passos 9 e 10 são independentes do resto e podem ser feitos em paralelo a qualquer momento.

## Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Service-role key da Edge Function exposta | Fica só em variável de ambiente do lado do servidor (Supabase secrets), nunca em `VITE_*` nem no bundle do client |
| Nomenclatura de papéis do PRD (admin/operador/atendente) não bate 1:1 com o enum atual (`admin/presenter/attendee`) | Não renomeio o enum (evita migration destrutiva); mapeio só os *labels* na UI: presenter→"Operador", attendee→"Atendente" |
| Audit log virar retrofit infinito | Escopo fechado nesta release: só webinar CRUD + convite de administrador. Novas seams (integrações, chatbot etc. da v1.5) ganham seu próprio audit quando forem implementadas |
| Templates de página quebrarem webinars já publicados | Colunas novas são nullable e só ativam o caminho novo quando preenchidas — comportamento antigo é o default |
| Script de verificação multi-tenant depender de contas de teste reais no Supabase | Documentar no próprio script como criar as duas contas de teste (ou aceitar env vars `TEST_ORG_A_*`/`TEST_ORG_B_*`) |

## Checkpoints de verificação

- Após (1)-(4): criar/editar um webinar e ver a entrada correspondente em `/audit`.
- Após (5)-(6): convidar um segundo usuário, ele consegue logar e só vê webinars da mesma org.
- Após (7)-(8): criar um template de página, associá-lo a dois webinars diferentes, confirmar que os dois renderizam o mesmo template.
- Após (9): baixar o CSV e abrir — colunas e linhas corretas.
- Após (10): rodar o script e confirmar falha proposital (forçar leitura cross-org) vira erro claro, e o caminho correto passa.
- Fechamento da release: `npm run build` limpo.

---

Aguardando validação deste Plan antes de eu escrever as Tasks (passo 3 do fluxo Specify→Plan→Tasks→Implement).
