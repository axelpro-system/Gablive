-- Recuperada de supabase_migrations.schema_migrations em 2026-09-24:
-- aplicada no projeto remoto sem arquivo no repositório. Conteúdo como está no banco.

-- ============================================
-- 018 â€” Corrige handle_new_user(): search_path ausente
-- ============================================
-- Bug: signup falhava com "Database error saving new user" (500).
-- Causa raiz: o role supabase_auth_admin (usado pelo GoTrue ao inserir em
-- auth.users, o que dispara on_auth_user_created) roda com
-- search_path=auth apenas (endurecimento de seguranÃ§a da prÃ³pria
-- plataforma Supabase). handle_new_user() nunca definiu seu prÃ³prio
-- search_path, entÃ£o ao executar sob esse role ela nÃ£o conseguia
-- resolver `organizations`, `profiles` (schema public) nem
-- `uuid_generate_v4()` (schema extensions), derrubando a transaÃ§Ã£o
-- inteira do INSERT em auth.users.
--
-- Fix: toda funÃ§Ã£o SECURITY DEFINER deve fixar seu prÃ³prio search_path
-- (tambÃ©m Ã© a prÃ¡tica recomendada de seguranÃ§a, evita search_path
-- hijacking) â€” mesmo padrÃ£o jÃ¡ usado em get_registration_by_id,
-- check_registration_email, mark_registration_attended (005) etc.
-- ============================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_org_id UUID;
  user_name TEXT;
  user_org_name TEXT;
BEGIN
  user_name := COALESCE(NEW.raw_user_meta_data->>'name', 'User');
  user_org_name := COALESCE(NEW.raw_user_meta_data->>'org_name', user_name || '''s Org');

  -- Create organization
  INSERT INTO organizations (name, slug, owner_id)
  VALUES (
    user_org_name,
    LOWER(REPLACE(user_org_name, ' ', '-')) || '-' || SUBSTRING(NEW.id::text, 1, 8),
    NEW.id
  )
  RETURNING id INTO new_org_id;

  -- Create profile with email
  INSERT INTO profiles (user_id, org_id, role, display_name, email)
  VALUES (NEW.id, new_org_id, 'presenter', user_name, NEW.email);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;
