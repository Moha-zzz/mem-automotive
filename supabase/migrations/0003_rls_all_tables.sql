-- =============================================================
-- MEM AUTOMOTIVE — RLS sur les 15 tables
-- À exécuter dans Supabase Dashboard → SQL Editor
-- APRÈS avoir activé Email/Password dans Authentication → Providers
-- =============================================================

-- 1. Activer RLS sur toutes les tables
ALTER TABLE cars         ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses     ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals        ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices     ENABLE ROW LEVEL SECURITY;
ALTER TABLE police_log   ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks        ENABLE ROW LEVEL SECURITY;
ALTER TABLE events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE auctions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites        ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash         ENABLE ROW LEVEL SECURITY;
ALTER TABLE moves        ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals        ENABLE ROW LEVEL SECURITY;
ALTER TABLE launch       ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings     ENABLE ROW LEVEL SECURITY;

-- =============================================================
-- 2. Politiques : seul l'utilisateur authentifié peut tout voir
--    (app mono-utilisateur → auth.uid() IS NOT NULL suffit)
-- =============================================================

-- cars
DROP POLICY IF EXISTS "cars_auth" ON cars;
CREATE POLICY "cars_auth" ON cars
  FOR ALL USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- expenses
DROP POLICY IF EXISTS "expenses_auth" ON expenses;
CREATE POLICY "expenses_auth" ON expenses
  FOR ALL USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- deals
DROP POLICY IF EXISTS "deals_auth" ON deals;
CREATE POLICY "deals_auth" ON deals
  FOR ALL USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- invoices
DROP POLICY IF EXISTS "invoices_auth" ON invoices;
CREATE POLICY "invoices_auth" ON invoices
  FOR ALL USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- police_log (append-only : SELECT + INSERT uniquement, trigger bloque UPDATE/DELETE)
DROP POLICY IF EXISTS "police_log_auth" ON police_log;
CREATE POLICY "police_log_auth" ON police_log
  FOR ALL USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- tasks
DROP POLICY IF EXISTS "tasks_auth" ON tasks;
CREATE POLICY "tasks_auth" ON tasks
  FOR ALL USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- events
DROP POLICY IF EXISTS "events_auth" ON events;
CREATE POLICY "events_auth" ON events
  FOR ALL USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- auctions
DROP POLICY IF EXISTS "auctions_auth" ON auctions;
CREATE POLICY "auctions_auth" ON auctions
  FOR ALL USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- sites
DROP POLICY IF EXISTS "sites_auth" ON sites;
CREATE POLICY "sites_auth" ON sites
  FOR ALL USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- contacts
DROP POLICY IF EXISTS "contacts_auth" ON contacts;
CREATE POLICY "contacts_auth" ON contacts
  FOR ALL USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- cash
DROP POLICY IF EXISTS "cash_auth" ON cash;
CREATE POLICY "cash_auth" ON cash
  FOR ALL USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- moves
DROP POLICY IF EXISTS "moves_auth" ON moves;
CREATE POLICY "moves_auth" ON moves
  FOR ALL USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- goals
DROP POLICY IF EXISTS "goals_auth" ON goals;
CREATE POLICY "goals_auth" ON goals
  FOR ALL USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- launch
DROP POLICY IF EXISTS "launch_auth" ON launch;
CREATE POLICY "launch_auth" ON launch
  FOR ALL USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- settings (un seul enregistrement id='main')
DROP POLICY IF EXISTS "settings_auth" ON settings;
CREATE POLICY "settings_auth" ON settings
  FOR ALL USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- =============================================================
-- 3. Vérification
-- =============================================================
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
