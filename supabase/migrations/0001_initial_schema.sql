-- =============================================================================
-- MEM AUTOMOTIVE — Ordinateur de Bord
-- Migration 0001 : Schéma initial
-- Montants en CENTIMES (INTEGER). Dates métier en DATE. Timestamps en TIMESTAMPTZ.
-- IDs conservés depuis l'export JSON (format texte ex: mva3cyi73erqi).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Séquences pour numérotation garantie (factures, livre de police)
-- ---------------------------------------------------------------------------

CREATE SEQUENCE IF NOT EXISTS invoice_seq START 1;
CREATE SEQUENCE IF NOT EXISTS order_seq   START 1;
CREATE SEQUENCE IF NOT EXISTS police_seq  START 1;

-- ---------------------------------------------------------------------------
-- contacts
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS contacts (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  role          TEXT,                        -- acheteur / vendeur / garage / carrossier / autre
  kind          TEXT DEFAULT 'particulier',  -- particulier / pro
  siren         TEXT,
  sexe          TEXT,
  birth_date    DATE,
  birth_place   TEXT,
  phone         TEXT,
  email         TEXT,
  address       TEXT,
  id_doc        TEXT,                        -- type et numéro pièce identité (livre de police)
  wants         TEXT,                        -- envies acheteur
  budget_cts    INTEGER,                     -- budget acheteur en centimes
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- cars
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS cars (
  id                    TEXT PRIMARY KEY,
  name                  TEXT NOT NULL,
  plate                 TEXT,
  vin                   TEXT,
  brand                 TEXT,
  model                 TEXT,
  year                  INTEGER,
  first_reg             DATE,
  km                    INTEGER,
  fuel                  TEXT,
  gearbox               TEXT,
  color                 TEXT,
  type_variant          TEXT,
  genre                 TEXT DEFAULT 'VP',   -- VP / CTTE / autre
  formule               TEXT,                -- numéro de formule CG
  country               TEXT,                -- NL, BE, FR…
  source                TEXT,                -- Marktplaats, BAS Auction, etc.
  link                  TEXT,
  source_ad_id          TEXT,                -- ID annonce bot Discord (ex: mp_m2461...)
  stage                 TEXT NOT NULL DEFAULT 'repere',
  regime                TEXT NOT NULL DEFAULT 'marge',  -- marge / normal
  buy_date              DATE,
  buy_price_cts         INTEGER,             -- centimes
  buy_pay               TEXT,
  seller_id             TEXT REFERENCES contacts(id) ON DELETE SET NULL,
  ask_seller_cts        INTEGER,
  ask_price_cts         INTEGER,
  list_date             DATE,
  sell_date             DATE,
  sell_time             TIME,
  sell_price_cts        INTEGER,             -- centimes
  sell_pay              TEXT,
  buyer_id              TEXT REFERENCES contacts(id) ON DELETE SET NULL,
  papers                JSONB DEFAULT '{"decl":false,"transit":false,"coc":false,"ct":false,"cg":false,"quitus":false}',
  photos                JSONB DEFAULT '[]',
  docs                  JSONB DEFAULT '[]',
  notes                 TEXT,
  ad_text               TEXT,
  planned_fees_cts      INTEGER,
  planned_fees_ttc_cts  INTEGER,
  forecast              JSONB,
  deal_id               TEXT,                -- référence vers deals(id)
  price_drops           JSONB DEFAULT '[]',
  created_at            TIMESTAMPTZ DEFAULT now(),
  bought_at             TIMESTAMPTZ,
  sold_at               TIMESTAMPTZ,
  created_by            TEXT DEFAULT 'app'
);

CREATE INDEX IF NOT EXISTS idx_cars_stage    ON cars(stage);
CREATE INDEX IF NOT EXISTS idx_cars_regime   ON cars(regime);
CREATE INDEX IF NOT EXISTS idx_cars_sell_date ON cars(sell_date);

-- ---------------------------------------------------------------------------
-- expenses
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS expenses (
  id          TEXT PRIMARY KEY,
  date        DATE NOT NULL,
  car_id      TEXT REFERENCES cars(id) ON DELETE SET NULL,  -- NULL = frais société
  cat         TEXT NOT NULL,
  label       TEXT,
  ttc_cts     INTEGER NOT NULL,  -- centimes
  tva_cts     INTEGER DEFAULT 0,
  pay         TEXT DEFAULT 'banque',  -- banque / especes
  receipt_id  TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expenses_car   ON expenses(car_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date  ON expenses(date);

-- ---------------------------------------------------------------------------
-- deals (affaires calculées)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS deals (
  id          TEXT PRIMARY KEY,
  name        TEXT,
  car_id      TEXT REFERENCES cars(id) ON DELETE SET NULL,
  inputs      JSONB NOT NULL DEFAULT '{}',
  fc          JSONB,                -- résultat du calcul (prévisionnel)
  status      TEXT DEFAULT 'brouillon',  -- brouillon / previsionnel / vendue / abandonnee
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- invoices (immuables après verrouillage)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS invoices (
  id              TEXT PRIMARY KEY,
  num             TEXT UNIQUE NOT NULL,  -- F-2026-001, généré via invoice_seq
  type            TEXT NOT NULL,         -- marge / vtva / tva / bon
  date            DATE NOT NULL,
  car_id          TEXT REFERENCES cars(id) ON DELETE SET NULL,
  client_id       TEXT REFERENCES contacts(id) ON DELETE SET NULL,
  client_name     TEXT,
  client_address  TEXT,
  client_siren    TEXT,
  delivery_address TEXT,
  delivery_date   DATE,
  due_date        DATE,
  pay_method      TEXT,
  lines           JSONB NOT NULL DEFAULT '[]',
  deposit_cts     INTEGER DEFAULT 0,
  notes           TEXT,
  paid            BOOLEAN DEFAULT FALSE,
  paid_date       DATE,
  paid_at         TIMESTAMPTZ,
  locked_at       TIMESTAMPTZ,           -- NULL = brouillon, non-NULL = verrouillée (immuable)
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Trigger : interdit modification/suppression après verrouillage
CREATE OR REPLACE FUNCTION protect_locked_invoice()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.locked_at IS NOT NULL THEN
    RAISE EXCEPTION 'Facture % verrouillée — modification interdite (obligation légale).', OLD.num;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER no_modify_locked_invoice
  BEFORE UPDATE OR DELETE ON invoices
  FOR EACH ROW EXECUTE FUNCTION protect_locked_invoice();

-- ---------------------------------------------------------------------------
-- police_log (Livre de police — APPEND-ONLY)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS police_log (
  id          SERIAL PRIMARY KEY,            -- numéro séquentiel garanti
  car_id      TEXT NOT NULL,                 -- pas de FK avec CASCADE pour préserver l'historique
  entry_date  TIMESTAMPTZ DEFAULT now(),
  action      TEXT NOT NULL,                 -- 'achat' / 'vente'
  data        JSONB NOT NULL,                -- snapshot complet vendeur/acheteur/véhicule/prix
  created_by  TEXT DEFAULT 'app'
);

-- Trigger : interdit toute modification ou suppression
CREATE OR REPLACE FUNCTION protect_police_log()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Le livre de police est immuable (obligation légale §8 CGI).';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER no_delete_police
  BEFORE DELETE OR UPDATE ON police_log
  FOR EACH ROW EXECUTE FUNCTION protect_police_log();

-- ---------------------------------------------------------------------------
-- tasks
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS tasks (
  id        TEXT PRIMARY KEY,
  title     TEXT NOT NULL,
  prio      INTEGER DEFAULT 2,  -- 1=urgent, 2=normal, 3=pas pressé
  due       DATE,
  car_id    TEXT REFERENCES cars(id) ON DELETE CASCADE,
  paper     TEXT,               -- clé du papier lié (decl, transit, coc, ct, cg, quitus)
  done      BOOLEAN DEFAULT FALSE,
  done_at   TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_car  ON tasks(car_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due  ON tasks(due);

-- ---------------------------------------------------------------------------
-- events (calendrier)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS events (
  id        TEXT PRIMARY KEY,
  title     TEXT NOT NULL,
  kind      TEXT,              -- vente_encheres / lot_suivi / tache / rdv / autre
  site      TEXT,
  date      DATE NOT NULL,
  time      TIME,
  repeat    TEXT DEFAULT 'none',  -- none / weekly
  until     DATE,
  skip      JSONB DEFAULT '[]',   -- dates à sauter
  link      TEXT,
  notes     TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- auctions (enchères suivies)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS auctions (
  id        TEXT PRIMARY KEY,
  title     TEXT NOT NULL,
  site      TEXT,
  ends_at   TIMESTAMPTZ,
  max_cts   INTEGER,          -- prix maximum en centimes
  fee_pct   NUMERIC(5,2),     -- % frais acheteur
  link      TEXT,
  result    TEXT DEFAULT 'encours',  -- encours / gagnee / perdue
  car_id    TEXT REFERENCES cars(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- sites (sites d'achat)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS sites (
  id        TEXT PRIMARY KEY,
  name      TEXT NOT NULL,
  country   TEXT,
  type      TEXT,
  freq      TEXT DEFAULT 'semaine',  -- jour / semaine
  url       TEXT,
  note      TEXT,
  seen_at   DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- cash (entrées/sorties prévues)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS cash (
  id        TEXT PRIMARY KEY,
  label     TEXT NOT NULL,
  amount_cts INTEGER NOT NULL,  -- négatif = sortie, positif = entrée
  date      DATE NOT NULL,
  done      BOOLEAN DEFAULT FALSE,
  done_date DATE,
  done_at   TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- moves (mouvements d'espèces)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS moves (
  id        TEXT PRIMARY KEY,
  kind      TEXT NOT NULL,   -- retrait / depot / entree / sortie
  amount_cts INTEGER NOT NULL,
  date      DATE NOT NULL,
  label     TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- goals (objectifs)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS goals (
  id        TEXT PRIMARY KEY,
  title     TEXT NOT NULL,
  horizon   TEXT,            -- court / moyen / long
  deadline  DATE,
  metric    TEXT,
  target    NUMERIC,
  why       TEXT,
  done      BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- launch (checklist de démarrage)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS launch (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  short       TEXT,
  detail      TEXT,
  dmin        INTEGER,         -- délai minimum en jours
  dmax        INTEGER,
  start_date  DATE,
  done_date   DATE,
  done        BOOLEAN DEFAULT FALSE,
  "order"     INTEGER,
  prereq      JSONB DEFAULT '[]',   -- ids des prérequis
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- settings (document unique de réglages)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS settings (
  id              TEXT PRIMARY KEY DEFAULT 'main',
  solde_cts       INTEGER DEFAULT 0,   -- solde bancaire recalé en centimes
  solde_date      DATE,
  solde_at        TIMESTAMPTZ,
  cash_solde_cts  INTEGER DEFAULT 0,   -- solde espèces en centimes
  cash_date       DATE,
  cash_solde_at   TIMESTAMPTZ,
  tva             NUMERIC(4,2) DEFAULT 20,
  seuil           INTEGER DEFAULT 15,  -- alerte stock après X jours
  cible_cts       INTEGER DEFAULT 120000,  -- bénéfice visé en centimes
  mini_cts        INTEGER DEFAULT 70000,
  categories      JSONB DEFAULT '[]',
  margin_tiers    JSONB DEFAULT '[]',
  objectifs       JSONB DEFAULT '{}',
  auto_tasks      BOOLEAN DEFAULT TRUE,
  company         JSONB DEFAULT '{}',
  invoice_next    INTEGER DEFAULT 1,   -- indicatif, la vraie séquence est invoice_seq
  order_next      INTEGER DEFAULT 1,
  calc_deal       JSONB DEFAULT '{}',
  trip            JSONB DEFAULT '{}',
  deal_sort       JSONB DEFAULT '{"by":"recent","dir":"desc"}',
  profit_view     TEXT DEFAULT 'ht',
  wa_brother      TEXT,
  last_backup     TIMESTAMPTZ,
  vision          TEXT,
  phases          JSONB DEFAULT '[]',
  phase           INTEGER DEFAULT 0,
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Garantir qu'il n'y a qu'une seule ligne de réglages
INSERT INTO settings (id) VALUES ('main') ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- RLS (Row Level Security) — à activer après configuration Auth Supabase
-- ---------------------------------------------------------------------------
-- ALTER TABLE cars ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE police_log ENABLE ROW LEVEL SECURITY;
-- (Politiques à définir selon les rôles : dirigeant / comptable lecture seule)
