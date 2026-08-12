-- ============================================
-- Fix: public registration INSERT was rejected by RLS in production
-- ("new row violates row-level security policy for table registrations"),
-- even though 001_initial_schema.sql defines a permissive INSERT policy.
-- The remote policy had drifted from what's versioned here — recreate it
-- explicitly so the DB matches the migration history again.
-- ============================================

DROP POLICY IF EXISTS "Anyone can register" ON registrations;

CREATE POLICY "Anyone can register"
  ON registrations FOR INSERT
  WITH CHECK (true);
