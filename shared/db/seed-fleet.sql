-- ============================================================
-- FleetPulse seed — Rongai Express SACCO + 10 vehicles
-- Driver phones alternate between the two test numbers so
-- USSD reminders reach a real handset.
-- Run: psql $DATABASE_URL -f shared/db/seed-fleet.sql
-- ============================================================

-- 1. Upsert the SACCO
INSERT INTO saccos (id, name, owner_name, phone_number, county)
VALUES (
  'a1000000-0000-0000-0000-000000000001',
  'Rongai Express SACCO',
  'James Kariuki',
  '+254740717201',
  'Nairobi'
)
ON CONFLICT (phone_number) DO UPDATE
  SET name = EXCLUDED.name, owner_name = EXCLUDED.owner_name;

-- 2. Vehicles — odd rows use +254740717201, even rows use +254740406442
INSERT INTO vehicles (
  sacco_id, plate_number, vehicle_type, driver_name, driver_phone,
  ntsa_expiry, insurance_expiry, psv_expiry, route_number, is_active
) VALUES
-- Compliant vehicles
('a1000000-0000-0000-0000-000000000001','KDA 421X','14-seater','John Mwangi',   '+254740717201','2026-03-15','2026-08-20','2026-06-30','111',true),
('a1000000-0000-0000-0000-000000000001','KCJ 089M','14-seater','Peter Otieno',  '+254740406442','2026-04-10','2026-09-05','2026-07-15','111',true),
('a1000000-0000-0000-0000-000000000001','KDG 332T','33-seater','Samuel Kimani', '+254740717201','2026-05-20','2026-10-12','2026-08-01','125',true),
('a1000000-0000-0000-0000-000000000001','KBZ 771R','14-seater','Grace Wanjiku',  '+254740406442','2026-06-01','2026-11-30','2026-09-10','125',true),

-- Expiring soon (within 14 days of today)
('a1000000-0000-0000-0000-000000000001','KDD 512K','14-seater','David Njoroge', '+254740717201',
  (CURRENT_DATE + 10)::DATE,
  (CURRENT_DATE + 7)::DATE,
  '2026-08-20',
  '58',true),
('a1000000-0000-0000-0000-000000000001','KDF 903P','33-seater','Mary Akinyi',   '+254740406442',
  '2026-07-15',
  (CURRENT_DATE + 12)::DATE,
  (CURRENT_DATE + 5)::DATE,
  '58',true),

-- Overdue / expired
('a1000000-0000-0000-0000-000000000001','KBX 214W','14-seater','James Oduya',   '+254740717201',
  (CURRENT_DATE - 30)::DATE,
  '2026-05-01',
  (CURRENT_DATE - 5)::DATE,
  '33',true),
('a1000000-0000-0000-0000-000000000001','KCC 671H','14-seater','Alice Muthoni', '+254740406442',
  (CURRENT_DATE - 60)::DATE,
  (CURRENT_DATE - 10)::DATE,
  '2026-06-15',
  '33',true),

-- Mixed
('a1000000-0000-0000-0000-000000000001','KDB 198N','14-seater','Brian Kamau',   '+254740717201','2026-09-01','2026-12-01','2027-01-15','34',true),
('a1000000-0000-0000-0000-000000000001','KCT 445G','33-seater','Ruth Chebet',   '+254740406442','2026-08-15','2026-11-01','2026-10-20','34',true)

ON CONFLICT (plate_number) DO UPDATE
  SET driver_name    = EXCLUDED.driver_name,
      driver_phone   = EXCLUDED.driver_phone,
      ntsa_expiry    = EXCLUDED.ntsa_expiry,
      insurance_expiry = EXCLUDED.insurance_expiry,
      psv_expiry     = EXCLUDED.psv_expiry,
      route_number   = EXCLUDED.route_number,
      updated_at     = NOW();

-- Confirm
SELECT plate_number, driver_name, driver_phone,
       ntsa_expiry, insurance_expiry, psv_expiry
FROM vehicles
WHERE sacco_id = 'a1000000-0000-0000-0000-000000000001'
ORDER BY created_at;
