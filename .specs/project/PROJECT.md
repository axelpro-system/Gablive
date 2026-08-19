# Gablive

**Vision:** Plataforma de webinars (SaaS) para operadores venderem/engajarem audiência ao vivo com apoio de agentes de IA, replay e integrações de venda.
**For:** Operadores/infoprodutores que rodam webinars de vendas (ex.: Marina) e participantes que se inscrevem e assistem (ex.: João).
**Solves:** Substitui um mix de ferramentas (landing + webinar + chat + follow-up de venda) por um único produto ponta a ponta.

## Goals

- Fechar o gradiente de maturidade entre módulos (features "acabadas" vs "placeholder") — meta: zero dado fake/hardcoded visível ao usuário final.
- Tornar as integrações de venda confiáveis — meta: zero bypass de validação de secret, reembolso sempre cancela inscrição.

## Tech Stack

**Core:**

- Framework: React 19 + React Router 7 + Vite 6 (JS/JSX)
- Language: JavaScript (sem TypeScript no frontend; Deno/TS nas Edge Functions)
- Database: Supabase (Postgres + RLS, Realtime, Auth)

**Key dependencies:** i18next (pt-BR/en), DOMPurify, Bootstrap grid, Playwright/node:test

## Scope

**Ciclo atual (fechar "cara de amador" funcional):**

- Corrigir bypass de segurança e integrações de venda quebradas por construção
- Substituir dados simulados/placeholder por dados reais (KPIs do dashboard, contador de espectadores)
- Fechar gaps de funil público (UTM, cap de vagas, erros amigáveis)
- Elevar chat/IA ao vivo ao mesmo nível de robustez do módulo de agentes do dashboard

**Explicitly out of scope (por ora):**

- Redesign visual/CSS (já resolvido em outro fluxo — não é o foco deste ciclo)
- Billing/planos pagos (mencionado como gap, mas não priorizado neste ciclo)
- Novos provedores de venda (Kiwify/Eduzz/Monetizze)

## Constraints

- Não pode haver regressão de segurança multi-tenant (RLS/org_id) — usar `gablive-rls-tenant` antes de mudar schema.
- Commits exigem seção "How to test" (ver CLAUDE.md do repo).
