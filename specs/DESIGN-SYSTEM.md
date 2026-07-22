# HotWebinar Design System

> Extraído por inspeção visual das screenshots do admin (`screenshots/`, `deep/screenshots/`).
> Versão UI observada: **2.0.1** · Tema: **light** · Marca: **vermelho quente + neutros frios**
>
> **Aplicação no webinar-saas:** os tokens de cor primária (`--color-primary-*`) em
> `src/styles/index.css` foram retintados para a paleta de vermelho de marca descrita
> aqui. Ver seção "Mapeamento aplicado" no final deste documento para o que já foi
> portado para o código vs. o que ainda é só referência.

---

## 1. Visual theme & atmosphere

| Atributo | Valor |
|----------|--------|
| Mood | SaaS B2B limpo, "marketing ops", alta conversão |
| Densidade | Média (cards com padding generoso, sidebar compacta) |
| Tema | Light only (sem dark mode observado) |
| Accent | Vermelho brand `#E31C23` / `#EF2B2D` |
| Superfícies | Branco puro + cinza-azulado muito claro no canvas |
| Contraste | Texto quase preto em fundo claro; CTAs solid black (login) ou green/red (app) |
| Ícones | Outline stroke fino (lucide-like), 16–20px |
| Radius | Suave e consistente (~8–12px cards, ~999px pills) |

**Filosofia:** vermelho só para marca, estados ativos, badges de tipo e FAB de suporte. O restante é neutro para não competir com dados/métricas. Verde escuro aparece em CTAs secundários de criação ("+ Criar novo", "Continuar").

---

## 2. Color tokens

### Brand & semantic

| Token | Hex | Uso |
|-------|-----|-----|
| `--brand-red` | `#E31C23` | Logo wordmark, FAB chat, avatar user, badge "Único", ícones de métrica, step ativo |
| `--brand-red-bright` | `#EF2B2D` | Hover de brand, dots de chart |
| `--brand-red-soft` | `#FDE8E9` | Chip ativo "Início", ícone bg soft, nav highlight tint |
| `--brand-red-muted` | `#F5A3A6` | Funil stages intermediários |
| `--brand-red-deep` | `#B01018` | Funil stages escuros / donut |
| `--login-red-start` | `#FF1A1A` | Gradient login (topo) |
| `--login-red-mid` | `#C40000` | Gradient login |
| `--login-red-end` | `#1A0000` | Gradient login (base) |

### Neutrals (UI app)

| Token | Hex | Uso |
|-------|-----|-----|
| `--bg-canvas` | `#F4F5F7` | Fundo geral do app (leve cool gray) |
| `--bg-sidebar` | `#FFFFFF` | Sidebar |
| `--bg-surface` | `#FFFFFF` | Cards, tables, forms |
| `--bg-surface-muted` | `#FAFBFC` | Nested panels |
| `--bg-nav-active` | `#F1F2F4` | Item de menu ativo (pill cinza) |
| `--border-default` | `#E5E7EB` | Bordas de card/input/table |
| `--border-strong` | `#D1D5DB` | Botões outline, dividers |
| `--text-primary` | `#111827` | Títulos, body principal |
| `--text-secondary` | `#6B7280` | Labels, helper, meta |
| `--text-muted` | `#9CA3AF` | Placeholders, version, footer |
| `--text-inverse` | `#FFFFFF` | Em botões pretos/vermelhos |
| `--icon-default` | `#6B7280` | Ícones idle sidebar |
| `--icon-active` | `#E31C23` | Ícone menu ativo |

### Action colors

| Token | Hex | Uso |
|-------|-----|-----|
| `--btn-primary-login` | `#0A0A0A` | CTA login "Entrar" (preto full) |
| `--btn-create` | `#0F5132` / `#14532D` | "+ Criar novo" (verde escuro) |
| `--btn-continue-border` | `#14532D` | Outline "Continuar" |
| `--btn-continue-text` | `#14532D` | Texto "Continuar" |
| `--badge-jit-bg` | `#111827` | Badge "Just In Time" |
| `--badge-jit-fg` | `#FFFFFF` | |
| `--badge-unico-bg` | `#E31C23` | Badge "Único" |
| `--toast-error-bg` | `#C81E1E` | Toast "Erro! …" |
| `--status-success` | `#16A34A` | Trust badges login ("SITE SEGURO") |
| `--status-active-text` | `#374151` | Label "Ativo" na tabela |
| `--link` | `#2563EB` | Links secundários (raros) |
| `--focus-ring` | `rgba(227, 28, 35, 0.35)` | Focus inputs |

### Chart / data viz

| Token | Uso |
|-------|-----|
| Funnel ramp | `#F8B4B4` → `#F07171` → `#E31C23` → `#B01018` |
| Donut track | `#FECACA` |
| Donut value | `#E31C23` |
| Bar chart | `#D1D5DB` (empty/low), brand red when filled |
| Sankey nodes | stroke/fill brand red, labels gray |

---

## 3. Typography

### Font family

Sans-serif geométrica moderna (próxima de **Inter** / **Plus Jakarta Sans** / system UI):

```css
--font-sans: "Inter", "Segoe UI", system-ui, -apple-system, sans-serif;
```

Observado: tracking neutro, sem serifa, excelentes números tabulares em métricas.

### Type scale

| Role | Size | Weight | Line-height | Cor |
|------|------|--------|-------------|-----|
| Display (login brand) | 36–40px | 700 | 1.1 | white |
| Page title (`h1`) | 28–32px | 700 | 1.2 | `--text-primary` |
| Section title | 16–18px | 600 | 1.3 | `--text-primary` |
| Card title / table primary | 14–15px | 600 | 1.4 | `--text-primary` |
| Body | 14px | 400 | 1.5 | `--text-primary` |
| Label form | 13–14px | 500 | 1.4 | `--text-primary` |
| Helper / meta | 12–13px | 400 | 1.4 | `--text-secondary` |
| Caption / version | 11–12px | 400 | 1.3 | `--text-muted` |
| Metric big number | 24–32px | 700 | 1.1 | `--text-primary` |
| Badge | 11–12px | 600 | 1 | inverse |
| Sidebar item | 13–14px | 400 / 500 active | 1.3 | secondary / primary |

### Regras

- Máx. **4 tamanhos** por view principal.
- Títulos de página sempre bold; nunca all-caps em headings (só micro-labels de trust).
- Placeholders em `--text-muted`, nunca itálico.
- Asterisco de required (`*`) na mesma cor do label (preto/cinza escuro).

---

## 4. Spacing & layout

### Grid base: **4px** (densidade média)

| Token | px | Uso |
|-------|-----|-----|
| `--space-1` | 4 | micro gaps |
| `--space-2` | 8 | icon-text, chip padding-y |
| `--space-3` | 12 | input padding-y, compact lists |
| `--space-4` | 16 | card padding default, form field gap |
| `--space-5` | 20 | section inner |
| `--space-6` | 24 | card padding large, page gutter |
| `--space-8` | 32 | entre blocos de dashboard |
| `--space-10` | 40 | page top padding |
| `--space-12` | 48 | login form spacing |

### Layout shell (admin)

```
┌────────────┬────────────────────────────────────────┐
│  Sidebar   │  Top: page title + toolbar             │
│  ~240px    │────────────────────────────────────────│
│  logo      │  Content canvas (scroll)               │
│  nav       │  cards / table / wizard                │
│  footer    │                                        │
│  avatar    │                                        │
└────────────┴────────────────────────────────────────┘
```

| Zona | Spec |
|------|------|
| Sidebar width | **240px** (colapsável) |
| Sidebar logo | left, brand red wordmark |
| Content max | fluid; padding horizontal **24–32px** |
| Card grid KPI | 4 colunas desktop, gap 16px |
| Table | full width, header sticky opcional |
| FAB chat | fixed bottom-right, 56px circle |
| User chrome | bottom of sidebar: avatar 32px + bell + logout + version |

### Border radius

| Token | px | Uso |
|-------|-----|-----|
| `--radius-sm` | 6 | chips, small buttons |
| `--radius-md` | 8 | inputs, filter buttons |
| `--radius-lg` | 12 | cards, table container |
| `--radius-xl` | 16 | login card |
| `--radius-pill` | 9999 | badges, nav active, stepper dots |
| `--radius-full` | 50% | avatar, FAB |

---

## 5. Elevation & borders

| Nível | Spec | Uso |
|-------|------|-----|
| Flat | `border: 1px solid var(--border-default)` | default cards, table |
| Raised soft | `0 1px 2px rgba(16,24,40,.04), 0 1px 3px rgba(16,24,40,.08)` | KPI cards |
| Float | `0 8px 24px rgba(16,24,40,.12)` | dropdowns, toasts |
| Login card | `0 4px 24px rgba(0,0,0,.06)` + border light |

Sem blur glassmorphism no admin. Login usa **gradiente vermelho** forte só no painel brand.

---

## 6. Components

### 6.1 Sidebar navigation

- Background white, border-right 1px `--border-default`
- Item: icon 18px + label, padding `10px 12px`, radius `--radius-md`
- **Active:** bg `--bg-nav-active`, icon + text `--brand-red` (ou text dark + icon red)
- **Inactive:** icon/text `--text-secondary`
- Hover: bg `#F9FAFB`
- Groups: flat list (sem seções colapsáveis observadas)

### 6.2 Buttons

| Variant | Visual |
|---------|--------|
| **Primary login** | bg black, text white, full width, radius 8, h~44px |
| **Create / positive** | bg dark green `#14532D`, text white, icon "+", radius 8, h~36–40px |
| **Continue (wizard)** | outline green, text green, "Continuar ›" |
| **Secondary / filter** | white bg, border `--border-strong`, text primary, chevron |
| **Ghost icon** | 32–36px square, border light, icon red outline (ações de tabela) |
| **Export / Tempo real** | white + border, h~36 |
| **Destructive toast close** | X white on red toast |

Hover: darken 6–8% ou border mais escuro. Transition **150–200ms** ease.

### 6.3 Inputs

```
height: 40–44px
padding: 10px 14px
bg: white
border: 1px solid #E5E7EB
radius: 8px
focus: border-color #E31C23; box-shadow: 0 0 0 3px rgba(227,28,35,.15)
```

- Label acima, 13–14px medium
- Required `*` colado ao label
- Helper com ícone `ⓘ` cinza
- Search: ícone lupa left, placeholder "Pesquise aqui"

### 6.4 Cards (KPI / chart)

- bg white, border 1px, radius 12, padding 16–20
- Header: soft red icon circle 28–32px + title 14 medium + optional info icon
- Body: big number or chart
- Empty Firepay: logo + texto muted

### 6.5 Table

- Container card com radius 12
- Header row: text secondary, 12–13px medium, no uppercase heavy
- Row height ~64–72px (thumbnail 40×40 + 2 linhas de texto)
- Thumbnail radius 8
- Status text plain; type as **pill badge**
- Action cluster: 5–6 icon buttons em linha + "…"
- Footer: "Total de registros: N" left; pagination right

### 6.6 Badges / pills

| Badge | bg | text |
|-------|-----|------|
| Just In Time | `#111827` | white |
| Único | `#E31C23` | white |
| Step label active | soft red bg | brand red |
| Nav active | gray soft | dark / red icon |

Padding: `4px 10px`, radius pill, weight 600, size 11–12px.

### 6.7 Stepper (webinar wizard)

- Horizontal: icon + label por step
- Active: brand red icon + green numbered circle on rail + soft red label chip
- Incomplete: gray icon + gray circle number
- Connector line: light gray track, green fill up to current
- Steps: Início → Webinar → Login → Vídeo → Oferta → Chat → Vendas → Audiência → Integrações → Chatbot → (Agente de IA)

### 6.8 Avatar

- Circle 32px (sidebar) / 48–64px (presenter)
- User fallback: initials on **solid brand red**, white bold text
- Presenter empty: illustration blue-gray person

### 6.9 FAB (support chat)

- Fixed bottom-right ~24px margin
- Size 56×56, bg brand red, white chat bubble icon
- Shadow float
- z-index high (acima de content)

### 6.10 Toast / alert

- Error: solid red bar, white text, icon X left, radius 8, top-center of content
- Success (inferido): green equivalent

### 6.11 Date range picker trigger

- White button, border, calendar icon, mono-ish date string `DD/MM/YYYY HH:mm ~ DD/MM/YYYY HH:mm`

### 6.12 Template gallery (páginas)

- Section title + long helper paragraph (secondary)
- Grid 3 cols of preview cards
- Preview: screenshot-like, red marketing headers in thumbnails
- CTA under card: full-width outline button "Escolher esse"

### 6.13 Login (auth layout)

- Split 50/50 (desktop)
- Left: concentric red arc gradient + white wordmark centered
- Right: white, centered card max-width ~400px
- Trust row: green shield icons + uppercase micro labels

---

## 7. Iconography

- Style: **outline**, 1.5–2px stroke, rounded joins
- Library feel: Lucide / Heroicons
- Active state: brand red fill or stroke
- Soft icon wells: 32px circle, bg `--brand-red-soft`, icon brand red
- Table action icons: brand red stroke on white square buttons

---

## 8. Motion

| Interaction | Duration | Easing |
|-------------|----------|--------|
| Button hover | 150ms | ease-out |
| Nav active | 150ms | ease |
| Input focus ring | 120ms | ease-out |
| Toast enter | 200–250ms | ease-out |
| Page content | none / subtle fade 200ms | |
| FAB | static (pulse optional not observed) | |

Respeitar `prefers-reduced-motion`.

---

## 9. Breakpoints (recomendados a partir do layout)

| Name | Min | Behavior |
|------|-----|----------|
| `sm` | 640 | stack KPI 2-col |
| `md` | 768 | sidebar collapsible overlay |
| `lg` | 1024 | sidebar fixed 240px, KPI 4-col |
| `xl` | 1280 | confort padding |

Mobile nativo do admin **não** foi o foco das capturas (desktop 1440×900).

---

## 10. Do / Don't

### Do

- Usar vermelho brand com parcimônia (marca, ativo, badge, FAB, charts)
- Cards brancos em canvas cinza-claro
- Outline icons + soft wells vermelhos em KPIs
- Badges pill para tipo de evento
- Stepper com rail verde + step vermelho ativo

### Don't

- Dark mode inventado
- Gradientes no app shell (só no login brand panel)
- CTA primário azul genérico
- Cantos 0px (sistema é soft)
- Texto vermelho longo (só accents)
- Badges verdes para "Único" (é vermelho)

---

## 11. CSS variables (copy-paste)

Ver `tokens-reference.css` neste diretório.

---

## 12. Mapeamento tela → componentes

| Screenshot | Componentes-chave |
|------------|-------------------|
| `00_login` / `29_root` | Auth split, login card, primary black CTA, trust badges |
| `01_dashboard` | Shell, KPI grid, funnel chart, donut, date range |
| `02_webinars` | Filters bar, data table, badges JIT/Único, icon actions, create CTA green |
| `16_metricas` | Secondary buttons, error toast, sankey funnel |
| `tab_Início` | Wizard stepper, form fields, continue outline |
| `28_criar-nova` | Form + template gallery cards |

---

## 13. Tailwind mapping (opcional)

```js
// tailwind.config theme.extend.colors
brand: {
  DEFAULT: '#E31C23',
  bright: '#EF2B2D',
  soft: '#FDE8E9',
  muted: '#F5A3A6',
  deep: '#B01018',
},
canvas: '#F4F5F7',
create: '#14532D',
```

```
bg-canvas text-gray-900 border-gray-200
bg-brand text-white rounded-full
bg-create text-white rounded-lg
```

---

## Mapeamento aplicado (webinar-saas, 2026-07-22)

**Já portado para o código:**
- `--color-primary-*` (src/styles/index.css) retintado de indigo → rampa de vermelho de marca (§2). Isso re-tinge automaticamente `.btn-primary`, badges `badge-primary`, foco de input, sidebar nav ativo, seleção de texto, scrollbar hover — qualquer componente que já usava o token semântico.
- Novos tokens: `--brand-red*`, `--color-create-600/700`, `--badge-jit-bg/fg`, `--badge-unico-bg/fg`.
- Novas classes utilitárias: `.btn-create` (verde escuro, para "+ Criar novo"), `.btn-continue` (outline verde, reservado para wizard), `.btn-black` (CTA de login).
- `LoginPage.jsx`: CTA de login trocado para `.btn-black`.
- `WebinarsListPage.jsx` / `CreateWebinarPage.jsx`: botões de criação trocados para `.btn-create`; badge de Just-in-Time/Único aplicado com `.badge-dark`/`.badge-brand`.

**Ainda não portado (fica para uma passada de UI dedicada, fora do escopo desta atualização de tokens):**
- Layout split-screen 50/50 do login com gradiente vermelho radial (§6.13) — a tela atual é um card centralizado único.
- Stepper visual do wizard do webinar (§6.7) com trilho verde + círculos numerados — o `EditWebinarPage` hoje usa uma sidebar de abas verticais, não um stepper horizontal.
- Densidade de tabela 64–72px por linha com thumbnail 40×40 (§6.5) — tabelas atuais não têm thumbnail de vídeo.
- FAB de chat de suporte (§6.9) — não existe hoje no produto.
- Template gallery visual para páginas (§6.12) — related à v1 do backlog (`page_templates`), ainda não implementada.
