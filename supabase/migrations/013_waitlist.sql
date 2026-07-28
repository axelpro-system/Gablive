CREATE TABLE IF NOT EXISTS public.waitlist_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  name TEXT,
  company TEXT,
  role TEXT,
  source TEXT NOT NULL DEFAULT 'landing-page',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT waitlist_email_format CHECK (
    char_length(email) BETWEEN 5 AND 254
    AND email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
  ),
  CONSTRAINT waitlist_name_length CHECK (name IS NULL OR char_length(name) <= 120),
  CONSTRAINT waitlist_company_length CHECK (company IS NULL OR char_length(company) <= 160),
  CONSTRAINT waitlist_role_length CHECK (role IS NULL OR char_length(role) <= 80)
);

CREATE UNIQUE INDEX IF NOT EXISTS waitlist_entries_email_unique
  ON public.waitlist_entries (lower(email));

ALTER TABLE public.waitlist_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can join the waitlist"
  ON public.waitlist_entries
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (source = 'landing-page');

REVOKE ALL ON public.waitlist_entries FROM anon, authenticated;
GRANT INSERT ON public.waitlist_entries TO anon, authenticated;

