-- ============================================================
-- NairobiMove — Master Schema
-- One Neon database, shared across all four services
-- Run once: psql $DATABASE_URL -f schema.sql
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- SHARED / REFERENCE TABLES
-- Used by multiple services (read-heavy, written by seeder)
-- ============================================================

CREATE TABLE stages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,           -- e.g. "Westlands Total"
  area        TEXT,                           -- e.g. "Westlands"
  county      TEXT DEFAULT 'Nairobi',
  latitude    NUMERIC(9,6),
  longitude   NUMERIC(9,6),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MATATU-PULSE TABLES
-- Owner: matatu-pulse/server
-- ============================================================

CREATE TABLE routes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_number    TEXT NOT NULL,              -- e.g. "111"
  name            TEXT NOT NULL,              -- e.g. "CBD to Rongai"
  sacco_name      TEXT,
  origin_stage_id UUID REFERENCES stages(id),
  dest_stage_id   UUID REFERENCES stages(id),
  vehicle_type    TEXT CHECK (vehicle_type IN ('14-seater','33-seater','bus','other')),
  first_departure TIME,
  last_departure  TIME,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE fares (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id    UUID REFERENCES routes(id) ON DELETE CASCADE,
  fare_type   TEXT CHECK (fare_type IN ('off_peak','peak','weekend')) DEFAULT 'off_peak',
  min_fare    INTEGER NOT NULL,               -- KES
  max_fare    INTEGER NOT NULL,               -- KES
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ussd_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      TEXT NOT NULL UNIQUE,       -- AT session ID
  phone_number    TEXT NOT NULL,
  state           TEXT DEFAULT 'ORIGIN',      -- ORIGIN | DESTINATION | CONFIRM
  origin_stage_id UUID REFERENCES stages(id),
  dest_stage_id   UUID REFERENCES stages(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE fare_alerts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number    TEXT NOT NULL,
  route_id        UUID REFERENCES routes(id) ON DELETE CASCADE,
  alert_channel   TEXT CHECK (alert_channel IN ('sms','whatsapp')) DEFAULT 'sms',
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Commuter-submitted fare confirmations
CREATE TABLE fare_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id        UUID REFERENCES routes(id) ON DELETE CASCADE,
  phone_number    TEXT,
  reported_fare   INTEGER NOT NULL,           -- KES
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SACCO DASHBOARD (FLEETPULSE) TABLES
-- Owner: sacco-dashboard/server
-- ============================================================

CREATE TABLE saccos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  owner_name      TEXT,
  phone_number    TEXT NOT NULL UNIQUE,
  county          TEXT DEFAULT 'Nairobi',
  password_hash   TEXT,                       -- for dashboard login
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE vehicles (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sacco_id            UUID REFERENCES saccos(id) ON DELETE CASCADE,
  plate_number        TEXT NOT NULL UNIQUE,
  vehicle_type        TEXT CHECK (vehicle_type IN ('14-seater','33-seater','bus','lorry','pickup')) DEFAULT '14-seater',
  driver_name         TEXT,
  driver_phone        TEXT,
  ntsa_expiry         DATE,
  insurance_expiry    DATE,
  psv_expiry          DATE,
  route_number        TEXT,                        -- matatu route number
  current_location    TEXT,                        -- GPS description
  current_stage_id    UUID REFERENCES stages(id),  -- current stage location
  lat                 NUMERIC(9,6),                -- GPS latitude
  lng                 NUMERIC(9,6),                -- GPS longitude
  last_updated        TIMESTAMPTZ DEFAULT NOW(),    -- last GPS update
  is_active           BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Computed status: call this function per vehicle per doc type
-- Returns: 'compliant' | 'expiring' | 'overdue'
CREATE OR REPLACE FUNCTION compliance_status(expiry_date DATE)
RETURNS TEXT AS $$
BEGIN
  IF expiry_date IS NULL THEN RETURN 'unknown'; END IF;
  IF expiry_date < CURRENT_DATE THEN RETURN 'overdue'; END IF;
  IF expiry_date <= CURRENT_DATE + INTERVAL '14 days' THEN RETURN 'expiring'; END IF;
  RETURN 'compliant';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE TABLE compliance_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id      UUID REFERENCES vehicles(id) ON DELETE CASCADE,
  doc_type        TEXT CHECK (doc_type IN ('ntsa','insurance','psv')),
  event_type      TEXT CHECK (event_type IN ('reminder_sent','renewed','overdue_call')),
  days_before     INTEGER,                    -- how many days before expiry reminder was sent
  notes           TEXT,                       -- e.g. "DONE Jubilee Insurance"
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sms_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service         TEXT NOT NULL,              -- 'fleetpulse' | 'boda' | 'matatu'
  direction       TEXT CHECK (direction IN ('inbound','outbound')),
  phone_number    TEXT NOT NULL,
  message         TEXT NOT NULL,
  status          TEXT DEFAULT 'sent',        -- sent | delivered | failed
  related_id      UUID,                       -- vehicle_id, rider_id, etc.
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- BODA DISPATCH TABLES
-- Owner: boda-dispatch/server
-- Also written to by: registration/server (rider signup)
-- ============================================================

CREATE TABLE riders (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name           TEXT NOT NULL,
  phone_number        TEXT NOT NULL UNIQUE,
  id_number           TEXT UNIQUE,            -- National ID
  stage_id            UUID REFERENCES stages(id),
  plate_number        TEXT NOT NULL UNIQUE,
  motorcycle_make     TEXT,                   -- Honda, Bajaj, TVS, etc.
  psb_licence         TEXT,                   -- Public Service Board licence
  next_of_kin_name    TEXT,
  next_of_kin_phone   TEXT,
  is_available        BOOLEAN DEFAULT FALSE,  -- toggled by ON/OFF SMS
  is_active           BOOLEAN DEFAULT TRUE,   -- set false if suspended
  registered_via      TEXT DEFAULT 'web',     -- 'web' | 'ussd'
  total_trips         INTEGER DEFAULT 0,
  total_airtime_earned INTEGER DEFAULT 0,     -- KES
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE trips (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id            UUID REFERENCES riders(id),
  customer_name       TEXT,                        -- passenger name
  customer_phone      TEXT,                        -- passenger phone
  pickup_location     TEXT,                        -- pickup description
  dropoff_location    TEXT,                        -- dropoff description
  pickup_stage_id     UUID REFERENCES stages(id),  -- pickup stage
  status              TEXT CHECK (status IN ('booked','completed','cancelled')) DEFAULT 'booked',
  fare_amount         INTEGER DEFAULT 0,           -- KES
  actual_fare         INTEGER,                     -- actual fare charged
  payment_method      TEXT DEFAULT 'cash',         -- cash, mpesa, etc.
  airtime_rewarded    INTEGER DEFAULT 0,           -- KES
  booked_at           TIMESTAMPTZ DEFAULT NOW(),
  completed_at        TIMESTAMPTZ,
  notes               TEXT
);

CREATE TABLE sos_events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id            UUID REFERENCES riders(id),
  stage_id            UUID REFERENCES stages(id),     -- stage at time of SOS
  location_description TEXT,                         -- user-provided location
  lat                 NUMERIC(9,6),                  -- GPS latitude
  lng                 NUMERIC(9,6),                  -- GPS longitude
  incident_type       TEXT,                          -- type of incident
  kin_sms_sent        BOOLEAN DEFAULT FALSE,
  kin_call_made       BOOLEAN DEFAULT FALSE,
  is_resolved         BOOLEAN DEFAULT FALSE,
  resolution_notes    TEXT,                          -- how it was resolved
  follow_up_required  BOOLEAN DEFAULT FALSE,
  follow_up_notes     TEXT,
  resolved_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MATATU-PULSE COMMUTER TABLES
-- Owner: matatu-pulse/server
-- ============================================================

CREATE TABLE commuters (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name           TEXT NOT NULL,
  phone_number        TEXT NOT NULL UNIQUE,
  email               TEXT,
  preferred_routes    TEXT[],                     -- array of route numbers
  sms_subscribed      BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE traffic_reports (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number        TEXT NOT NULL,
  report_type         TEXT NOT NULL,               -- 'Heavy Traffic', 'Light Traffic', etc.
  route_number        TEXT,                        -- optional route number
  description         TEXT,
  status              TEXT DEFAULT 'active',
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE incident_reports (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number        TEXT NOT NULL,
  incident_type       TEXT NOT NULL,               -- 'Breakdown', 'Accident', etc.
  description         TEXT,
  lat                 NUMERIC(9,6),
  lng                 NUMERIC(9,6),
  status              TEXT DEFAULT 'active',
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE commuter_sos (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number        TEXT NOT NULL,
  description         TEXT,
  lat                 NUMERIC(9,6),
  lng                 NUMERIC(9,6),
  status              TEXT DEFAULT 'active',
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Fleet lookups
CREATE INDEX idx_vehicles_sacco ON vehicles(sacco_id);
CREATE INDEX idx_vehicles_ntsa ON vehicles(ntsa_expiry);
CREATE INDEX idx_vehicles_insurance ON vehicles(insurance_expiry);
CREATE INDEX idx_vehicles_psv ON vehicles(psv_expiry);

-- Rider lookups
CREATE INDEX idx_riders_stage ON riders(stage_id);
CREATE INDEX idx_riders_available ON riders(is_available, stage_id);
CREATE INDEX idx_riders_phone ON riders(phone_number);

-- Route/fare lookups
CREATE INDEX idx_fares_route ON fares(route_id);
CREATE INDEX idx_routes_origin ON routes(origin_stage_id);
CREATE INDEX idx_routes_dest ON routes(dest_stage_id);

-- SMS log lookups
CREATE INDEX idx_sms_related ON sms_logs(related_id);
CREATE INDEX idx_sms_phone ON sms_logs(phone_number);

-- Trip lookups
CREATE INDEX idx_trips_rider ON trips(rider_id);
CREATE INDEX idx_trips_status ON trips(status);

-- USSD session lookup
CREATE INDEX idx_ussd_session ON ussd_sessions(session_id);

-- Commuter lookups
CREATE INDEX idx_commuters_phone ON commuters(phone_number);
CREATE INDEX idx_traffic_reports_route ON traffic_reports(route_number);
CREATE INDEX idx_traffic_reports_created ON traffic_reports(created_at);
CREATE INDEX idx_incident_reports_type ON incident_reports(incident_type);
CREATE INDEX idx_incident_reports_created ON incident_reports(created_at);
CREATE INDEX idx_commuter_sos_phone ON commuter_sos(phone_number);

-- ============================================================
-- SEED DATA — Stages (Nairobi)
-- ============================================================

INSERT INTO stages (name, area, latitude, longitude) VALUES
  ('CBD Archives',       'CBD',        -1.2833, 36.8167),
  ('Railway Stage',      'CBD',        -1.2921, 36.8219),
  ('Westlands Total',    'Westlands',  -1.2637, 36.8063),
  ('Sarit Centre',       'Westlands',  -1.2602, 36.8038),
  ('Rongai Stage',       'Rongai',     -1.3966, 36.7462),
  ('Ngong Road Stage',   'Ngong Road', -1.3031, 36.7677),
  ('Karen Stage',        'Karen',      -1.3190, 36.7102),
  ('Thika Road Mall',    'Thika Road', -1.2197, 36.8880),
  ('Githurai 45',        'Githurai',   -1.1730, 36.9180),
  ('Eastleigh Stage',    'Eastleigh',  -1.2699, 36.8519),
  ('Langata Stage',      'Langata',    -1.3318, 36.7510),
  ('Kibera Stage',       'Kibera',     -1.3133, 36.7880),
  ('Mombasa Road',       'South',      -1.3210, 36.8360),
  ('Umoja Stage',        'Eastlands',  -1.2792, 36.8993),
  ('Buru Buru Stage',    'Eastlands',  -1.2786, 36.8739),
  ('Pipeline Stage',     'Embakasi',   -1.3122, 36.8779),
  ('Grogon Stage',       'Westlands',  -1.2668, 36.8180),
  ('Waiyaki Way',        'Westlands',  -1.2611, 36.7940),
  ('Jomo Kenyatta Airport','Embakasi', -1.3192, 36.9275),
  ('Kikuyu Stage',       'Kikuyu',     -1.2462, 36.6635);

-- ============================================================
-- SEED DATA — Routes & Fares
-- ============================================================

WITH r AS (
  INSERT INTO routes (route_number, name, sacco_name, vehicle_type, first_departure, last_departure,
    origin_stage_id, dest_stage_id)
  SELECT '111','CBD to Rongai','Rongai-Maasai SACCO','14-seater','05:30','22:00',
    (SELECT id FROM stages WHERE name='Railway Stage'),
    (SELECT id FROM stages WHERE name='Rongai Stage')
  RETURNING id
)
INSERT INTO fares (route_id, fare_type, min_fare, max_fare)
SELECT id,'peak',80,100 FROM r
UNION ALL SELECT id,'off_peak',60,80 FROM r
UNION ALL SELECT id,'weekend',70,90 FROM r;

WITH r AS (
  INSERT INTO routes (route_number, name, sacco_name, vehicle_type, first_departure, last_departure,
    origin_stage_id, dest_stage_id)
  SELECT '46','CBD to Westlands','Westlands SACCO','14-seater','05:00','23:00',
    (SELECT id FROM stages WHERE name='CBD Archives'),
    (SELECT id FROM stages WHERE name='Westlands Total')
  RETURNING id
)
INSERT INTO fares (route_id, fare_type, min_fare, max_fare)
SELECT id,'peak',50,70 FROM r
UNION ALL SELECT id,'off_peak',40,60 FROM r;

WITH r AS (
  INSERT INTO routes (route_number, name, sacco_name, vehicle_type, first_departure, last_departure,
    origin_stage_id, dest_stage_id)
  SELECT '34','CBD to Ngong Road','Ngong Road SACCO','14-seater','05:30','22:30',
    (SELECT id FROM stages WHERE name='CBD Archives'),
    (SELECT id FROM stages WHERE name='Ngong Road Stage')
  RETURNING id
)
INSERT INTO fares (route_id, fare_type, min_fare, max_fare)
SELECT id,'peak',60,80 FROM r
UNION ALL SELECT id,'off_peak',50,70 FROM r;

WITH r AS (
  INSERT INTO routes (route_number, name, sacco_name, vehicle_type, first_departure, last_departure,
    origin_stage_id, dest_stage_id)
  SELECT '125','CBD to Karen','Karen SACCO','14-seater','06:00','21:00',
    (SELECT id FROM stages WHERE name='Railway Stage'),
    (SELECT id FROM stages WHERE name='Karen Stage')
  RETURNING id
)
INSERT INTO fares (route_id, fare_type, min_fare, max_fare)
SELECT id,'peak',100,120 FROM r
UNION ALL SELECT id,'off_peak',80,100 FROM r;

-- ============================================================
-- SEED DATA — Sample SACCO + Vehicles (for FleetPulse demo)
-- ============================================================

WITH s AS (
  INSERT INTO saccos (name, owner_name, phone_number, county)
  VALUES ('Rongai Express SACCO','David Otieno','0722000001','Nairobi')
  RETURNING id
)
INSERT INTO vehicles (sacco_id, plate_number, vehicle_type, driver_name, driver_phone,
  ntsa_expiry, insurance_expiry, psv_expiry)
SELECT
  s.id, v.plate, v.vtype::text, v.driver, v.dphone,
  v.ntsa::date, v.insur::date, v.psv::date
FROM s, (VALUES
  ('KCA 123G','14-seater','John Mwangi','0722111001', CURRENT_DATE+60,  CURRENT_DATE+90,  CURRENT_DATE+120),
  ('KBZ 456T','14-seater','Peter Kamau','0722111002', CURRENT_DATE+45,  CURRENT_DATE+6,   CURRENT_DATE+80),
  ('KDA 789M','33-seater','James Njoroge','0722111003',CURRENT_DATE-3,  CURRENT_DATE+30,  CURRENT_DATE+60),
  ('KCB 321F','14-seater','Samuel Odhiambo','0722111004',CURRENT_DATE+90,CURRENT_DATE+120,CURRENT_DATE+100),
  ('KCC 654H','14-seater','Brian Waweru','0722111005', CURRENT_DATE+50, CURRENT_DATE+40,  CURRENT_DATE+12),
  ('KCD 987J','33-seater','Moses Kipchoge','0722111006',CURRENT_DATE+70,CURRENT_DATE+60,  CURRENT_DATE+90),
  ('KCE 111A','14-seater','Alex Mutua','0722111007',   CURRENT_DATE+30, CURRENT_DATE-5,   CURRENT_DATE+45),
  ('KCF 222B','14-seater','George Kariuki','0722111008',CURRENT_DATE+55,CURRENT_DATE+65, CURRENT_DATE+75)
) AS v(plate, vtype, driver, dphone, ntsa, insur, psv);
