# Sales Provider Integrations, Live Webinar Fix, and Webinar Deletion Tasks

**Design**: `.specs/features/hotmart-live-delete/design.md`
**Status**: Draft

## Execution Plan

### Phase 1: Foundation

```text
T1 -> T2 -> T3
```

### Phase 2: Core Implementation

```text
T3 -> T4 -> T5 -> T6
T3 -> T7 -> T8
T3 -> T9 -> T10
```

### Phase 3: Verification and Hardening

```text
T6 + T8 + T10 -> T11 -> T12
```

## Task Breakdown

### T1: Add sales provider integration schema

**What**: Create migration for org-scoped provider integration status, product mappings, webhook events, indexes, unique idempotency constraints, and RLS.
**Depends on**: None
**Reuses**: Existing `org_id` RLS and migration style.
**Requirement**: PROVIDER-01, PROVIDER-03, PROVIDER-04
**Tools**: filesystem, Supabase CLI

**Done when**:

- [ ] Tables include `org_id`, `provider`, and foreign keys to organizations/webinars.
- [ ] Secrets are represented by refs/encrypted storage, not public text returned by client reads.
- [ ] Unique constraint prevents duplicate provider transaction/event processing.
- [ ] RLS allows org members to manage only their own integration rows.
- [ ] Gate check passes: `npm run build`.

**Tests**: migration/integration where local Supabase is available; otherwise schema review plus build.
**Gate**: build

### T2: Add provider adapter and live helper unit seams

**What**: Add pure helpers for provider payload normalization, provider webhook validation, idempotency extraction, live room state, and video embed URL parsing.
**Depends on**: T1
**Reuses**: Existing constants for webinar type/status.
**Requirement**: PROVIDER-03, LIVE-01
**Tools**: filesystem

**Done when**:

- [ ] Hotmart adapter normalizes event type, transaction id, product id, buyer email, and raw payload.
- [ ] Selflux/SellFlux adapter normalizes confirmed payload fields, or includes a documented `SPEC_DEVIATION` if payload docs are unavailable.
- [ ] Provider secret validation handles missing/mismatched token/API key/signature deterministically.
- [ ] Live helper returns waiting/player/ended/unavailable states.
- [ ] Embed helper supports existing YouTube/Vimeo patterns.
- [ ] Unit tests cover all helper branches.
- [ ] Gate check passes: `npm run test:unit`.

**Tests**: unit
**Gate**: unit

### T3: Add server function for saving/testing provider credentials

**What**: Implement authenticated server-side credential save/test endpoint for the current organization and selected provider.
**Depends on**: T1, T2
**Reuses**: Existing Supabase Edge Function patterns and organization membership checks.
**Requirement**: PROVIDER-01, PROVIDER-02
**Tools**: filesystem, official provider docs

**Done when**:

- [ ] Endpoint rejects unauthenticated requests.
- [ ] Endpoint verifies caller belongs to target org.
- [ ] Endpoint stores/rotates credentials without returning secret values.
- [ ] Test mode calls the selected provider from server-side code only.
- [ ] Audit entry is written for credential update/test.
- [ ] Gate check passes: `npm run build`.

**Tests**: function/integration with mocked provider responses.
**Gate**: build

### T4: Add purchase webhook receiver

**What**: Implement public provider webhook Edge Function that validates provider secrets, normalizes payload, stores event, and enforces idempotency.
**Depends on**: T2, T3
**Reuses**: Existing Edge Function CORS/error structure.
**Requirement**: PROVIDER-03
**Tools**: filesystem, official provider docs

**Done when**:

- [ ] Invalid provider secret/signature is rejected.
- [ ] Valid event is persisted with `provider` and `org_id`.
- [ ] Duplicate event returns success without double-processing.
- [ ] Malformed event is logged as failed/quarantined.
- [ ] Gate check passes: `npm run build`.

**Tests**: function/integration with mock POST payloads.
**Gate**: build

### T5: Add provider product mapping UI

**What**: Add dashboard UI for enabling Hotmart and Selflux/SellFlux integrations, viewing webhook setup instructions, testing credentials, and mapping provider product/offer ids to webinars.
**Depends on**: T3
**Reuses**: Existing settings/editor form patterns and org context.
**Requirement**: PROVIDER-01, PROVIDER-02, PROVIDER-04
**Tools**: filesystem, frontend-patterns

**Done when**:

- [ ] UI never displays saved secrets.
- [ ] Admin can save/test credentials with loading/error/success states.
- [ ] Admin can create/update/disable product mappings per provider.
- [ ] Mapping dropdown only lists current org webinars.
- [ ] Gate check passes: `npm run lint`.

**Tests**: component/manual plus e2e if route is covered.
**Gate**: lint

### T6: Connect provider events to analytics

**What**: Attribute mapped approved purchases to the webinar analytics/conversion model.
**Depends on**: T4, T5
**Reuses**: Existing `analytics_events` and dashboard analytics patterns.
**Requirement**: PROVIDER-04
**Tools**: filesystem

**Done when**:

- [ ] Mapped approved purchase creates one conversion/sale analytics event.
- [ ] Unmapped purchase remains stored but does not alter webinar analytics.
- [ ] Duplicate purchase does not double-count.
- [ ] Gate check passes: `npm run test:unit`.

**Tests**: unit/integration around mapping and idempotency.
**Gate**: unit

### T7: Fix live room state

**What**: Replace inline scheduled/live conditionals in public room/wait flow with the live-state helper.
**Depends on**: T2
**Reuses**: Existing room, wait room, registration flow, countdown hook.
**Requirement**: LIVE-01
**Tools**: filesystem

**Done when**:

- [ ] `status=live` renders player.
- [ ] `type=live`, `status=scheduled`, `scheduled_at<=now` renders player.
- [ ] Future scheduled live renders waiting countdown.
- [ ] Ended live does not present as live.
- [ ] Unsupported video URL shows unavailable state.
- [ ] Gate check passes: `npm run test:unit`.

**Tests**: unit plus browser/manual room check.
**Gate**: unit

### T8: Add manual start/end live controls

**What**: Add dashboard controls to start and end live webinars with audit logging.
**Depends on**: T7
**Reuses**: Existing editor header actions and update/audit patterns.
**Requirement**: LIVE-02
**Tools**: filesystem

**Done when**:

- [ ] Live-type webinar shows start/end controls in valid states.
- [ ] Start sets status to `live` and updates public room behavior.
- [ ] End sets status to `ended`.
- [ ] Both actions create audit entries.
- [ ] Gate check passes: `npm run lint`.

**Tests**: e2e/manual plus focused unit if helper logic is added.
**Gate**: lint

### T9: Centralize webinar deletion

**What**: Replace direct UI deletes with a scoped delete action that confirms by title, deletes by current org, handles error/success, and writes audit.
**Depends on**: T1
**Reuses**: Existing delete helper and audit helper.
**Requirement**: DELETE-01
**Tools**: filesystem

**Done when**:

- [ ] List page uses centralized delete action instead of raw table delete.
- [ ] Delete query scopes by webinar id and current org.
- [ ] Success refreshes list.
- [ ] Failure keeps item visible and shows an error.
- [ ] Gate check passes: `npm run lint`.

**Tests**: unit/manual.
**Gate**: lint

### T10: Add delete action to edit page

**What**: Add delete button to the webinar edit page with confirmation and navigation back to list after success.
**Depends on**: T9
**Reuses**: Centralized delete action.
**Requirement**: DELETE-01
**Tools**: filesystem

**Done when**:

- [ ] Edit page has a visible destructive delete action.
- [ ] Confirmation includes webinar title.
- [ ] Cancel does nothing.
- [ ] Success navigates to `/webinars`.
- [ ] Gate check passes: `npm run lint`.

**Tests**: e2e/manual.
**Gate**: lint

### T11: Add/extend E2E coverage

**What**: Cover the critical user paths: configure Hotmart/Selflux mocks, start/end live, delete webinar.
**Depends on**: T6, T8, T10
**Reuses**: Existing Playwright setup.
**Requirement**: PROVIDER-01, PROVIDER-03, LIVE-01, LIVE-02, DELETE-01
**Tools**: Playwright

**Done when**:

- [ ] E2E exercises dashboard integration states without real provider credentials.
- [ ] E2E confirms live state changes are visible.
- [ ] E2E confirms delete confirmation cancel/success.
- [ ] Gate check passes: `npm run test:e2e:critical` or documented fallback.

**Tests**: e2e
**Gate**: e2e

### T12: Final verification and docs

**What**: Run final lint/build/tests and document provider setup instructions.
**Depends on**: T11
**Reuses**: README/docs style.
**Requirement**: all
**Tools**: filesystem, Supabase CLI

**Done when**:

- [ ] `npm run lint` passes or only unrelated pre-existing warnings remain.
- [ ] `npm run build` passes.
- [ ] `npm run test:unit` passes.
- [ ] Hotmart setup docs include credential fields, webhook URL, Hottok, and sandbox guidance.
- [ ] Selflux/SellFlux setup docs include credential fields, webhook URL, API key/shared secret/signature guidance after confirmation.
- [ ] No secret is committed.

**Tests**: full gate
**Gate**: full

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1 | One provider schema/migration slice | OK |
| T2 | Pure provider/live helper seams plus co-located tests | OK |
| T3 | One provider credential server endpoint slice | OK |
| T4 | One provider webhook endpoint slice | OK |
| T5 | One provider settings/mapping UI slice | OK |
| T6 | One analytics attribution slice | OK |
| T7 | One public live-state replacement slice | OK |
| T8 | One editor live-controls slice | OK |
| T9 | One list deletion slice | OK |
| T10 | One edit deletion slice | OK |
| T11 | One E2E coverage slice | OK |
| T12 | One final verification/docs slice | OK |

## Diagram-Definition Cross-Check

| Task | Depends On | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | Foundation start | Match |
| T2 | T1 | T1 -> T2 | Match |
| T3 | T1, T2 | T2 -> T3 | Match |
| T4 | T2, T3 | T3 -> T4 | Match |
| T5 | T3 | T4 -> T5 in core flow, but T5 only requires T3 | Accepted: mapping UI can be built after server save/test; final attribution waits for T6 |
| T6 | T4, T5 | T5 -> T6 | Match |
| T7 | T2 | T3 -> T7 shown conservatively | Accepted: implementation can start after T2; phase groups after foundation |
| T8 | T7 | T7 -> T8 | Match |
| T9 | T1 | T3 -> T9 shown conservatively | Accepted: deletion can start after schema context; phase groups after foundation |
| T10 | T9 | T9 -> T10 | Match |
| T11 | T6, T8, T10 | T6 + T8 + T10 -> T11 | Match |
| T12 | T11 | T11 -> T12 | Match |

## Test Co-location Validation

| Task | Code Layer Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1 | Database schema | Migration/integration | migration/build | OK |
| T2 | Helpers | Unit | unit | OK |
| T3 | Edge Function | Function/integration | function/integration | OK |
| T4 | Edge Function | Function/integration | function/integration | OK |
| T5 | React dashboard UI | UI/e2e/manual | component/manual/e2e | OK |
| T6 | Analytics service/persistence | Unit/integration | unit/integration | OK |
| T7 | Public room UI/helper | Unit/e2e/manual | unit/manual | OK |
| T8 | Dashboard UI/mutation | UI/e2e/manual | e2e/manual/unit | OK |
| T9 | Dashboard delete action | Unit/manual | unit/manual | OK |
| T10 | Dashboard edit UI | UI/e2e/manual | e2e/manual | OK |
| T11 | E2E specs | E2E | e2e | OK |
| T12 | Docs/verification | Full gate | full gate | OK |

## Approval Checkpoints

- Approve testing seams before implementation.
- Approve issue tracker publishing before any external issue is created.
- Approve remote Supabase migration push before changing the linked project.
- Provide or confirm access to Hotmart and Selflux/SellFlux sandbox/test credentials before real credential tests.
- Confirm whether the provider should be displayed as "Selflux" or "SellFlux" in the UI. Internal key remains `selflux` unless changed before implementation.
