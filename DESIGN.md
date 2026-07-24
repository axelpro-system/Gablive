---
name: Gablive
description: Multi-tenant webinar platform for sales funnels
colors:
  primary: "#e31c23"
  primary-bright: "#ef2b2d"
  primary-soft: "#fde8e9"
  primary-muted: "#f5a3a6"
  primary-deep: "#b01018"
  neutral-canvas: "#fcfcfd"
  neutral-bg: "#f9fafb"
  neutral-muted: "#f2f4f7"
  neutral-border: "#eaecf0"
  neutral-border-strong: "#d0d5dd"
  neutral-muted-text: "#98a2b3"
  neutral-secondary-text: "#475467"
  neutral-text: "#101828"
  success: "#12b76a"
  success-strong: "#039855"
  warning: "#f79009"
  error: "#f04438"
  error-strong: "#d92d20"
  create-action: "#14532d"
  login-cta: "#0a0a0a"
typography:
  display:
    fontFamily: Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif
    fontSize: clamp(2.25rem, 5vw, 3.75rem)
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: -0.025em
  headline:
    fontFamily: Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif
    fontSize: clamp(1.5rem, 3vw, 2.25rem)
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: -0.02em
  title:
    fontFamily: Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif
    fontSize: clamp(1.125rem, 2vw, 1.5rem)
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: -0.015em
  body:
    fontFamily: Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif
    fontSize: 0.875rem
    fontWeight: 500
    lineHeight: 1.4
rounded:
  sm: 6px
  md: 8px
  lg: 12px
  xl: 16px
  full: 9999px
spacing:
  px: 1px
  1: 4px
  2: 8px
  3: 12px
  4: 16px
  5: 20px
  6: 24px
  8: 32px
  10: 40px
  12: 48px
  16: 64px
  20: 80px
  24: 96px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: 8px 16px
  button-primary-hover:
    backgroundColor: "{colors.primary-deep}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: 8px 16px
  button-secondary:
    backgroundColor: "#ffffff"
    textColor: "{colors.neutral-text}"
    rounded: "{rounded.md}"
    padding: 8px 16px
  button-ghost:
    backgroundColor: transparent
    textColor: "{colors.neutral-secondary-text}"
    rounded: "{rounded.md}"
    padding: 8px 16px
  button-create:
    backgroundColor: "{colors.create-action}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: 8px 16px
  button-danger:
    backgroundColor: "{colors.error-strong}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: 8px 16px
  card-default:
    backgroundColor: "#ffffff"
    rounded: "{rounded.lg}"
    padding: 24px
  input-field:
    backgroundColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: 8px 12px
  badge-pill:
    backgroundColor: "{colors.neutral-muted}"
    rounded: "{rounded.full}"
    padding: 2px 8px
  badge-brand:
    backgroundColor: "{colors.primary-soft}"
    rounded: "{rounded.full}"
    padding: 2px 8px
---

# Design System: Gablive

## Overview

**Creative North Star: "The Funnel Engine"**

Confiante e direta, com um toque de calor discreto proveniente da identidade visual da marca — cada pixel justifica sua presença por servir à conversão, não à decoração. Gablive é uma máquina de vendas calibrada, não um palco para excessos visuais. O vermelho da marca não é um acento decorativo: é o medidor de performance, o "no ar" da transmissão, o gatilho de conversão. Tudo o mais recua para um neutro cirúrgico.

A densidade é média — padding generoso o suficiente para respirar, compacto o suficiente para que um operador de marketing veja KPIs sem scroll. Cards e tabelas dominam o vocabulário de layout. Superfícies são limpas e brancas; o canvas usa um cinza quase imperceptível para hierarquia espacial. Sombras existem apenas como sinal de estado (hover, elevação), nunca como ornamento.

**Key Characteristics:**
- **Utilitarian confidence** — every element earns its place by serving a task
- **Contrast through restraint** — brand red is rare, therefore potent
- **Flat by default, responsive by state** — depth is a signal, not a texture
- **SaaS B2B density** — information-rich but never cluttered; generous whitespace around focused content

## Colors

O vermelho da marca é o único acento cromático. Neutros formam uma escada de 11 degraus do branco puro ao preto quase absoluto. A paleta de ação secundária usa verde escuro (criação) e preto sólido (CTAs de login).

### Primary (Vermelho Sinal)

- **Vermelho Sinal** (`#e31c23`): O vermelho canônico da marca. Usado em botões primários, badges de tipo "Único", links de navegação ativa, ícones de avatares sem foto, e como cor do FAB de chat.
- **Vermelho Sinal Brilhante** (`#ef2b2d`): Hover de elementos de marca, dots de gráfico (Recharts), realces de dados.
- **Vermelho Sinal Suave** (`#fde8e9`): Background de nav item ativo, chips de status "Início", foco de input, fundo de badges de marca, seleção de texto.
- **Vermelho Sinal Opaco** (`#f5a3a6`): Estágios intermediários de funil, donut chart track interno.
- **Vermelho Sinal Profundo** (`#b01018`): Hover de botão primário, estágios escuros de funil, hover de links.

### Neutral (Tinta)

- **Tinta** (`#101828`): Corpo de texto principal, títulos, headings. O preto-quase absoluto do sistema.
- **Tinta Elevada** (`#1d2939`): Títulos secundários, labels de seção.
- **Cinza Ardósia** (`#475467`): Texto secundário, labels de formulário, metadados de tabela, subtitles.
- **Cinza Opaco** (`#98a2b3`): Texto terciário, placeholders de input, versão/footer, ícones idle.
- **Borda Padrão** (`#d0d5dd`): Bordas fortes, botões outline, separadores.
- **Borda Suave** (`#eaecf0`): Bordas de card, input, tabela, divisores de lista.
- **Superfície Sutil** (`#f2f4f7`): Background de tabela (header), hover de ghost button, skeleton shimmer.
- **Canvas Claro** (`#f9fafb`): Background de página, fundo de página auth.
- **Superfície** (`#fcfcfd`): Card footer background.

### Semantic

- **Criar** / Verde Ação (`#14532d` / `#0f3d22`): Botão "+ Criar novo" e variações. Distinto do vermelho de marca para evitar ambiguidade — criação não é urgência.
- **Sucesso** (`#12b76a` / `#039855` / `#027a48`): Indicadores positivos, badges "Ativo", toasts de sucesso.
- **Aviso** (`#f79009` / `#dc6803`): Badges de alerta, indicadores de atenção.
- **Erro** (`#f04438` / `#d92d20` / `#b42318`): Badges de erro, botão de perigo, mensagens de validação.
- **Login CTA** (`#0a0a0a`): Botão "Entrar" na tela de login — preto sólido para máxima conversão.

### Named Rules

**The One Voice Rule.** O vermelho de marca ocupa no máximo ~10% de qualquer tela. Sua raridade é o que dá potência. Se uma tela tem muito vermelho, o sistema perde a hierarquia.

**The No-Invention Rule.** Não crie novas cores semânticas. Use a paleta existente. Uma cor que não está em `--color-*` ou `--gablive-*` não existe no sistema.

## Typography

**Display / Body Font:** Inter (com fallback -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif)

**Character:** Inter é uma grotesca neutra e eficiente — excelente para dashboards densos, tabelas com números, e leitura prolongada. Sem serifa, sem personalidade excessiva, com kerning consistente e tabular figures que fazem métricas alinharem perfeitamente.

### Hierarchy

- **Display** (700, `clamp(2.25rem, 5vw, 3.75rem)`, 1.1, -0.025em): Hero text na tela de login. Exclusivo para branding de entrada. Nunca usado dentro do dashboard.
- **Headline** (600, `clamp(1.5rem, 3vw, 2.25rem)`, 1.25, -0.02em): Títulos de página. Aparece no topo de cada view do dashboard e páginas públicas de registro.
- **Title** (600, `clamp(1.125rem, 2vw, 1.5rem)`, 1.3, -0.015em): Títulos de card, cabeçalhos de seção, wizard steps.
- **Body** (400, 0.875rem, 1.6): Texto corrido, descrições de card, conteúdo de parágrafo. Largura máxima de linha: 65–75ch.
- **Label** (500, 0.875rem, 1.4): Labels de formulário, itens de tabela, sidebar navigation. Sempre bold médio o suficiente para ser distinto sem gritar.
- **Caption / Meta** (400, 0.75rem, 1.4): Badges, helper text, hints, timestamps, versão do sistema.
- **Metric** (700, `clamp(1.5rem, 3vw, 2rem)`, 1.1, -0.02em): Números grandes em stat cards e analytics. Letter-spacing negativo para compactar.

### Named Rules

**The 4-Size Rule.** Cada view principal usa no máximo 4 tamanhos de tipo. Tipografia é hierarquia, não catálogo.

**The No-Italic Placeholder Rule.** Placeholders usam `--color-text-placeholder` na cor, nunca itálico.

## Layout

**Grid base:** 4px (densidade média). O sistema de espaçimento usa uma escala de 0.25rem (4px) a 6rem (96px).

**Layout shell (admin):** Sidebar fixa de 260px à esquerda, conteúdo à direita com header de página e canvas rolável. A sidebar é branca com borda direita; o canvas usa `--color-bg-subtle`.

**Layout shell (auth):** Centralizado vertical e horizontalmente, card de 440px max-width sobre fundo sutil.

**Páginas públicas:** Fluido, sem sidebar, com variações de layout para registro (formulário central + block content), sala de espera (countdown hero), e sala do webinar (player + chat lado a lado).

**Dashboard grids:**
- Stats: 4-column grid (`repeat(4, 1fr)`) com gap de 16px
- Conteúdo principal: `1.5fr 1fr` two-column grid para tabela + sidebar de webinars upcoming
- Webinar list: lista vertical compacta
- Largura máxima de conteúdo: 1200px

**Container pattern:** `.container` com `width: 100%`, `max-width: var(--max-content-width)`, padding horizontal de 24px.

### Named Rules

**The 4pt Baseline Rule.** Todo espaçamento é múltiplo de 4px no código e dentro da escala definida. Não use valores fora da escala `--space-*`.

## Elevation & Depth

**Hybrid model:** Superfícies são planas em repouso. Sombras aparecem exclusivamente como resposta a estado ou hierarquia — hover de card, dropdown aberto, modal elevado. O canvas usa um tom de cinza (`--color-bg-subtle`) para criar profundidade tonal sem sombra.

### Shadow Vocabulary

- **XS** (`0 1px 2px 0 rgba(16, 24, 40, 0.05)`): Botões em repouso, inputs. Sombra mínima — mal perceptível.
- **SM** (`0 1px 3px 0 rgba(16, 24, 40, 0.1), 0 1px 2px -1px rgba(16, 24, 40, 0.1)`): Botão hover, elementos sutilmente elevados.
- **MD** (`0 4px 6px -1px rgba(16, 24, 40, 0.1), 0 2px 4px -2px rgba(16, 24, 40, 0.1)`): Card hover, dropdown menu. A sombra mais usada para elevação interativa.
- **LG** (`0 10px 15px -3px rgba(16, 24, 40, 0.1), 0 4px 6px -4px rgba(16, 24, 40, 0.1)`): Toast, auth card, menus flutuantes.
- **XL** (`0 20px 25px -5px rgba(16, 24, 40, 0.1), 0 8px 10px -6px rgba(16, 24, 40, 0.1)`): Grandes superfícies elevadas.
- **2XL** (`0 25px 50px -12px rgba(16, 24, 40, 0.25)`): Modal — o ponto mais alto de elevação no sistema.

### Named Rules

**The Flat-By-Default Rule.** Superfícies são planas em repouso. Sombras aparecem apenas por interação (hover, focus) ou hierarquia (dropdown, modal). Nunca use sombra como decoração estática.

## Shapes

**Form language:** Cantos suavemente curvados em toda parte. Cards têm 12px de radius; botões e inputs têm 8px; pills e badges têm 9999px (completamente arredondados). Cantos nunca são abruptos nem completamente retos — o radius mais usado 8px cria uma sensação consistente de "acabamento suave" sem cair no lúdico.

- **6px** (`--radius-sm`): Botões pequenos (btn-xs), dropdown items.
- **8px** (`--radius-md`): Botões padrão, inputs, selects, textareas, avatares de 32px, sidebar nav items.
- **12px** (`--radius-lg`): Cards, tabelas, dropdown menus, toasts, stat cards.
- **16px** (`--radius-xl`): Modal, auth card, botões XL.
- **24px** (`--radius-2xl`): Elemento reserva para expansões futuras.
- **9999px** (`--radius-full`): Badges, pills, avatares.

Bordas: 1px sólida `--color-border` em cards, inputs, tabelas, modals, sidebars. Botões secondary têm borda de 1px. Botões primary/ghost não têm borda.

### Named Rules

**The 8px Default Rule.** Quando em dúvida sobre qual radius usar, use 8px. É o padrão do sistema para componentes interativos.

## Components

### Buttons

- **Shape:** Cantos suavemente curvados (8px). Botões maiores (btn-xl) usam 12px.
- **Sizes:** xs (4px padding, 12px font), sm (4px 12px), default (8px 16px), lg (12px 24px), xl (16px 32px, 12px radius), icon (8px, 36x36).

**Primary** (`btn-primary`): Fundo Vermelho Sinal (`#c81e1e`), texto branco. Elevação: shadow-xs em repouso, shadow-sm no hover (e fundo muda para `#b01018`).

**Secondary** (`btn-secondary`): Fundo branco, texto Cinza Ardósia (`#344054`), borda 1px `--color-border`. Hover: fundo `--color-gray-50`, borda `--color-border-strong`.

**Ghost** (`btn-ghost`): Sem fundo, texto `--color-gray-600`. Hover: fundo `--color-gray-100`, texto `--color-gray-700`.

**Danger** (`btn-danger`): Fundo `--color-error-600`, texto branco. Hover: fundo `--color-error-700`.

**Create** (`btn-create`): Fundo verde escuro (`--color-create-600`/`#14532d`), texto branco. Para "+ Criar novo" e ações de criação. Hover: fundo `--color-create-700`.

**Black** (`btn-black`): Fundo preto (`#0a0a0a`), texto branco. Exclusivo para CTA de login "Entrar". Hover: fundo `#1f1f1f`.

**Continue** (`btn-continue`): Outline verde. Fundo transparente, texto/borda `--color-create-600`. Hover: fundo `--color-create-600`, texto branco. Usado no wizard.

**Interação:** Botões têm overlay `::after` com `currentColor` a 5% opacidade no hover. No active, `scale(0.98)` para feedback tátil de pressionamento. Focus-visible: outline 2px `--color-focus-ring` com offset 2px. Disabled: opacidade 0.5, `pointer-events: none`.

### Inputs / Fields

- **Shape:** 8px radius, borda 1px `--color-border`, fundo branco, shadow-xs.
- **Label:** 14px, weight 500, cor `--color-gray-700`. Required asterisk em `--color-error-500`.
- **Padding:** 8px vertical, 12px horizontal.
- **Focus:** Borda muda para `--color-primary-500`, box-shadow glow 0 0 0 3px `--color-primary-100`.
- **Hover:** Borda muda para `--color-border-strong`.
- **Error:** Borda `--color-error-500`. Focus glow muda para `--color-error-100`.
- **Placeholder:** Cor `--color-text-placeholder` (`#98a2b3`), sem itálico.
- **Select:** Chevron SVG inline como background-image, padding extra à direita.

### Cards / Containers

- **Corner Style:** 12px radius.
- **Background:** Branco (`--color-surface`).
- **Border:** 1px `--color-border`.
- **Shadow:** Nenhuma em repouso. Sobe para `--shadow-md` no hover do card inteiro (cards clicáveis).
- **Sub-sections:** `card-header` (padding 20px 24px, borda inferior), `card-body` (padding 24px), `card-footer` (padding 16px 24px, fundo `--color-gray-25`, borda superior).
- **Stat Card:** Padding 24px, sem borda inferior. Label 14px medium secundário, valor 30px bold -0.02em letter-spacing, change indicator 14px com cor dinâmica (success/error).

### Badges / Chips

- **Style:** Pill shape (9999px radius), 2px vertical padding, 8px horizontal padding, 12px font, weight 500.
- **Variants:** gray (fundo `--color-gray-100`, texto `--color-gray-700`), primary (fundo `--color-primary-50`, texto `--color-primary-700`), success (fundo `--color-success-50`, texto `--color-success-700`), warning (fundo `--color-warning-50`, texto `--color-warning-600`), error (fundo `--color-error-50`, texto `--color-error-700`), dark (fundo `#111827`, texto branco — badge "Just In Time"), brand (fundo `#e31c23`, texto branco — badge "Único").
- **Dot variant:** `badge-dot` adiciona um círculo de 6px ::before na cor do texto.

### Navigation (Sidebar)

- **Style:** 260px fixa, branca, borda direita 1px. Header com logo (gradiente 135deg de `--color-primary-500` a `--color-primary-700` em caixa de 32px).
- **Typography:** 14px, weight 500. Seções têm label em 12px uppercase `--color-gray-400`.
- **Default state:** Texto `--color-gray-600`, sem fundo.
- **Hover:** Fundo `--color-gray-50`, texto `--color-gray-900`.
- **Active:** Fundo `--color-primary-50`, texto `--color-primary-700`.
- **Mobile:** Sidebar se sobrepõe com overlay, botão close visível, transição de transform.

### Tables

- **Container:** 1px border, 12px radius, overflow-x auto.
- **Header:** Fundo `--color-gray-50`, texto 12px uppercase 0.05em tracking secondary, padding 12px 24px.
- **Cells:** Padding 16px 24px, borda inferior 1px. Última linha sem borda.
- **Rows:** Hover com fundo `--color-gray-25`.
- **Typography:** 14px corpo, 12px header.

### Tabs

- **Style:** Horizontal row com borda inferior de 1px `--color-border`.
- **Tab:** Padding 12px 16px, 14px medium. Cor secondary em repouso, muda para `--color-primary-600` com borda inferior de 2px no active.
- **Hover:** Cor `--color-gray-700`, borda inferior `--color-gray-300`.

### Modal

- **Overlay:** Fixed inset, rgba(10,10,10,0.4), backdrop-filter blur(4px), fadeIn animation.
- **Dialog:** Fundo branco, 16px radius, shadow-2xl, max-width 520px, max-height 90vh. Entrada com slideUp + spring easing (cubic-bezier(0.34, 1.56, 0.64, 1)).
- **Header:** Padding 20px 24px, borda inferior. Título 18px semibold.
- **Body:** Padding 24px.
- **Footer:** Flex-end row com gap 12px, padding 16px 24px, borda superior.

### Toast / Notification

- **Position:** Fixed bottom-right (24px), z-index 1500. Pilha vertical com gap 12px.
- **Style:** Fundo branco, borda 1px, 12px radius, shadow-lg. Min-width 320px, max-width 420px. Entrada com slideInRight animation.

### Dropdown

- **Position:** Absolute abaixo do trigger, right-aligned. Min-width 200px.
- **Style:** Fundo branco, borda 1px, 12px radius, shadow-lg. Padding interno 4px.
- **Item:** Flex com gap 8px, padding 8px 12px, 14px, radius 6px. Hover: `--color-gray-50`. Variante danger: texto `--color-error-600`.
- **Divider:** 1px `--color-border`, margem 4px vertical.

### Empty State

- **Layout:** Flex column centralizado, padding 64px 24px.
- **Icon:** 48px, cor `--color-gray-400`, margem inferior 16px.
- **Title:** 18px semibold, margem inferior 8px.
- **Description:** 14px, cor terciária, max-width 360px, margem inferior 24px.

### Avatar

- **Shape:** Completamente circular (9999px).
- **Default:** Fundo `--color-primary-100`, texto `--color-primary-700`, iniciais em weight 500.
- **Sizes:** sm (28px, 12px), md (36px, 14px), lg (48px, 16px), xl (64px, 20px).
- **Image:** Object-fit cover preenche o círculo.

### Skeleton / Loading

- **Shape:** 8px radius, shimmer animation (1.5s ease-in-out infinite).
- **Gradient:** 90deg de `--color-gray-100` (25%) a `--color-gray-200` (50%) e volta.
- **Spinner:** 20px, borda 2px, `--color-gray-200` com top `--color-primary-600`. Animação spin 0.6s linear infinite.

## Animation

### Transitions
- **Fast:** 150ms cubic-bezier(0.4, 0, 0.2, 1) — hover de botão, hover de input.
- **Base:** 200ms cubic-bezier(0.4, 0, 0.2, 1) — hover de card, transições de cor.
- **Slow:** 300ms cubic-bezier(0.4, 0, 0.2, 1) — sidebar mobile, entrada de modal.

### Keyframe Animations
- **fadeIn** (0→1 opacity): Overlay de modal, dropdown menu, toast.
- **slideUp** (0→1 opacity + 16px→0 Y): Modal dialog, auth card, elementos que entram de baixo.
- **slideDown** (0→1 opacity + -16px→0 Y): Mensagens de erro/sucesso auth.
- **slideInRight** (0→1 opacity + 24px→0 X): Toast notifications.
- **pulse** (1→0.5→1): Loading states.
- **spin** (360° rotate): Spinner.
- **skeleton-shimmer** (background-position 200%→-200%): Skeleton loading.

## Do's and Don'ts

### Do:
- **Do** usar `--color-primary-600` para o botão primário padrão e `--color-primary-700` para hover.
- **Do** usar o card .card-body com padding de 24px para conteúdo principal, .card-header e .card-footer conforme a necessidade.
- **Do** usar shadow-xs em botões em repouso, shadow-sm em hover.
- **Do** usar o sistema de 4 tamanhos de fonte no máximo por view.
- **Do** usar a escala --space-* para todo espaçamento — nunca valores arbitrários.
- **Do** usar o badge-dot para indicar status ao vivo.

### Don't:
- **Don't** usar o vermelho de marca para ações de criação (use verde "Create").
- **Don't** usar o vermelho de marca para mensagens de erro (use a paleta error/semantic).
- **Don't** criar sombras decorativas em elementos estáticos — depth só existe como resposta a estado.
- **Don't** usar placeholders em itálico.
- **Don't** usar font-weight abaixo de 400 para body text.
- **Don't** usar letter-spacing positivo em headings.
- **Don't** inventar cores que não estejam na paleta `--color-*` ou `--gablive-*`.
- **Don't** usar animação spring (cubic-bezier com overshoot) para elementos que não sejam modais — o bounce é reservado para entrada de dialog.