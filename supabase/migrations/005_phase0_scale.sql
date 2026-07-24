-- ============================================
-- FASE 0 — Escala: indexes, analytics RPC, email attempts,
--           registrations RLS harden + public session helpers
-- Spec: specs/phase-0-1-conversion-scale-SPEC.md
-- ============================================

-- --------------------------------------------
-- INDEXES (analytics / registrations at volume)
-- --------------------------------------------
CREATE INDEX IF NOT EXISTS idx_analytics_events_webinar_type
  ON analytics_events (webinar_id, event_type);

CREATE INDEX IF NOT EXISTS idx_analytics_events_webinar_created
  ON analytics_events (webinar_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_registrations_webinar_attended
  ON registrations (webinar_id, attended);

CREATE INDEX IF NOT EXISTS idx_registrations_webinar_email_lower
  ON registrations (webinar_id, lower(email));

-- --------------------------------------------
-- EMAIL QUEUE: retry support
-- --------------------------------------------
ALTER TABLE email_queue
  ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0;

-- --------------------------------------------
-- GLOBAL SLUG uniqueness (skip if collisions exist)
-- --------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM webinars
    GROUP BY slug
    HAVING count(*) > 1
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE schemaname = 'public' AND indexname = 'idx_webinars_slug_global'
    ) THEN
      CREATE UNIQUE INDEX idx_webinars_slug_global ON webinars (slug);
    END IF;
  ELSE
    RAISE NOTICE '005_phase0_scale: slug collisions detected — skipped idx_webinars_slug_global';
  END IF;
END $$;

-- --------------------------------------------
-- REGISTRATIONS RLS: stop world-readable leads
-- --------------------------------------------
DROP POLICY IF EXISTS "View registrations" ON registrations;

CREATE POLICY "Org members can view registrations"
  ON registrations FOR SELECT
  USING (
    webinar_id IN (
      SELECT id FROM webinars
      WHERE org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
    )
  );

-- Public funnel needs: load one reg by id, check email exists, mark attended.
-- SECURITY DEFINER helpers (single-row / boolean) — no bulk list for anon.

CREATE OR REPLACE FUNCTION get_registration_by_id(p_id UUID)
RETURNS SETOF registrations
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM registrations WHERE id = p_id LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION check_registration_email(p_webinar_id UUID, p_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM registrations
    WHERE webinar_id = p_webinar_id
      AND lower(email) = lower(trim(p_email))
  );
$$;

CREATE OR REPLACE FUNCTION mark_registration_attended(p_id UUID)
RETURNS registrations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  row registrations;
BEGIN
  UPDATE registrations
  SET
    attended = true,
    attended_at = COALESCE(attended_at, now())
  WHERE id = p_id
  RETURNING * INTO row;

  RETURN row;
END;
$$;

GRANT EXECUTE ON FUNCTION get_registration_by_id(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION check_registration_email(UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION mark_registration_attended(UUID) TO anon, authenticated;

-- --------------------------------------------
-- get_webinar_stats — server-side aggregates (no max_rows trap)
-- --------------------------------------------
CREATE OR REPLACE FUNCTION get_webinar_stats(p_webinar_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  total_regs BIGINT;
  total_att BIGINT;
  cta_clicks BIGINT;
  cta_views BIGINT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM webinars w
    JOIN profiles p ON p.org_id = w.org_id
    WHERE w.id = p_webinar_id
      AND p.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT count(*) INTO total_regs
  FROM registrations WHERE webinar_id = p_webinar_id;

  SELECT count(*) INTO total_att
  FROM registrations WHERE webinar_id = p_webinar_id AND attended = true;

  SELECT count(*) INTO cta_clicks
  FROM analytics_events
  WHERE webinar_id = p_webinar_id AND event_type = 'cta_click';

  SELECT count(*) INTO cta_views
  FROM analytics_events
  WHERE webinar_id = p_webinar_id AND event_type = 'cta_view';

  SELECT jsonb_build_object(
    'total_registrations', total_regs,
    'total_attendees', total_att,
    'show_up_rate', CASE
      WHEN total_regs > 0 THEN round((total_att::numeric / total_regs::numeric) * 100, 1)
      ELSE 0
    END,
    'conversion_rate', CASE
      WHEN total_regs > 0 THEN round((total_att::numeric / total_regs::numeric) * 100)::int
      ELSE 0
    END,
    'cta_clicks', cta_clicks,
    'cta_views', cta_views,
    'cta_conversion', CASE
      WHEN cta_views > 0 THEN round((cta_clicks::numeric / cta_views::numeric) * 100, 1)
      ELSE 0
    END,
    'chat_messages', (
      SELECT count(*) FROM analytics_events
      WHERE webinar_id = p_webinar_id AND event_type = 'chat_message'
    ),
    'poll_responses', (
      SELECT count(*) FROM analytics_events
      WHERE webinar_id = p_webinar_id AND event_type = 'poll_response'
    ),
    'avg_watch_seconds', COALESCE((
      SELECT round(avg(max_sec))::int
      FROM (
        SELECT max(
          CASE
            WHEN (event_data->>'seconds') ~ '^[0-9]+(\.[0-9]+)?$'
            THEN (event_data->>'seconds')::numeric
            ELSE NULL
          END
        ) AS max_sec
        FROM analytics_events
        WHERE webinar_id = p_webinar_id
          AND event_type = 'video_progress'
        GROUP BY registration_id
      ) t
      WHERE max_sec IS NOT NULL
    ), 0),
    'webinar_entered', (
      SELECT count(DISTINCT registration_id) FROM analytics_events
      WHERE webinar_id = p_webinar_id
        AND event_type = 'webinar_entered'
        AND registration_id IS NOT NULL
    ),
    'watch_15', (
      SELECT count(DISTINCT registration_id) FROM analytics_events
      WHERE webinar_id = p_webinar_id
        AND event_type = 'watch_15'
        AND registration_id IS NOT NULL
    ),
    'watch_30', (
      SELECT count(DISTINCT registration_id) FROM analytics_events
      WHERE webinar_id = p_webinar_id
        AND event_type = 'watch_30'
        AND registration_id IS NOT NULL
    ),
    'watch_45', (
      SELECT count(DISTINCT registration_id) FROM analytics_events
      WHERE webinar_id = p_webinar_id
        AND event_type = 'watch_45'
        AND registration_id IS NOT NULL
    ),
    'watch_60', (
      SELECT count(DISTINCT registration_id) FROM analytics_events
      WHERE webinar_id = p_webinar_id
        AND event_type = 'watch_60'
        AND registration_id IS NOT NULL
    ),
    'pitch_reached', (
      SELECT count(DISTINCT registration_id) FROM analytics_events
      WHERE webinar_id = p_webinar_id
        AND event_type = 'pitch_reached'
        AND registration_id IS NOT NULL
    ),
    'offer_shown', (
      SELECT count(DISTINCT registration_id) FROM analytics_events
      WHERE webinar_id = p_webinar_id
        AND event_type = 'offer_shown'
        AND registration_id IS NOT NULL
    ),
    -- Phase 1 will fill from purchases; placeholders keep API stable
    'revenue_cents', 0,
    'purchases_count', 0
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_webinar_stats(UUID) TO authenticated;

-- --------------------------------------------
-- get_org_webinar_stats — per-webinar rows for global dashboard
-- --------------------------------------------
CREATE OR REPLACE FUNCTION get_org_webinar_stats(p_org_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  result JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT org_id INTO v_org_id
  FROM profiles
  WHERE user_id = auth.uid()
  LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  -- Optional arg must match caller's org (no cross-tenant)
  IF p_org_id IS NOT NULL AND p_org_id <> v_org_id THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(jsonb_agg(row_data ORDER BY sort_created DESC), '[]'::jsonb)
  INTO result
  FROM (
    SELECT
      w.created_at AS sort_created,
      jsonb_build_object(
        'webinar_id', w.id,
        'title', w.title,
        'type', w.type,
        'status', w.status,
        'scheduled_at', w.scheduled_at,
        'total_registrations', (
          SELECT count(*) FROM registrations r WHERE r.webinar_id = w.id
        ),
        'total_attendees', (
          SELECT count(*) FROM registrations r
          WHERE r.webinar_id = w.id AND r.attended = true
        ),
        'cta_clicks', (
          SELECT count(*) FROM analytics_events e
          WHERE e.webinar_id = w.id AND e.event_type = 'cta_click'
        ),
        'poll_responses', (
          SELECT count(*) FROM analytics_events e
          WHERE e.webinar_id = w.id AND e.event_type = 'poll_response'
        )
      ) AS row_data
    FROM webinars w
    WHERE w.org_id = v_org_id
  ) sub;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_org_webinar_stats(UUID) TO authenticated;

-- Overload without args (PostgREST / supabase.rpc convenience)
CREATE OR REPLACE FUNCTION get_org_webinar_stats()
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT get_org_webinar_stats(NULL);
$$;

GRANT EXECUTE ON FUNCTION get_org_webinar_stats() TO authenticated;
