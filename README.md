# Gablive

Plataforma multi-tenant de webinários para funil de vendas — crie, gerencie e converta com webinários ao vivo, gravados e evergreen (Just-in-Time).

---

## Stack

| Categoria | Tecnologia |
|-----------|-----------|
| **Frontend** | React 19, React Router 7, Vite 6 |
| **Backend / BaaS** | Supabase (Auth, Database, Realtime, Edge Functions) |
| **Estilo** | CSS Custom Properties (design system próprio), sem framework CSS |
| **Gráficos** | Recharts |
| **Ícones** | Lucide React |
| **Internacionalização** | i18next + react-i18next (pt-BR, en) |
| **Datas** | date-fns + date-fns-tz |
| **Deploy** | Vercel (SPA com rewrites) |
| **Lint** | ESLint 9 |

---

## Quick Start

```bash
# 1. Clone e instale
git clone <repo-url>
cd gablive
npm install

# 2. Configure variáveis de ambiente
cp .env.example .env
# Preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY

# 3. Rode as migrations no Supabase
# Execute os arquivos em supabase/migrations/ em ordem:
#   001_initial_schema.sql → 002_jit_and_conversion.sql

# 4. Inicie o dev server
npm run dev
```

O app abre em `http://localhost:3000`.

---

## Features

### Para criadores de webinário (dashboard)

| Funcionalidade | Descrição |
|---------------|-----------|
| **Webinários ao vivo e gravados** | Suporte a YouTube e Vimeo, com agendamento e timezone |
| **Just-in-Time (evergreen)** | Webinários que iniciam quando o participante entra, com sala de espera e delay configurável |
| **Páginas de registro** | Editor de blocos (hero, benefícios, depoimentos, formulário, countdown) com temas personalizáveis |
| **CTAs / Ofertas** | Banners com preço original/promoção, disparo por tempo de vídeo |
| **Chat simulado** | Mensagens pré-programadas sincronizadas com o vídeo para replays |
| **Enquetes** | Criação de perguntas com múltiplas opções, respostas e resultados |
| **Prova social** | Notificações de venda ("Fulano acabou de comprar") sincronizadas com o vídeo |
| **Audiência simulada** | Contador de "pessoas assistindo" (fixo ou dinâmico) na sala |
| **E-mails automáticos** | Confirmação de registro, lembrete (24h/1h/15min), replay disponível |
| **Analytics** | Registros, taxa de comparecimento, conversão de CTA, tempo médio de exibição, funil de assistência |
| **Dashboard global** | KPIs agregados, gráfico de funil, donut, comparação entre webinários |
| **Customização de login** | Logo, barra de progresso, campos obrigatórios, textos |
| **Export CSV** | Exportação de métricas por webinar |

### Para participantes (páginas públicas)

| Funcionalidade | Descrição |
|---------------|-----------|
| **Página de registro** | Formulário customizável com contador regressivo |
| **Sala de espera** | Countdown, contador de audiência, chamada para ação |
| **Sala do webinário** | Player de vídeo + chat em tempo real (Supabase Realtime) |
| **Replay** | Acesso por tempo limitado (configurável, default 48h) |
| **Chat ao vivo** | Envio de mensagens anônimas ou identificadas |

### Plataforma

| Funcionalidade | Descrição |
|---------------|-----------|
| **Multi-tenant** | Isolamento total por organização via Row-Level Security (RLS) no Supabase |
| **Multi-idioma** | pt-BR e en com detecção automática de idioma |
| **Auth completo** | Registro com criação automática de org + perfil, login, reset de senha |
| **Segurança** | Sanitização de XSS, RLS em todas as tabelas, service-role só no servidor |

---

## Estrutura do Projeto

```
gablive/
├── src/
│   ├── components/
│   │   ├── editor/          # Editores (registro, e-mails, interações, analytics)
│   │   └── layout/          # Layouts (AppLayout com sidebar, PublicLayout)
│   ├── contexts/            # AuthContext, OrgContext
│   ├── hooks/               # useWebinar, useChat, useAnalytics, useCountdown
│   ├── lib/                 # supabase client, i18n config, constants, sanitize
│   ├── locales/             # pt-BR.json, en.json
│   ├── pages/
│   │   ├── auth/            # Login, Register
│   │   ├── dashboard/       # Dashboard, Webinars, Create/Edit, Analytics, Settings
│   │   └── public/          # Registration, WaitRoom, WebinarRoom, Replay
│   └── styles/              # Design system CSS (tokens, componentes, utilities)
├── supabase/
│   ├── migrations/          # 001_initial_schema.sql, 002_jit_and_conversion.sql
│   └── functions/           # send-email, process-email-queue, schedule-reminders
├── specs/                   # Design system, tokens CSS, planos de release
├── index.html               # Entry point
├── vite.config.js           # Configuração Vite + alias @/
└── vercel.json              # SPA rewrites
```

---

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Dev server com HMR (porta 3000) |
| `npm run build` | Build de produção |
| `npm run preview` | Preview do build de produção |
| `npm run lint` | ESLint em todo o projeto |

---

## Configuração

### Variáveis de ambiente

| Variável | Descrição | Default |
|----------|-----------|---------|
| `VITE_SUPABASE_URL` | URL do projeto Supabase | — |
| `VITE_SUPABASE_ANON_KEY` | Chave anônima do Supabase | — |

### Configurações do Supabase

1. Crie um projeto em [supabase.com](https://supabase.com)
2. Execute as migrations SQL em ordem
3. Habilite **Realtime** para a tabela `chat_messages` (já incluso na migration 001)
4. Configure as Edge Functions: `send-email`, `process-email-queue`, `schedule-reminders`

---

## Banco de Dados

### Principais tabelas

| Tabela | Descrição |
|--------|-----------|
| `organizations` | Organizações (tenants), isoladas por RLS |
| `profiles` | Perfis de usuário vinculados a uma org |
| `webinars` | Webinários com tipo, status, slug, recorrência |
| `registrations` | Participantes registrados |
| `registration_pages` | Páginas de registro com blocos JSON |
| `chat_messages` | Chat em tempo real (realtime habilitado) |
| `simulated_messages` | Mensagens simuladas sincronizadas com vídeo |
| `cta_configs` | CTAs/ofertas com timing, preços, banners |
| `polls` / `poll_responses` | Enquetes e respostas |
| `analytics_events` | Eventos de analytics (funnel tracking) |
| `email_configs` / `email_queue` | Configuração e fila de e-mails |
| `sales_notifications` | Notificações de prova social |
| `audience_configs` | Configuração do contador de audiência |
| `login_customizations` | Customização da tela de entrada |

### Segurança (RLS)

Todas as tabelas usam **Row-Level Security**. Políticas garantem:
- Cada organização vê apenas seus próprios dados
- Páginas públicas (registro, replay) são acessíveis sem autenticação
- Registros e analytics aceitam inserts anônimos
- Apenas membros da org podem modificar webinários e configurações

---

## Rotas

### Públicas (sem auth)
| Rota | Página |
|------|--------|
| `/register/:slug` | Página de registro do webinar |
| `/wait/:slug` | Sala de espera |
| `/room/:slug` | Sala do webinar (player + chat) |
| `/replay/:slug` | Replay do webinar |

### Auth
| Rota | Página |
|------|--------|
| `/auth/login` | Login |
| `/auth/register` | Registro de nova conta |

### Dashboard (protegido)
| Rota | Página |
|------|--------|
| `/dashboard` | Dashboard principal |
| `/webinars` | Lista de webinários |
| `/webinars/create` | Criar novo webinar |
| `/webinars/:id` | Editar webinar (wizard) |
| `/analytics` | Analytics global |
| `/settings` | Configurações da conta |
| `/admin` | Painel administrativo |

---

## Design System

O projeto usa um design system próprio com CSS Custom Properties. Tokens principais:

| Token | Descrição |
|-------|-----------|
| `--color-primary-*` | Paleta de vermelho de marca (9 tons) |
| `--color-gray-*` | Escala de cinza (25–900) |
| `--color-bg` | Fundo da página |
| `--color-text` | Cor de texto principal |
| `--radius-*` | Border radius (sm=4, md=8, lg=12, xl=16) |
| `--shadow-*` | Elevações (sm, md, lg) |
| `--space-*` | Escala de espaçamento (4px base) |

**Tipografia:** Inter, sem serifa, com escala de 12px–40px.

Ver `specs/DESIGN-SYSTEM.md` e `specs/tokens-reference.css` para a referência completa.

---

## Roadmap

| Versão | Escopo |
|--------|--------|
| **v1** (atual) | MVP funcional: webinários ao vivo/gravados/JIT, registro, chat, CTAs, analytics, multi-tenant |
| **v1.5** | Administradores, audit log, templates de página, export CSV, verificação multi-tenant |
| **v2** | Integrações CRM, chatbot, split testing, domínio customizado, agente de IA |

Ver `specs/v1-PLAN.md` e `specs/backlog-v1.5-v2-SPEC.md` para detalhes.

---

## Contribuindo

1. Crie uma branch a partir de `main`
2. Rode `npm run lint` antes de commitar
3. Siga o design system em `specs/DESIGN-SYSTEM.md`
4. Use os hooks existentes em `src/hooks/` para acesso a dados
5. Não exponha chaves de service-role no client — use apenas Edge Functions

---

## Licença

Privado — todos os direitos reservados.
