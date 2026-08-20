-- Embed the wait-room page template in the public webinar RPC so the
-- wait page can render theme/blocks without a world-readable SELECT on
-- page_templates.

CREATE OR REPLACE FUNCTION get_public_webinar_by_slug(p_slug TEXT)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT to_jsonb(w)
    || jsonb_build_object(
      'simulated_messages', COALESCE((
        SELECT jsonb_agg(to_jsonb(sm) ORDER BY sm.sort_order)
        FROM simulated_messages sm WHERE sm.webinar_id = w.id
      ), '[]'::jsonb),
      'cta_configs', COALESCE((
        SELECT jsonb_agg(to_jsonb(c) ORDER BY c.sort_order)
        FROM cta_configs c WHERE c.webinar_id = w.id
      ), '[]'::jsonb),
      'polls', COALESCE((
        SELECT jsonb_agg(
          to_jsonb(p) || jsonb_build_object(
            'poll_responses', COALESCE((
              SELECT jsonb_agg(jsonb_build_object('selected_option', pr.selected_option))
              FROM poll_responses pr WHERE pr.poll_id = p.id
            ), '[]'::jsonb)
          )
        )
        FROM polls p WHERE p.webinar_id = w.id
      ), '[]'::jsonb),
      'sales_notifications', COALESCE((
        SELECT jsonb_agg(to_jsonb(s) ORDER BY s.show_at_seconds)
        FROM sales_notifications s WHERE s.webinar_id = w.id
      ), '[]'::jsonb),
      'audience_configs', (
        SELECT to_jsonb(a)
        FROM audience_configs a WHERE a.webinar_id = w.id
        LIMIT 1
      ),
      'registration_pages', COALESCE((
        SELECT jsonb_agg(to_jsonb(rp))
        FROM registration_pages rp WHERE rp.webinar_id = w.id
      ), '[]'::jsonb),
      'login_customizations', (
        SELECT to_jsonb(lc)
        FROM login_customizations lc WHERE lc.webinar_id = w.id
        LIMIT 1
      ),
      'wait_page_template', (
        SELECT jsonb_build_object(
          'id', pt.id,
          'name', pt.name,
          'type', pt.type,
          'subtype', pt.subtype,
          'blocks', pt.blocks,
          'theme', pt.theme
        )
        FROM page_templates pt
        WHERE pt.id = w.wait_page_template_id
        LIMIT 1
      ),
      'registration_page_template', (
        SELECT jsonb_build_object(
          'id', rpt.id,
          'name', rpt.name,
          'type', rpt.type,
          'subtype', rpt.subtype,
          'blocks', rpt.blocks,
          'theme', rpt.theme
        )
        FROM page_templates rpt
        WHERE rpt.id = w.registration_page_template_id
        LIMIT 1
      ),
      'confirmed_registration_count', (
        SELECT count(*)::int
        FROM registrations r
        WHERE r.webinar_id = w.id
          AND COALESCE(r.waitlisted, false) = false
      )
    )
  FROM webinars w
  WHERE w.slug = p_slug
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION get_public_webinar_by_slug(TEXT) TO anon, authenticated;
