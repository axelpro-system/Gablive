-- ============================================
-- WEBINAR SAAS — Fecha o vazamento cross-org (PARTE 2/2: contract)
-- ============================================
-- APLICAR SÓ DEPOIS de:
--   (1) a migration 008 (funções RPC) estar no banco, e
--   (2) o frontend com RPC estar no ar em produção.
-- Para ativar: renomeie este arquivo removendo o sufixo ".pending"
--   (008_...sql / 009_tighten_public_rls.sql) e rode `supabase db push`.
--
-- Remove a leitura pública em massa (USING(true)). As políticas
-- "Org members can manage ... FOR ALL" já cobrem o SELECT autenticado dos
-- membros da org — o público passa a ler só via as RPCs SECURITY DEFINER.
-- ============================================

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
