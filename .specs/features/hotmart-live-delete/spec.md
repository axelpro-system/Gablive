# Sales Provider Integrations, Live Webinar Fix, and Webinar Deletion Specification

## Problem Statement

GabLive needs to integrate sales from Hotmart and Selflux/SellFlux without leaking credentials across organizations. Each organization must configure its own credentials per provider and receive only its own product/webinar events.

The live webinar flow is also fragile: public rooms can stay blocked when a live webinar is still `scheduled`, there is no clear seam to start/end live sessions, and the experience depends on manual status editing. The dashboard also needs a safe webinar deletion option with confirmation, organization isolation, and audit logging.

## Solution

Create a multi-provider sales integration foundation, starting with Hotmart and Selflux/SellFlux. Credentials are scoped to organization + provider and processed server-side through Supabase Edge Functions. The dashboard exposes provider configuration, product/offer mapping to webinars, and basic event history.

Fix live webinar availability by centralizing the room state calculation. A scheduled live webinar should open when the scheduled time has arrived or when an operator starts it manually.

Add safe webinar deletion in the list and edit page, reusing the audit pattern and preserving RLS boundaries.

## Goals

- [ ] Each organization can save and test its own Hotmart and Selflux/SellFlux credentials without exposing secrets in the frontend.
- [ ] Purchase events from Hotmart and Selflux/SellFlux are associated with the correct `org_id` and, when mapped, the correct webinar.
- [ ] Live webinars play correctly when they are due or in `live` status.
- [ ] Operators can start and end a live webinar manually.
- [ ] Operators can delete webinars with explicit confirmation, success/error feedback, and audit log.
- [ ] The changes preserve multi-tenant isolation and do not open public reads of internal data.

## User Stories

1. As an organization owner, I want to store my own sales provider credentials, so that my organization's integrations are isolated from other organizations.
2. As an organization owner, I want credential secrets hidden after saving, so that admins cannot accidentally expose production keys.
3. As an organization owner, I want to test provider credentials, so that I know the integration works before relying on webhooks.
4. As an organization owner, I want to rotate provider credentials, so that leaked or expired credentials can be replaced.
5. As an organization owner, I want to disable one provider integration, so that its webhooks stop affecting my organization without deleting historical data.
6. As an organization admin, I want provider-specific webhook setup instructions, so that I can configure Hotmart or Selflux/SellFlux correctly.
7. As an organization admin, I want to map provider products/offers to webinars, so that purchases can be attributed to the correct funnel.
8. As an organization admin, I want to choose which purchase events count as conversions, so that analytics reflect my sales process.
9. As an organization admin, I want duplicate provider events ignored safely, so that sales are not counted twice.
10. As an organization admin, I want failed provider events logged, so that I can diagnose integration issues.
11. As a webinar presenter, I want to start a scheduled live webinar manually, so that the room opens even if the scheduled time is wrong.
12. As a webinar presenter, I want to end a live webinar manually, so that attendees stop seeing it as active.
13. As an attendee, I want a scheduled live webinar to open when it is time, so that I do not stay stuck on the waiting screen.
14. As an attendee, I want a clear waiting state before a future live webinar starts, so that I know the webinar has not opened yet.
15. As an attendee, I want supported YouTube and Vimeo embeds to load reliably, so that I can watch without admin intervention.
16. As an organization admin, I want to delete a webinar from the list, so that obsolete funnels can be removed.
17. As an organization admin, I want to delete a webinar from the edit page, so that I can remove it while reviewing its settings.
18. As an organization admin, I want destructive confirmation with the webinar title, so that I do not delete the wrong webinar.
19. As an organization admin, I want deletion to remove dependent funnel data through existing cascade rules, so that orphan data is not left behind.
20. As an organization owner, I want deletion actions audited, so that I can review who deleted a webinar.
21. As a platform admin, I want sales integrations and deletion actions to respect organization boundaries, so that one tenant cannot affect another tenant.
22. As a developer, I want service-level seams around provider auth, webhook validation, live-state calculation, and deletion, so that behavior can be tested without relying on third-party services.

## Acceptance Criteria

### PROVIDER-01: Organization-scoped credentials

1. WHEN an authenticated org member saves Hotmart or Selflux/SellFlux credentials THEN the system SHALL store them linked to exactly one `org_id` and one provider key.
2. WHEN credentials are returned to the frontend THEN the system SHALL never return provider secrets such as `client_secret`, `basic_token`, `hottok`, API keys, or shared webhook secrets.
3. WHEN another organization queries settings THEN the system SHALL not expose credentials or mappings from other organizations.

### PROVIDER-02: Credential validation and rotation

1. WHEN an org member submits credentials THEN the system SHALL validate required fields for the selected provider before saving.
2. WHEN an org member tests credentials THEN the system SHALL call the selected provider from a server-only function and return a success/failure summary.
3. WHEN credentials are replaced THEN the system SHALL keep the new active credential version and not expose old secrets.

### PROVIDER-03: Webhook ingestion

1. WHEN a provider sends a purchase webhook THEN the system SHALL validate the configured provider secret before accepting the event.
2. WHEN a webhook is accepted THEN the system SHALL persist a normalized event with `provider`, `org_id`, raw payload, event type, transaction id, buyer email, product/offer id, status, and received timestamp.
3. WHEN the same transaction/event arrives twice THEN the system SHALL treat it as idempotent and not double-count.
4. WHEN no organization matches the webhook credential THEN the system SHALL reject or quarantine the event without assigning it to a random org.

### PROVIDER-04: Product/offer to webinar mapping

1. WHEN an org maps a provider product/offer to a webinar THEN the system SHALL require both records to belong to the same org.
2. WHEN a mapped purchase is approved THEN the system SHALL create or update conversion analytics for the mapped webinar.
3. WHEN a purchase does not match any mapping THEN the system SHALL store the event as unmapped for later diagnosis.

### LIVE-01: Live room availability

1. WHEN a webinar is `live` THEN the room SHALL render the video player.
2. WHEN a live-type webinar is `scheduled` and `scheduled_at` is in the past or now THEN the room SHALL render the video player instead of an indefinite waiting state.
3. WHEN a live-type webinar is `scheduled` and `scheduled_at` is in the future THEN the room SHALL render the waiting countdown.
4. WHEN a webinar has no supported video URL THEN the room SHALL show a clear video unavailable state.

### LIVE-02: Manual live controls

1. WHEN an org member opens the webinar editor THEN the system SHALL show start/end live controls for live-type webinars.
2. WHEN the user starts a live THEN the system SHALL set status to `live`, audit the action, and make the room playable.
3. WHEN the user ends a live THEN the system SHALL set status to `ended`, audit the action, and stop presenting it as live.

### DELETE-01: Safe webinar deletion

1. WHEN an org member clicks delete THEN the system SHALL show a confirmation with the webinar title.
2. WHEN deletion is confirmed THEN the system SHALL delete only webinars belonging to the current org.
3. WHEN deletion succeeds THEN the system SHALL refresh/navigate away and show a success state.
4. WHEN deletion fails THEN the system SHALL show a non-destructive error state.
5. WHEN deletion succeeds THEN the system SHALL write an audit event before or during the delete operation.

## Implementation Decisions

- Sales provider credentials are organization-level and provider-specific, not platform-level and not webinar-level.
- Supported initial provider keys are `hotmart` and `selflux`. UI naming must be confirmed as "Selflux" or "SellFlux" before implementation.
- Secrets are handled only by Supabase Edge Functions or database-side secure storage; they are never returned after save.
- The first provider scope is purchase/webhook ingestion and sales attribution. Full product catalog sync is out of scope unless needed only to test credentials.
- Provider behavior uses adapters. The shared flow handles storage, idempotency, mapping, and analytics; adapters handle provider-specific auth, webhook validation, normalization, and setup copy.
- Provider product mappings are explicit. The system does not infer webinar mapping from product names.
- Live room availability is calculated from `type`, `status`, `scheduled_at`, and current time through a reusable seam.
- Manual live controls update status through the existing Supabase mutation path and audit pattern.
- Webinar deletion uses existing cascade relationships and audit helper. It must not hard-delete an organization or user.

## Testing Decisions

- Tests verify externally observable behavior: accepted/rejected webhook, tenant isolation, live room state, visible buttons, confirmation behavior, and database changes.
- Unit tests cover provider payload normalization, idempotency key extraction, provider secret validation, live-state calculation, embed URL parsing, and deletion confirmation helpers.
- Integration-style tests cover Supabase Edge Functions where possible, using mock provider requests rather than real provider calls.
- E2E tests cover dashboard flows: configure integration, start/end live, delete webinar from list/editor.
- Existing commands available in this repo are `npm run test:unit`, `npm run test:e2e`, `npm run lint`, and `npm run build`.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Full provider product catalog sync UI | Not required for first working sales attribution. |
| Automatic attendee enrollment from provider purchase | Needs product/business rules beyond the current request. |
| Refund, chargeback, subscription lifecycle automation | Can be added after purchase ingestion is stable. |
| Billing or plan limits for GabLive organizations | Separate product scope. |
| Soft delete/archive for webinars | User asked for delete; archive is a separate behavior. |
| Live streaming infrastructure hosted by GabLive | Current product embeds YouTube/Vimeo URLs. |

## Further Notes

- Official Hotmart docs describe API credentials as `client_id`, `client_secret`, and Basic credentials created inside Hotmart, and recommend secure handling of API/Webhook credentials.
- Public SellFlux material describes REST API/Webhook integration and API Key authentication. The exact Selflux/SellFlux webhook payload and signature fields must be confirmed before implementation.
- Provider webhook payloads can evolve, so the implementation should keep a raw payload column for forward compatibility.
- Issue tracker publishing is not performed in this draft because no issue tracker target/label setup was confirmed in this session and posting externally requires explicit approval.

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| PROVIDER-01 | Organization-scoped credentials | Design | Pending |
| PROVIDER-02 | Credential validation and rotation | Design | Pending |
| PROVIDER-03 | Webhook ingestion | Design | Pending |
| PROVIDER-04 | Product/offer to webinar mapping | Design | Pending |
| LIVE-01 | Live room availability | Design | Pending |
| LIVE-02 | Manual live controls | Design | Pending |
| DELETE-01 | Safe webinar deletion | Design | Pending |

## Success Criteria

- [ ] A test org can save/test Hotmart and Selflux/SellFlux credentials without secrets appearing in browser payloads after save.
- [ ] Mock Hotmart and Selflux/SellFlux purchase webhooks each create exactly one normalized event and one mapped conversion.
- [ ] Duplicate webhooks do not double-count conversion.
- [ ] A scheduled live webinar with `scheduled_at <= now` opens the video player.
- [ ] Start/end live controls update room behavior.
- [ ] Delete from list and editor removes only the current org webinar and records audit.
