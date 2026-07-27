# Spec: qa-crm-domain

Scope: feature

# Q&A, CRM Adapter, and Custom Domain — Implementation Spec

## Overview

Three independent features to close competitive gaps in Gablive. Ordered by dependency (each can be done independently).

## Feature 1: Q&A Section

### Problem
Participants have no dedicated way to ask questions. Questions get lost in general chat. Presenters have no way to moderate, answer, or mark questions as resolved. Present in every competitor (Zoom, Livestorm, Demio, GoToWebinar, WebinarJam, BigMarker, eWebinar, Zoho).

### Database (Migration 003)

```sql
CREATE TABLE qa_questions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webinar_id    UUID NOT NULL REFERENCES webinars(id) ON DELETE CASCADE,
  registration_id UUID REFERENCES registrations(id) ON DELETE SET NULL,
  attendee_name TEXT NOT NULL DEFAULT 'Anônimo',
  question      TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'answered', 'archived')),
  answer        TEXT,
  upvotes       INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  answered_at   TIMESTAMPTZ
);

-- Index for webinar scoping
CREATE INDEX idx_qa_questions_webinar ON qa_questions(webinar_id, created_at DESC);

-- RLS
ALTER TABLE qa_questions ENABLE ROW LEVEL SECURITY;

-- Attendees can insert questions (anyone with registration)
CREATE POLICY "Anyone can insert questions"
  ON qa_questions FOR INSERT
  WITH CHECK (true);

-- Anyone can read questions for a webinar (used in room)
CREATE POLICY "Anyone can read questions"
  ON qa_questions FOR SELECT
  USING (true);

-- Only webinar owner (via org) can update (answer, archive)
CREATE POLICY "Webinar owner can update"
  ON qa_questions FOR UPDATE
  USING (
    webinar_id IN (
      SELECT id FROM webinars WHERE org_id = (
        SELECT org_id FROM profiles WHERE user_id = auth.uid()
      )
    )
  );

-- Enable Realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE qa_questions;
```

### Components

1. **`src/hooks/useQa.js`** — Modeled after `useChat.js`
   - `useQa(webinarId)` fetches existing questions, subscribes to Realtime INSERT/UPDATE
   - `askQuestion(webinarId, question, attendeeName)` — inserts question
   - `upvoteQuestion(questionId)` — increments upvotes
   - `answerQuestion(questionId, answer)` — presenter action (update status, set answer)
   - `archiveQuestion(questionId)` — presenter action
   - Returns `{ questions, loading, askQuestion, upvoteQuestion, answerQuestion, archiveQuestion }`

2. **Q&A Tab in WebinarRoomPage** (attendee view)
   - New tab button `#room-qa-tab` in the interaction tabs (after polls)
   - Shows when presenter has Q&A enabled (config toggle default = on)
   - Two sub-views:
     - **Ask a Question**: text input + submit button, shown to all attendees
     - **Questions List**: shows questions sorted by upvotes DESC, with answered questions marked (green check + answer text)
   - Upvote button on each question
   - Count badge on tab showing unanswered questions count

3. **Q&A Dashboard in InteractionsEditor**
   - New sub-tab `'qa'` in InteractionsEditor (alongside chat, cta, polls, sales, audience)
   - Lists all questions for the webinar in a moderation queue
   - Each question: text, from whom, upvotes, timestamp
   - Actions: Answer (opens text field), Archive (removes from active view)
   - Answered questions shown with their answer

4. **CSS** — `QaSection.css` (new) or inline in WebinarRoomPage.css

### i18n

Add to `pt-BR.json` and `en.json` under `qa:` namespace

## Feature 2: CRM Integration Adapter

### Problem
No CRM integration means leads don't flow automatically. Every competitor offers native HubSpot, Salesforce, ActiveCampaign, or Pipedrive adapters.

### Pattern: Adapter + Outbox (per backlog spec v2)

### Database (Migration 004)

```sql
CREATE TABLE crm_configs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider        TEXT NOT NULL CHECK (provider IN ('hubspot', 'activecampaign', 'pipedrive', 'mock')),
  enabled         BOOLEAN NOT NULL DEFAULT true,
  api_key_enc     TEXT,  -- encrypted, set via Edge Function only
  settings        JSONB NOT NULL DEFAULT '{}',
  -- per-event toggles
  sync_registration  BOOLEAN NOT NULL DEFAULT true,
  sync_attendance   BOOLEAN NOT NULL DEFAULT true,
  sync_cta_click    BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE crm_event_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider        TEXT NOT NULL,
  event_type      TEXT NOT NULL,
  payload         JSONB NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'sent', 'failed', 'mock')),
  error_message   TEXT,
  sent_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE crm_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_event_log ENABLE ROW LEVEL SECURITY;

-- Org members can manage their configs
CREATE POLICY "Org members manage crm_configs"
  ON crm_configs FOR ALL
  USING (org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Org members view event_log"
  ON crm_event_log FOR SELECT
  USING (org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid()));
```

### Architecture

```
src/lib/crm/
  adapter.js          → CrmAdapter base interface
  hubspot.js          → HubSpotAdapter (transport)
  activecampaign.js   → ActiveCampaignAdapter
  pipedrive.js        → PipedriveAdapter
  mock.js             → MockAdapter (logs to crm_event_log, no HTTP)
  registry.js         → getAdapter(provider, config) factory

supabase/functions/
  process-crm-queue/  → Edge Function (cron) that processes pending crm_event_log
```

### Adapter Interface

```js
// adapter.js
export class CrmAdapter {
  constructor(config) { this.config = config; }
  async sendEvent(eventType, payload) { throw new Error('Not implemented'); }
  async testConnection() { throw new Error('Not implemented'); }
}
```

### Integration Points

CRM events fire from existing hooks/actions:
- **Registration**: After `registrations.insert` (via DB trigger or hook post-insert)
- **Attendance**: After initial page load in WebinarRoomPage / `analytics_events.insert`
- **CTA Click**: After `handleCtaClick` fires
- **Milestones**: After watch milestones fire (WATCH_15, WATCH_30, etc.)

### Configuration UI

New section in SettingsPage or new IntegrationsPage:
- Enable/disable per provider
- API key input (stored server-side via Edge Function)
- Per-event toggles
- Test connection button
- Event log viewer (last 50 events, status filter)

### Environment Variables

```
CRM_MODE=mock|live    (default: mock)
```

## Feature 3: Custom Domain / White-label

### Problem
Webinars run on Gablive's domain. Enterprise clients want their own domain. White-label removes "Powered by Gablive" branding.

### Database (Migration 005)

```sql
CREATE TABLE custom_domains (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  domain            TEXT NOT NULL UNIQUE,
  verification_txt  TEXT NOT NULL,  -- TXT record value to verify ownership
  verified          BOOLEAN NOT NULL DEFAULT false,
  ssl_status        TEXT NOT NULL DEFAULT 'pending'
                    CHECK (ssl_status IN ('pending', 'provisioning', 'active', 'failed')),
  ssl_error         TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  verified_at       TIMESTAMPTZ
);

-- Add white-label flag to organizations
ALTER TABLE organizations ADD COLUMN white_label BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE organizations ADD COLUMN white_label_logo_url TEXT;

-- RLS
ALTER TABLE custom_domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members manage custom_domains"
  ON custom_domains FOR ALL
  USING (org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid()));
```

### Architecture

```
supabase/functions/
  verify-domain/       → Edge Function: checks TXT record via DNS lookup
  provision-ssl/       → Edge Function: calls Vercel API to provision SSL
```

### Integration: Vercel Domain API

Vercel provides a REST API for domain management:
- `POST /v9/projects/{projectId}/domains` — add domain
- `GET /v9/projects/{projectId}/domains/{domain}/config` — check status
- Vercel handles SSL automatically (Let's Encrypt)
- SPA rewrites inherit from `vercel.json`

### Verification Flow

1. User enters domain in Settings → custom_domains page
2. System generates unique TXT record value `gablive-verify={uuid}`
3. User creates TXT record at their DNS provider
4. "Verify" button calls Edge Function → checks DNS → marks `verified=true`
5. Edge Function calls Vercel API to add domain
6. Vercel provisions SSL certificate (auto)
7. User configures CNAME to `cname.vercel-dns.com`

### White-label

- `organizations.white_label` flag + `white_label_logo_url`
- PublicLayout checks org white-label status; if true, hides "Powered by Gablive" and Gablive footer logos
- Registration page, wait room, replay page, webinar room all respect the flag
- Can only be enabled when custom domain is verified

### Settings UI

In SettingsPage, new "Domínio Personalizado" section:
- Current domain + verification status
- Input for new domain
- Instructions for DNS setup (TXT record + CNAME)
- Verify button
- SSL status indicator
- White-label toggle (enabled only when verified domain exists)

### Restrictions

- One custom domain per organization (enterprise tier)
- White-label requires verified custom domain
- Custom domain implies white-label (it's your domain, no Gablive branding)