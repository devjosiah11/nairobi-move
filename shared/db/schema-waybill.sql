-- ============================================================
-- NairobiMove — Waybill / Reconciliation Module
-- Extends the master schema. Run AFTER schema.sql.
-- Run: psql $DATABASE_URL -f schema-waybill.sql
-- ============================================================

-- ------------------------------------------------------------
-- Conductors registered to vehicles
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS conductors (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name       TEXT NOT NULL,
  phone_number    TEXT NOT NULL UNIQUE,
  vehicle_id      UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- Trips logged by conductor via USSD (trip-totals mode)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS trips_recon (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id           UUID REFERENCES vehicles(id),
  conductor_phone      TEXT NOT NULL,
  route_id             UUID REFERENCES routes(id),
  start_at             TIMESTAMPTZ DEFAULT NOW(),
  end_at               TIMESTAMPTZ,
  passenger_count      INTEGER,
  declared_total_kes   INTEGER,
  expected_total_kes   INTEGER,
  variance_kes         INTEGER,
  variance_pct         NUMERIC(6,2),
  peak_flag            BOOLEAN,
  status               TEXT CHECK (status IN ('open','closed','flagged')) DEFAULT 'open',
  notes                TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- Passenger spot-check reports (independent audit signal)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS passenger_reports (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plate             TEXT NOT NULL,
  reported_fare_kes INTEGER NOT NULL,
  from_stage        TEXT,
  to_stage          TEXT,
  reporter_phone    TEXT,
  airtime_paid_kes  INTEGER DEFAULT 0,
  matched_trip_id   UUID REFERENCES trips_recon(id),
  reported_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- Daily reconciliation rollup (one row per vehicle per day)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reconciliations (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id                UUID REFERENCES vehicles(id) ON DELETE CASCADE,
  owner_phone               TEXT,
  date                      DATE NOT NULL,
  trip_count                INTEGER DEFAULT 0,
  total_passengers          INTEGER DEFAULT 0,
  expected_kes              INTEGER DEFAULT 0,
  declared_kes              INTEGER DEFAULT 0,
  shortfall_kes             INTEGER DEFAULT 0,
  shortfall_pct             NUMERIC(6,2) DEFAULT 0,
  passenger_reports_count   INTEGER DEFAULT 0,
  passenger_anomalies       INTEGER DEFAULT 0,
  ai_summary                TEXT,
  voice_escalated_at        TIMESTAMPTZ,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (vehicle_id, date)
);

-- ------------------------------------------------------------
-- Airtime incentives paid out (conductors + passengers)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS incentives (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_phone   TEXT NOT NULL,
  recipient_role    TEXT CHECK (recipient_role IN ('conductor','passenger')),
  airtime_kes       INTEGER NOT NULL,
  reason            TEXT NOT NULL,
  related_id        UUID,
  paid_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- Indexes
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_conductors_phone ON conductors(phone_number);
CREATE INDEX IF NOT EXISTS idx_conductors_vehicle ON conductors(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_trips_recon_vehicle ON trips_recon(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_trips_recon_conductor ON trips_recon(conductor_phone);
CREATE INDEX IF NOT EXISTS idx_trips_recon_status ON trips_recon(status);
CREATE INDEX IF NOT EXISTS idx_trips_recon_created ON trips_recon(created_at);
CREATE INDEX IF NOT EXISTS idx_passenger_reports_plate ON passenger_reports(plate);
CREATE INDEX IF NOT EXISTS idx_passenger_reports_reported ON passenger_reports(reported_at);
CREATE INDEX IF NOT EXISTS idx_reconciliations_vehicle_date ON reconciliations(vehicle_id, date);
CREATE INDEX IF NOT EXISTS idx_incentives_recipient ON incentives(recipient_phone);

-- ------------------------------------------------------------
-- View: per-route average fare by fare_type (peak/off_peak/weekend)
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW route_avg_fares AS
SELECT
  route_id,
  fare_type,
  ((min_fare + max_fare)::numeric / 2)::integer AS avg_fare
FROM fares;

-- ------------------------------------------------------------
-- Function: is the current Nairobi time in a peak window?
-- Peak = weekdays 06:00-08:59 and 16:00-19:59
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_peak_now() RETURNS BOOLEAN AS $$
DECLARE
  h INTEGER := EXTRACT(HOUR FROM NOW() AT TIME ZONE 'Africa/Nairobi');
  dow INTEGER := EXTRACT(DOW FROM NOW() AT TIME ZONE 'Africa/Nairobi');
BEGIN
  IF dow IN (0, 6) THEN RETURN FALSE; END IF;
  IF h BETWEEN 6 AND 8 THEN RETURN TRUE; END IF;
  IF h BETWEEN 16 AND 19 THEN RETURN TRUE; END IF;
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE;

-- ------------------------------------------------------------
-- Seed: one conductor linked to a seeded vehicle (for demo)
-- Only inserts if the vehicle exists and the conductor doesn't already
-- ------------------------------------------------------------
INSERT INTO conductors (full_name, phone_number, vehicle_id)
SELECT 'James Mwangi', '+254712345678', v.id
FROM vehicles v
WHERE v.plate_number = 'KCA 123G'
  AND NOT EXISTS (SELECT 1 FROM conductors WHERE phone_number = '+254712345678');
