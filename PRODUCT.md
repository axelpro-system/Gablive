# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary persona:** An independent marketing digital specialist or small-agency operator who creates sales funnel webinars for clients (or their own business). They are not a developer — they need a platform that turns viewers into buyers without writing code or assembling a tech stack.

**Secondary audience:** Agency account administrators who manage multiple client tenants from a single dashboard.

**Job to be done:** Launch a converting webinar in minutes, manage it end-to-end (registration → presentation → follow-up), and prove ROI through analytics.

## Product Purpose

Gablive is a multi-tenant webinar platform purpose-built for sales funnels. It lets creators build, run, and optimize live, recorded, and evergreen (Just-in-Time) webinars that convert viewers into customers — all from a single dashboard, without technical support.

Success means a solo marketing operator can:
1. Create a branded webinar page in under 5 minutes
2. Run it live, as a replay, or as an always-on JIT experience
3. Track conversion from registration through CTA click
4. Manage multiple client accounts with full data isolation

## Positioning

Gablive's meaningfully different position rests on three claims a general-purpose webinar tool cannot truthfully copy:

- **Multi-tenancy native for agencies** — each organization is fully isolated via Row-Level Security, not a shared workspace with labels. Agencies manage multiple client accounts from one login.
- **Conversion architecture, not just streaming** — CTAs, offers, polls, social proof, and audience simulation are timed to selling moments, not general engagement. Every feature exists to drive a purchase decision.
- **Evergreen (JIT) first** — the platform is designed around Just-in-Time webinars that start when a prospect arrives, not just scheduled live events. This makes it a perpetual conversion engine, not a one-time broadcast tool.

## Operating Context

- **User workflow:** Register → create organization → create webinar → customize pages → publish → participants register → attend (live, replay, or JIT) → analytics review
- **Languages:** pt-BR (primary), en (secondary), with automatic detection
- **Self-serve onboarding:** Full auth flow (register with auto org+profile creation, login, password reset)
- **Two surface groups:**
  - **Dashboard** (protected): webinar CRUD, page editor, analytics, settings, admin panel
  - **Public pages** (no auth): registration page, wait room, webinar room, replay
- **Multi-tenant model:** Each sign-up creates an organization; all data is isolated via PostgreSQL Row-Level Security. Cross-org data leaks are a critical failure mode.
- **Third-party services:** Supabase (Auth, DB, Realtime, Edge Functions), Resend (transactional emails), YouTube/Vimeo (video hosting), Vercel (hosting)
- **Dev environment:** Node.js, Vite dev server at port 3000, HMR, no test runner configured

## Capabilities and Constraints

### Confirmed capabilities

| Area | Capability |
|------|-----------|
| **Webinar types** | Live, recorded (YouTube/Vimeo), Just-in-Time (evergreen with wait room and configurable delay) |
| **Registration pages** | Block editor (hero, benefits, testimonials, form, countdown) with customizable themes |
| **CTAs / Offers** | Banners with original/promotional pricing, triggered by video timestamp |
| **Chat** | Real-time (Supabase Realtime); simulated messages pre-programmed and synced to video for replays |
| **Polls** | Create questions with multiple options, collect responses, view results |
| **Social proof** | "Someone just bought" notifications synced to video timeline |
| **Audience simulation** | Configurable "people watching" counter (fixed or dynamic) in the room |
| **Automated emails** | Confirmation, reminder (24h/1h/15min), replay available — sent via Resend + Supabase Edge Functions |
| **Analytics** | Registrations, attendance rate, CTA conversion, average watch time, assistance funnel |
| **Global dashboard** | Aggregated KPIs, funnel chart, donut chart, cross-webinar comparison |
| **Login customization** | Logo, progress bar, required fields, copy |
| **CSV export** | Download metrics per webinar |
| **Multi-tenant** | Full RLS isolation across all tables |
| **i18n** | pt-BR and en with automatic detection |
| **Auth** | Registration, login, password reset, role-based (admin/presenter/attendee) |
| **Security** | XSS sanitization, RLS on all tables, service-role keys server-side only |

### Technical constraints

| Constraint | Detail |
|------------|--------|
| **Frontend** | React 19, React Router 7, Vite 6 — no TypeScript (JS/JSX) |
| **Styling** | CSS Custom Properties (custom design system), no CSS framework |
| **Backend** | Supabase (Postgres, Auth, Realtime, Edge Functions in Deno) |
| **Hosting** | Vercel (SPA with rewrites) |
| **State management** | React contexts (`AuthContext`, `OrgContext`), custom hooks (`useWebinar`, `useChat`, `useAnalytics`, `useCountdown`) |
| **Dark mode** | Not implemented — light theme only |
| **Testing** | No test runner configured. Vitest adoption deferred |
| **Repository** | Private, all rights reserved |

### Terminology

- **Org** / **Organization** — a tenant (multi-tenant isolation unit)
- **JIT** — Just-in-Time (evergreen) webinar that starts when the participant arrives
- **Registration page** — the public landing page where prospects sign up
- **Wait room** — pre-event page shown before the webinar starts (countdown + audience counter)
- **Room** — the actual webinar experience (player + live chat)
- **Crewmates** — internal term for simulated audience/engagement features
- **Presenter** / **Operador** — webinar host role (maps to `presenter` in DB)
- **Attendee** / **Atendente** — participant role (maps to `attendee` in DB)

## Brand Commitments

- **Name:** Gablive
- **Mark:** Logo combining timeline, behavior curve, and conversion point. Logo family: `brand-identity/assets/logo.svg`, `logo-dark.svg`, `logo-mark.svg`, `logo-mark-dark.svg`
- **Primary color:** Brand red `#EF2B2D` / `#E31C23`
- **Neutral palette:** Ink `#101828`, Surface `#FCFCFD`
- **Design system tokens** extracted to `brand-identity/assets/brand-tokens.css` and merged into `src/styles/index.css` as `--gablive-*` custom properties
- **Favicon & OG:** Generated from logo mark, set in `index.html` with Open Graph and Twitter Card meta
- **Voice:** Not yet formally documented. Avoid inventing without user confirmation.

## Evidence on Hand

| Asset | Path |
|-------|------|
| Full feature catalog | `README.md` |
| Design system reference (HotWebinar-derived) | `specs/DESIGN-SYSTEM.md` (424 lines) |
| CSS token reference | `specs/tokens-reference.css` |
| v1 release plan | `specs/v1-PLAN.md` |
| v1.5/v2 backlog spec | `specs/backlog-v1.5-v2-SPEC.md` |
| Brand logo files (4 variants) | `brand-identity/assets/logo*.svg` |
| Brand token CSS | `brand-identity/assets/brand-tokens.css` |
| Screenshot reference (admin UI) | `.tmp/hotwebinar-scrape/screenshots/` |
| Deep screenshot reference | `.tmp/hotwebinar-scrape/deep/screenshots/` |

No real testimonials, customer quotes, case studies, or press mentions have been provided. Future visual work must not fabricate these.

## Product Principles

1. **Conversion over engagement.** Every feature exists to drive a purchase decision — CTAs, polls, social proof, audience simulation, timing. If a feature does not serve conversion, it does not belong in the core experience.
2. **Simplicity over power.** A solo marketing operator must be able to launch a converting webinar in minutes, without documentation, onboarding calls, or developer support. Depth is unlocked gradually, never required upfront.
3. **Multi-tenant isolation without concessions.** Each organization's data is strictly separated at the database level. Agency users manage multiple tenants from one session with zero risk of cross-org data exposure.

## Accessibility & Inclusion

No product-specific accessibility standard has been established. The incumbent implementation does not include explicit accessibility annotations or ARIA patterns. This is an undecided area for future work.