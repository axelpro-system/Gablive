-- ============================================
-- WEBINAR SAAS — Fecha o vazamento cross-org do funil público
-- ============================================
-- Problema: as políticas de SELECT de `webinars` (OR true) e das tabelas do
-- funil (USING(true)) permitem que qualquer anônimo, com a anon key pública,
-- faça `SELECT *` e enumere webinars/ofertas/prova social de TODAS as orgs.
--
-- Correção (padrão já usado no 005 para `registrations`): expor o payload
-- público de UM webinar por slug via funções SECURITY DEFINER, e apertar as
-- políticas das tabelas para org-only. O anônimo deixa de conseguir enumerar
-- em massa; só lê um webinar de cada vez, por slug conhecido, via RPC.
--
-- NÃO altera `chat_messages` (realtime, público por natureza) — tratado à parte.
-- ============================================

-- --------------------------------------------
-- RPC: bundle público de UM webinar por slug
-- (webinar + tabelas-filhas necessárias às páginas públicas)
-- --------------------------------------------
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
            -- Só o suficiente para a contagem/resultado público; sem
            -- registration_id (não correlacionar participante ↔ voto).
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
      -- 1:1 (UNIQUE webinar_id) — objeto único ou null, como o embedded-select
      -- do PostgREST devolvia. Array quebraria audience_configs.mode /
      -- login_customizations.require_name nos consumidores.
      'audience_configs', (
        SELECT to_jsonb(a)
        FROM audience_configs a WHERE a.webinar_id = w.id
        LIMIT 1
      ),
      -- to-many (sem UNIQUE): array; consumidor usa registration_pages[0].
      'registration_pages', COALESCE((
        SELECT jsonb_agg(to_jsonb(rp))
        FROM registration_pages rp WHERE rp.webinar_id = w.id
      ), '[]'::jsonb),
      'login_customizations', (
        SELECT to_jsonb(lc)
        FROM login_customizations lc WHERE lc.webinar_id = w.id
        LIMIT 1
      )
    )
  FROM webinars w
  WHERE w.slug = p_slug
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION get_public_webinar_by_slug(TEXT) TO anon, authenticated;

-- --------------------------------------------
-- RPC: mensagens simuladas de UM webinar (usada pela sala/replay)
-- --------------------------------------------
CREATE OR REPLACE FUNCTION get_public_simulated_messages(p_webinar_id UUID)
RETURNS SETOF simulated_messages
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT * FROM simulated_messages
  WHERE webinar_id = p_webinar_id
  ORDER BY timestamp_seconds ASC;
$$;

GRANT EXECUTE ON FUNCTION get_public_simulated_messages(UUID) TO anon, authenticated;

-- --------------------------------------------
-- Aperta as políticas: remove leitura pública em massa (USING(true)).
-- As políticas "Org members can manage ... FOR ALL" já cobrem o SELECT
-- autenticado dos membros da org — o público agora passa pelas RPCs acima.
-- --------------------------------------------

-- webinars: remove o `OR true` da política de SELECT
DROP POLICY IF EXISTS "Org members can view webinars" ON webinars;
CREATE POLICY "Org members can view webinars"
  ON webinars FOR SELECT
  USING (org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid()));

-- registration_pages
DROP POLICY IF EXISTS "Public can view published pages" ON registration_pages;

-- simulated_messages
DROP POLICY IF EXISTS "Public can view simulated messages" ON simulated_messages;

-- cta_configs
DROP POLICY IF EXISTS "Public can view CTAs" ON cta_configs;

-- polls
DROP POLICY IF EXISTS "Public can view polls" ON polls;

-- poll_responses: não havia policy org-scoped (só USING(true)). Remove a
-- pública e cria uma para o dashboard ler os resultados; anon segue votando
-- via "Anyone can respond to polls" (INSERT) e lê resultados via a RPC bundle.
DROP POLICY IF EXISTS "View poll responses" ON poll_responses;
CREATE POLICY "Org members can view poll responses"
  ON poll_responses FOR SELECT
  USING (
    poll_id IN (
      SELECT id FROM polls
      WHERE webinar_id IN (
        SELECT id FROM webinars
        WHERE org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
      )
    )
  );

-- sales_notifications
DROP POLICY IF EXISTS "Public can view sales notifications" ON sales_notifications;

-- audience_configs
DROP POLICY IF EXISTS "Public can view audience config" ON audience_configs;

-- login_customizations
DROP POLICY IF EXISTS "Public can view login customization" ON login_customizations;
