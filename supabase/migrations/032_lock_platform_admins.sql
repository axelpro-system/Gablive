-- SEGURANÇA: fecha a tabela platform_admins.
--
-- Estado encontrado no projeto em 2026-09-24:
--   * política "platform_admins_all" FOR ALL TO public USING (true), sem WITH CHECK;
--   * anon e authenticated com SELECT/INSERT/UPDATE/DELETE na tabela.
-- Com a chave anon (pública, vai no bundle do front), qualquer pessoa podia listar os
-- e-mails dos admins da plataforma e inserir, alterar ou apagar admins. Como o admin é
-- identificado pelo e-mail, isso permitia se promover a admin da plataforma.
--
-- Depois desta migration, só service_role (Edge Function admin-api) e funções
-- SECURITY DEFINER (ex.: is_platform_admin, migration 033) acessam a tabela.
-- O front-end não lê platform_admins diretamente.
--
-- Observação: o esquema real difere da migration 004 do repositório
-- (colunas reais: id, email, name, is_active, last_login_at, created_at; sem user_id).

DROP POLICY IF EXISTS "platform_admins_all" ON public.platform_admins;

-- Políticas da migration 004 (podem não existir no projeto); removidas para não reabrir acesso.
DROP POLICY IF EXISTS "Platform admins can view platform_admins" ON public.platform_admins;
DROP POLICY IF EXISTS "Platform admins can insert platform_admins" ON public.platform_admins;
DROP POLICY IF EXISTS "Platform admins can delete platform_admins" ON public.platform_admins;

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.platform_admins FROM anon, authenticated;
