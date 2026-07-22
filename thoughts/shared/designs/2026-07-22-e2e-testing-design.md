---
date: 2026-07-22
topic: "E2E Testing with Playwright"
status: validated
---

## Problem Statement

The webinar-saas project has zero automated E2E tests. Bugs in critical user flows (registration, audience counter, chat, CTA) can go undetected until they reach production or are found during manual testing. The recent PostgREST relationship bug (audience_configs returning object vs array) is a case in point — it would have been caught by a well-placed E2E test.

We need a comprehensive but pragmatic E2E testing strategy that covers the highest-risk flows first, is fast to execute, and doesn't add significant maintenance burden.

## Constraints

- **Supabase-dependent app**: All data flows through Supabase (PostgREST REST API, Auth, Realtime). Tests must handle this dependency.
- **No test Supabase project yet**: Currently only one Supabase project (lgmtuabuuarxyfnhidbr) with production/staging data.
- **React SPA with React Router 7**: Client-side routing means tests must wait for URL changes, not page loads.
- **i18n (pt-BR, en)**: Translations load async from JSON files — tests need locale data available.
- **External embeds (YouTube/Vimeo)**: Video players load from third-party domains that won't work in test.
- **Realtime (WebSocket)**: Chat and live features use Supabase Realtime — needs special handling.

## Approach

**Chosen: Hybrid (Mock for public flows, Staging for auth/dashboard)**

I considered three approaches and chose the hybrid because:

- **Mock-only (Cenário 1)**: Too isolated — wouldn't catch RLS regressions or real API changes.
- **Staging-only (Cenário 2)**: Too slow and flaky — network-dependent, data pollution, auth token management.
- **Hybrid (Cenário 3)**: The pragmatic sweet spot. Public flows (registration, room, wait room) are mocked for speed and determinism. Auth and dashboard flows run against a real Supabase project to validate integration.

**Key insight:** The PostgREST relationship behavior (UNIQUE = object, no UNIQUE = array) is a design-level gotcha that mocks catch perfectly — we define exactly what the API returns and verify the frontend handles it correctly. This is the highest-value mock target.

## Architecture

### Test Directory Structure

```
webinar-saas/
└── tests/
    └── e2e/
        ├── fixtures/
        │   ├── supabase.ts       # page.route() interceptors for PostgREST
        │   ├── webinar.ts        # Factory functions for webinar data
        │   └── auth.ts           # Auth session fixtures (dashboard tests)
        ├── pages/
        │   ├── RegistrationPage.ts
        │   ├── WebinarRoomPage.ts
        │   ├── WaitRoomPage.ts
        │   ├── LoginPage.ts
        │   └── DashboardPage.ts
        ├── specs/
        │   ├── critical/
        │   │   ├── audience-counter.spec.ts
        │   │   ├── registration.spec.ts
        │   │   ├── chat-messages.spec.ts
        │   │   └── cta-banner.spec.ts
        │   ├── auth.spec.ts
        │   └── dashboard.spec.ts
        └── playwright.config.ts
```

### Data Flow (Mock Strategy)

For public flows, the test intercepts all Supabase API calls at the network level:

```
Test Action               Supabase URL Pattern                    Mock Response
──────────────────────────────────────────────────────────────────────────────────
Page load (fetch webinar)  POST rest/v1/rpc/get_webinar_by_slug?  { id, title, audience_configs: {...}, ... }
Registration submit       POST rest/v1/registrations              { id, ... }
Check existing reg        GET  rest/v1/registrations?email=...    [] (empty) or [{ id }]
Chat messages (realtime)  WebSocket                                Intercepted with static messages
CTA config                GET  rest/v1/cta_configs?webinar_id=... { ... }
YouTube player embed      GET  *.youtube.com/*                    204 (empty)
```

The interceptors live in `fixtures/supabase.ts` and are composable — each test declares what data it needs, the fixture wires up the routes.

## Components

### 1. Supabase Interceptor Fixture (`fixtures/supabase.ts`)

The core of the mock strategy. Three modes:

- **mockWebinarPage(page, data)**: Intercepts all routes needed for a public room page (webinar, registrations, chat, CTA, audience). Accepts a `WebinarPageData` object that mirrors what PostgREST returns — including the subtle object vs array behavior for UNIQUE relationships.
- **mockRegistrationPage(page, data)**: Same for the registration flow (webinar, registration_pages, login_customizations).
- **mockReplayPage(page, data)**: Same for replay (webinar + replay_access check).

Each interceptor:
1. Registers `page.route()` for each Supabase URL pattern
2. Returns the correct HTTP method + JSON body
3. Respects the object vs array distinction based on the table's constraints

### 2. Page Objects (POM)

Following the patterns from the reference:

- **RegistrationPage**: `goto(slug)`, `fillForm({name, email, phone})`, `submit()`, `isSuccessVisible()`
- **WebinarRoomPage**: `waitForPlayer()`, `getAudienceCount()`, `getChatMessages()`, `clickCTA()`
- **WaitRoomPage**: `waitForCountdown()`, `getAudienceCount()`
- **LoginPage**: `login(email, password)`, `isLoggedIn()`
- **DashboardPage**: `goto()`, `getWebinarCount()`, `getFirstWebinarName()`

### 3. Data Factories (`fixtures/webinar.ts`)

Pure functions that generate complete, type-safe mock data:

- `createWebinar(overrides?)`: Returns a full webinar object with sensible defaults + audience_configs, cta_configs, registration_pages, chat_messages
- `createAudienceConfig(overrides?)`: Returns either `{ mode: 'dynamic', current_count: 42 }` (object, not array) or `null`

The key design choice: `audience_configs` is typed as `object | null`, NOT as `object[]`, because PostgREST returns a single object for UNIQUE relationships. This is the exact bug we fixed — the factories force test authors to get this right.

## Data Flow

### Registration Flow (Mocked)

```
┌──────────┐    ┌──────────────┐    ┌──────────┐
│  Test     │    │  Playwright  │    │ Supabase │
│  Spec     │───▶│  Interceptor │◀───│  Mock    │
└──────────┘    └──────────────┘    └──────────┘
     │                                  │
     │  1. goto('/register/test-slug')  │
     │─────────────────────────────────▶│
     │  2. Intercept POST rpc/...       │
     │◀─────────────────────────────────│
     │  3. Return webinar + configs     │
     │                                  │
     │  4. fill form, click submit      │
     │─────────────────────────────────▶│
     │  5. Intercept POST registrations  │
     │◀─────────────────────────────────│
     │  6. Return { id: 'new-reg-id' }  │
     │                                  │
     │  7. Assert success visible       │
```

### Audience Counter Flow (Mocked)

```
┌──────────┐    ┌──────────────┐    ┌──────────┐
│  Test     │    │  Playwright  │    │ Supabase │
│  Spec     │───▶│  Interceptor │◀───│  Mock    │
└──────────┘    └──────────────┘    └──────────┘
     │                                  │
     │  1. goto('/room/test-slug')      │
     │─────────────────────────────────▶│
     │  2. Intercept webinar query      │
     │◀─────────────────────────────────│
     │  3. Return { audience_configs:   │
     │      { mode: 'dynamic', count } }│
     │                                  │
     │  4. Assert counter has count     │
     │  5. Assert .audience_configs     │
     │     accessed as OBJECT, not arr  │
```

## Error Handling

### Test-Level

- **Network failures**: `page.route()` calls that don't match throw clear errors like `No mock registered for URL: POST ...`
- **Missing fixture data**: TypeScript catches missing fields at compile time
- **Assertion failures**: Screenshot + trace captured automatically (configured in playwright.config.ts)

### Interceptor-Level

- Routes that don't match registered mocks **fail the test** (not silently pass) — prevents tests from hitting real APIs accidentally
- Each mock route logs its calls so test output shows exactly which Supabase endpoints were hit
- Async operations (Realtime) use `page.waitForResponse()` rather than `waitForTimeout`

### CI-Level

- Retry flaky tests twice before failing
- HTML report + screenshots + traces uploaded as artifacts
- Unexpected console errors (`page.on('pageerror')`) fail the test

## Testing Strategy

### Critical Flows (P1) — Always Run

These run on every PR and every push to main. They mock Supabase entirely and are fast (< 30s total):

1. **audience-counter.spec.ts**: Tests the exact bug we fixed — audience_configs as object, not array
2. **registration.spec.ts**: Complete registration flow with validation errors and success
3. **chat-messages.spec.ts**: Chat renders, simulated messages appear at correct timestamps
4. **cta-banner.spec.ts**: CTA appears at correct video time, handles pricing display

### Secondary Flows (P2) — Run nightly or on demand

These run against the staging Supabase project and verify real integration:

5. **auth.spec.ts**: Login, logout, register new account
6. **dashboard.spec.ts**: List webinars, navigate settings, analytics load
7. **webinar-crud.spec.ts**: Create webinar via wizard, edit, delete

### Test Isolation

Each test creates its own mock data — no shared state. Tests can run in parallel (fullyParallel: true). For staging tests, use `.only` or a separate project config.

## Open Questions

1. **Test Supabase project**: For the dashboard/auth tests (Cenário 3), we need a dedicated Supabase project or at least a seed that resets between runs. Options: (a) create `webinar-test` project, (b) use seed SQL in a test schema. Prefer (a) for isolation.
2. **Realtime mocks**: Supabase Realtime uses WebSocket connections. Playwright can't easily intercept WebSocket. Options: (a) mock at the HTTP level before the WS upgrade, (b) refactor chat to use a polling fallback in tests. Prefer (a) initially, revisit if flaky.
3. **Auth tokens**: For dashboard tests, we need a valid Supabase auth session. Options: (a) hardcoded test user + login via API, (b) inject the access_token directly into localStorage. Prefer (b) for speed.
4. **Video player**: YouTube/Vimeo embeds will fail or take too long. We'll mock them with `page.route('*youtube.com*', 204)` and test the player container, not the video content.
