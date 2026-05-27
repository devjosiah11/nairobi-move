// ============================================================
// NairobiMove — Shared TypeScript Types
// Derived from schema.sql — one type per DB table
// ============================================================

// ── Shared / Reference ──────────────────────────────────────

export interface Stage {
  id: string;
  name: string;
  area?: string;
  county: string;
  latitude?: number;
  longitude?: number;
  created_at: string;
}

// ── MatatuPulse ──────────────────────────────────────────────

export type VehicleType = '14-seater' | '33-seater' | 'bus' | 'other';
export type FareType = 'off_peak' | 'peak' | 'weekend';

export interface Route {
  id: string;
  route_number: string;
  name: string;
  sacco_name?: string;
  origin_stage_id?: string;
  dest_stage_id?: string;
  vehicle_type?: VehicleType;
  first_departure?: string;
  last_departure?: string;
  created_at: string;
}

export interface Fare {
  id: string;
  route_id: string;
  fare_type: FareType;
  min_fare: number;
  max_fare: number;
  updated_at: string;
}

export interface UssdSession {
  id: string;
  session_id: string;
  phone_number: string;
  state: 'ORIGIN' | 'DESTINATION' | 'CONFIRM';
  origin_stage_id?: string;
  dest_stage_id?: string;
  created_at: string;
  updated_at: string;
}

export interface FareAlert {
  id: string;
  phone_number: string;
  route_id: string;
  alert_channel: 'sms' | 'whatsapp';
  is_active: boolean;
  created_at: string;
}

export interface FareReport {
  id: string;
  route_id: string;
  phone_number?: string;
  reported_fare: number;
  created_at: string;
}

// ── FleetPulse (SACCO Dashboard) ─────────────────────────────

export type VehicleFleetType = '14-seater' | '33-seater' | 'bus' | 'lorry' | 'pickup';
export type ComplianceDocType = 'ntsa' | 'insurance' | 'psv';
export type ComplianceEventType = 'reminder_sent' | 'renewed' | 'overdue_call';
export type ComplianceStatus = 'compliant' | 'expiring' | 'overdue' | 'unknown';

export interface Sacco {
  id: string;
  name: string;
  owner_name?: string;
  phone_number: string;
  county: string;
  password_hash?: string;
  created_at: string;
}

export interface Vehicle {
  id: string;
  sacco_id: string;
  plate_number: string;
  vehicle_type: VehicleFleetType;
  driver_name?: string;
  driver_phone?: string;
  ntsa_expiry?: string;
  insurance_expiry?: string;
  psv_expiry?: string;
  created_at: string;
  updated_at: string;
}

export interface ComplianceEvent {
  id: string;
  vehicle_id: string;
  doc_type: ComplianceDocType;
  event_type: ComplianceEventType;
  days_before?: number;
  notes?: string;
  created_at: string;
}

export interface SmsLog {
  id: string;
  service: string;
  direction: 'inbound' | 'outbound';
  phone_number: string;
  message: string;
  status: string;
  related_id?: string;
  created_at: string;
}

// ── BodaDispatch ─────────────────────────────────────────────

export type TripStatus = 'booked' | 'completed' | 'cancelled';

export interface Rider {
  id: string;
  full_name: string;
  phone_number: string;
  id_number?: string;
  stage_id?: string;
  plate_number: string;
  motorcycle_make?: string;
  psb_licence?: string;
  next_of_kin_name?: string;
  next_of_kin_phone?: string;
  is_available: boolean;
  is_active: boolean;
  registered_via: 'web' | 'ussd';
  total_trips: number;
  total_airtime_earned: number;
  created_at: string;
  updated_at: string;
}

export interface Trip {
  id: string;
  rider_id?: string;
  passenger_phone?: string;
  pickup_stage_id?: string;
  status: TripStatus;
  airtime_rewarded: number;
  booked_at: string;
  completed_at?: string;
}

export interface SosEvent {
  id: string;
  rider_id?: string;
  stage_id?: string;
  kin_sms_sent: boolean;
  kin_call_made: boolean;
  is_resolved: boolean;
  resolved_at?: string;
  created_at: string;
}

// ── API response helpers ──────────────────────────────────────

export interface ApiSuccess<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  error: string;
  details?: unknown;
}
