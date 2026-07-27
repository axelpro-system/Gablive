---
plan name: qa-crm-domain
plan description: Q&A, CRM adapter, custom domain
plan status: active
---

## Idea
Implement three competitive gap features: 1) Dedicated Q&A section in webinar room with moderation, 2) CRM integration adapter with mock mode and outbox pattern, 3) Custom domain/white-label with DNS verification flow. Each is independent and can be done sequentially.

## Implementation
- Feature 1 — Q&A: Create migration 003 with qa_questions table, RLS, and Realtime
- Feature 1 — Q&A: Create useQa.js hook (fetch, realtime subscribe, ask, upvote, answer, archive)
- Feature 1 — Q&A: Build Q&A attendee component (ask form, question list, upvote, status badges)
- Feature 1 — Q&A: Add Q&A tab to WebinarRoomPage sidebar (tab button, panel, mobile tab state)
- Feature 1 — Q&A: Add Q&A moderation sub-tab in InteractionsEditor (question list, answer, archive)
- Feature 1 — Q&A: Add CSS for Q&A components (qa-section.css)
- Feature 1 — Q&A: Add i18n entries (pt-BR, en) for all Q&A strings
- Feature 2 — CRM: Create migration 004 with crm_configs and crm_event_log tables + RLS
- Feature 2 — CRM: Create adapter base class and MockAdapter
- Feature 2 — CRM: Create CRM event emitter utility (fires from registration, attendance, CTA clicks)
- Feature 2 — CRM: Create CRM config UI (SettingsPage section for provider selection + toggles)
- Feature 2 — CRM: Create process-crm-queue Edge Function (cron-based outbox processor)
- Feature 2 — CRM: Wire CRM events into existing hooks (useRegistration, useCtaTiming, analytics)
- Feature 3 — Domain: Create migration 005 with custom_domains table + white-label columns on organizations
- Feature 3 — Domain: Create verify-domain Edge Function (DNS TXT record check)
- Feature 3 — Domain: Create custom domain settings UI in SettingsPage
- Feature 3 — Domain: Create white-label awareness in PublicLayout and public pages
- Verification: npm run build passes, manual flow testing for all three features

## Required Specs
<!-- SPECS_START -->
- qa-crm-domain
<!-- SPECS_END -->