# Project Constitution
- System: Gablive (React frontend)
- Focus: Vibe Code Audit

## Commit messages

Every commit MUST include a "How to test" section in the body:
- Live URL to open and verify the change
- Step-by-step what to click/check
- Test credentials if login is required
- Expected result for each step

Example:
  feat: Add user registration form

  How to test:
  - Open https://myapp.vercel.app/register
  - Fill in email/password, submit
  - Check that confirmation email arrives
  - Try submitting with invalid email — should show error
  - Login: test@example.com / demo123

---

## Tech stack

- React 19 + React Router 7 + Vite 6 (JS/JSX, not TypeScript)
- Supabase (Auth, Postgres + RLS, Realtime, Edge Functions in Deno)
- CSS custom properties (`src/styles/index.css`); Bootstrap **grid only**
- i18n: i18next (`pt-BR` default, `en`)
- Deploy: Vercel SPA rewrites (`vercel.json`)
- Tests: `node --test` (unit) + Playwright (`tests/e2e`)

## Run

- Dev: `npm run dev` → http://localhost:3000
- Lint: `npm run lint`
- Unit: `npm run test:unit`
- E2E critical: `npm run test:e2e:critical`
- Build: `npm run build`
- Env: copy `.env.example` → `.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)

## Structure

- `src/pages/auth` — login / register operator / password
- `src/pages/dashboard` — webinar CRUD, leads, analytics, settings
- `src/pages/public` — landing, `/register/:slug`, `/wait/:slug`, `/room/:slug`, `/replay/:slug`
- `src/hooks` + `src/lib` — data access and domain helpers
- `src/contexts` — `SupabaseProvider` → `AuthProvider` → `OrgProvider`
- `supabase/migrations` — numbered SQL, apply in order
- `supabase/functions` — server-only (service role, webhooks, email)

## Critical paths

1. Operator: `/auth/login` → `/webinars/create` → `/webinars/:id` → **Ver Página**
2. Participant: `/register/:slug` → `register_participant` RPC → wait/room with `?reg=<id>`
3. Already registered: `recover_registration` **re-sends email only** — never persist recovered `id` from email alone

Public reads go through SECURITY DEFINER RPCs (`get_public_webinar_by_slug`, `get_registration_by_id`). Do not `select()` a row the anon role cannot read.

## Conventions

- Files: PascalCase pages/components (`RegistrationPage.jsx`), camelCase hooks/libs (`useWebinar.js`)
- Commits: conventional (`feat:`, `fix:`, `refactor:`) + How to test
- Branches seen: `feat/…`, `fix/…`, `feature/…`
- Mutations return new objects; no silent `catch`
- Sanitize HTML with DOMPurify; user text via `sanitizeInput`
- Never put service-role keys in `VITE_*` or the client bundle
- New tables: RLS + `org_id` isolation. Prefer `gablive-rls-tenant` before shipping schema
- Registration/UTM/LGPD: `gablive-registration-funnel`
- Sales webhooks: `gablive-sales-integrations`
- LLM providers: `gablive-ai-agents`

## Where to look

| I want to… | Look at… |
|---|---|
| Change public signup | `src/pages/public/RegistrationPage.jsx`, `src/hooks/useRegistrationSubmit.js` |
| Change create webinar | `src/pages/dashboard/CreateWebinarPage.jsx`, `src/hooks/useWebinar.js` |
| Change room / video | `src/pages/public/WebinarRoomPage.jsx`, `src/lib/liveRoomState.js` |
| Add a SQL RPC | `supabase/migrations/` (next number) |
| Add a server secret | Edge Function, never `src/` |
| Add a unit test | `tests/unit/*.test.js` |
| Add an e2e | `tests/e2e/specs/critical/` + page objects in `tests/e2e/pages/` |
