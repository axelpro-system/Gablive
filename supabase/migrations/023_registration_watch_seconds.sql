-- Per-lead and aggregate time-in-room from analytics_events.
-- Watch seconds = greater of:
--   * furthest video_progress position
--   * wall-clock span between first and last event (dwell)

CREATE OR REPLACE FUNCTION get_registration_watch_seconds(p_registration_ids UUID[])
RETURNS TABLE (registration_id UUID, watch_seconds INTEGER)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    e.registration_id,
    GREATEST(
      COALESCE(round(max(
        CASE
          WHEN e.event_type = 'video_progress'
            AND (e.event_data->>'seconds') ~ '^[0-9]+(\.[0-9]+)?$'
          THEN (e.event_data->>'seconds')::numeric
          ELSE NULL
        END
      )), 0),
      COALESCE(EXTRACT(EPOCH FROM (max(e.created_at) - min(e.created_at))), 0)
    )::int AS watch_seconds
  FROM analytics_events e
  JOIN registrations r ON r.id = e.registration_id
  JOIN webinars w ON w.id = r.webinar_id
  JOIN profiles p ON p.org_id = w.org_id AND p.user_id = auth.uid()
  WHERE e.registration_id = ANY(p_registration_ids)
  GROUP BY e.registration_id;
$$;

CREATE OR REPLACE FUNCTION get_webinars_avg_watch_seconds(p_webinar_ids UUID[])
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(round(avg(watch_seconds))::int, 0)
  FROM (
    SELECT GREATEST(
      COALESCE(round(max(
        CASE
          WHEN e.event_type = 'video_progress'
            AND (e.event_data->>'seconds') ~ '^[0-9]+(\.[0-9]+)?$'
          THEN (e.event_data->>'seconds')::numeric
          ELSE NULL
        END
      )), 0),
      COALESCE(EXTRACT(EPOCH FROM (max(e.created_at) - min(e.created_at))), 0)
    )::int AS watch_seconds
    FROM analytics_events e
    JOIN webinars w ON w.id = e.webinar_id
    JOIN profiles p ON p.org_id = w.org_id AND p.user_id = auth.uid()
    WHERE e.webinar_id = ANY(p_webinar_ids)
      AND e.registration_id IS NOT NULL
    GROUP BY e.registration_id
  ) t;
$$;

GRANT EXECUTE ON FUNCTION get_registration_watch_seconds(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_webinars_avg_watch_seconds(UUID[]) TO authenticated;
