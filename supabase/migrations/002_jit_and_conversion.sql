-- ============================================
-- WEBINAR SAAS — JIT, Oferta, Prova Social, Audiência, Login Customization
-- Fecha os gaps de MVP identificados vs. PRD (evergreen/Just-in-Time)
-- ============================================

-- ============================================
-- WEBINARS: slug público, Just-in-Time, sala de espera, apresentador
-- ============================================
ALTER TABLE webinars
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS is_just_in_time BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS use_wait_room BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS recurrence_type TEXT NOT NULL DEFAULT 'none' CHECK (recurrence_type IN ('none', 'daily', 'weekly')),
  ADD COLUMN IF NOT EXISTS session_duration_minutes INTEGER NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS presenter_name TEXT,
  ADD COLUMN IF NOT EXISTS presenter_avatar_url TEXT;

-- Backfill slug from id for existing rows so URLs keep working
UPDATE webinars SET slug = id::text WHERE slug IS NULL;

ALTER TABLE webinars ALTER COLUMN slug SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_webinars_org_slug ON webinars(org_id, slug);

-- ============================================
-- REGISTRATIONS: relógio individual da sessão (JIT)
-- ============================================
ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS session_start_at TIMESTAMPTZ;

-- ============================================
-- CTA CONFIGS (Oferta): preço, pitch, banners
-- ============================================
ALTER TABLE cta_configs
  ADD COLUMN IF NOT EXISTS original_price NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS sale_price NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS pitch_start_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS banner_desktop_url TEXT,
  ADD COLUMN IF NOT EXISTS banner_mobile_url TEXT;

-- ============================================
-- SALES NOTIFICATIONS (prova social de vendas)
-- ============================================
CREATE TABLE IF NOT EXISTS sales_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  webinar_id UUID NOT NULL REFERENCES webinars(id) ON DELETE CASCADE,
  buyer_name TEXT NOT NULL,
  buyer_location TEXT,
  product_name TEXT NOT NULL,
  show_at_seconds INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE sales_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view sales notifications"
  ON sales_notifications FOR SELECT
  USING (true);

CREATE POLICY "Org members can manage sales notifications"
  ON sales_notifications FOR ALL
  USING (
    webinar_id IN (
      SELECT id FROM webinars
      WHERE org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
    )
  );

CREATE INDEX IF NOT EXISTS idx_sales_notifications_webinar_id ON sales_notifications(webinar_id);

-- ============================================
-- AUDIENCE CONFIGS (contador de "pessoas na sala")
-- ============================================
CREATE TABLE IF NOT EXISTS audience_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  webinar_id UUID NOT NULL UNIQUE REFERENCES webinars(id) ON DELETE CASCADE,
  mode TEXT NOT NULL DEFAULT 'dynamic' CHECK (mode IN ('none', 'fixed', 'dynamic')),
  fixed_count INTEGER NOT NULL DEFAULT 42,
  dynamic_min INTEGER NOT NULL DEFAULT 15,
  dynamic_max INTEGER NOT NULL DEFAULT 80,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE audience_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view audience config"
  ON audience_configs FOR SELECT
  USING (true);

CREATE POLICY "Org members can manage audience config"
  ON audience_configs FOR ALL
  USING (
    webinar_id IN (
      SELECT id FROM webinars
      WHERE org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
    )
  );

-- ============================================
-- LOGIN CUSTOMIZATIONS (tela de entrada da sala/registro)
-- ============================================
CREATE TABLE IF NOT EXISTS login_customizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  webinar_id UUID NOT NULL UNIQUE REFERENCES webinars(id) ON DELETE CASCADE,
  logo_url TEXT,
  show_progress_bar BOOLEAN NOT NULL DEFAULT true,
  progress_bar_color TEXT NOT NULL DEFAULT '#3366ff',
  button_text TEXT NOT NULL DEFAULT 'Assistir Transmissão',
  require_name BOOLEAN NOT NULL DEFAULT true,
  require_email BOOLEAN NOT NULL DEFAULT true,
  require_phone BOOLEAN NOT NULL DEFAULT false,
  name_placeholder TEXT NOT NULL DEFAULT 'Seu nome completo',
  email_placeholder TEXT NOT NULL DEFAULT 'Seu melhor e-mail',
  phone_placeholder TEXT NOT NULL DEFAULT 'WhatsApp com DDD',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE login_customizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view login customization"
  ON login_customizations FOR SELECT
  USING (true);

CREATE POLICY "Org members can manage login customization"
  ON login_customizations FOR ALL
  USING (
    webinar_id IN (
      SELECT id FROM webinars
      WHERE org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
    )
  );

-- ============================================
-- Defaults para webinars já existentes
-- ============================================
INSERT INTO audience_configs (webinar_id)
SELECT id FROM webinars
ON CONFLICT (webinar_id) DO NOTHING;

INSERT INTO login_customizations (webinar_id)
SELECT id FROM webinars
ON CONFLICT (webinar_id) DO NOTHING;
