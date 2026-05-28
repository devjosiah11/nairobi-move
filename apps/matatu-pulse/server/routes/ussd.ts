import { Router } from 'express';
import { sql } from '@nairobi-move/db';
import { sendSMS, logSMS } from '@nairobi-move/utils';
import { findRoutes, isPeakNow } from '../lib/fare-data.js';

const router = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ussdReply(res: any, text: string) {
  res.set('Content-Type', 'text/plain');
  res.send(text);
}

function phone(raw: string) {
  return raw.startsWith('+') ? raw : `+254${raw.replace(/^0/, '')}`;
}

async function trySMS(to: string, msg: string) {
  try {
    await sendSMS(to, msg);
    await logSMS(sql, 'matatu-pulse', 'outbound', to, msg);
  } catch (_) {}
}

// Format fare result for USSD (≤182 chars)
function fareText(from: string, to: string): string {
  const routes = findRoutes(from, to);
  if (routes.length === 0) return `No routes found for ${from} to ${to}.\nCheck spelling e.g. CBD, Rongai, Karen.`;
  const peak = isPeakNow();
  const r = routes[0];
  const [lo, hi] = peak ? r.farePeak : r.fareOffPeak;
  const label = peak ? 'PEAK' : 'OFF-PEAK';
  return `${r.from}>${r.to} Rt ${r.number}\n${label}: KES ${lo}-${hi}\nOff-peak: ${r.fareOffPeak[0]}-${r.fareOffPeak[1]}\nPeak: ${r.farePeak[0]}-${r.farePeak[1]}`;
}

// SMS detail — more routes + both fares
function fareSMS(from: string, to: string): string {
  const routes = findRoutes(from, to);
  if (routes.length === 0) return `MatatuPulse: No routes found from ${from} to ${to}.\nDial *384*3133# to try again.`;
  const peak = isPeakNow();
  const lines = routes.slice(0, 4).map(r =>
    `Rt ${r.number} (${r.sacco ?? r.from+'>'+r.to}): off-peak KES ${r.fareOffPeak[0]}-${r.fareOffPeak[1]}, peak KES ${r.farePeak[0]}-${r.farePeak[1]}`
  );
  const now = peak ? 'NOW: PEAK — higher fares apply.' : 'NOW: OFF-PEAK — best fares now.';
  return `MatatuPulse fares ${from}>${to}:\n${lines.join('\n')}\n${now}\nDial *384*3133# for more.`;
}

// ─── DB init for tables that may be missing ───────────────────────────────────

async function ensureTables() {
  try {
    await sql`CREATE TABLE IF NOT EXISTS commuters (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      phone_number TEXT NOT NULL UNIQUE,
      full_name    TEXT,
      route_id     TEXT,
      sms_subscribed BOOLEAN DEFAULT true,
      created_at   TIMESTAMPTZ DEFAULT NOW()
    )`;
    await sql`CREATE TABLE IF NOT EXISTS fare_alert_subs (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      phone_number TEXT NOT NULL,
      route_number TEXT NOT NULL,
      created_at   TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(phone_number, route_number)
    )`;
  } catch (_) {}
}
ensureTables();

// ─── USSD Handler — Africa's Talking *384*3133# ───────────────────────────────
// Fully STATELESS: all state derived from `text` field, no session DB table.
// text = '' (main), '1' (fare: ask from), '1*CBD' (fare: ask to),
//         '1*CBD*Rongai' (fare: respond)
// Modules: 1=Check Fare, 2=Find Route, 3=Fare Alerts, 4=Report Incident, 5=SOS

router.post('/', async (req, res) => {
  const { sessionId, phoneNumber, text } = req.body;
  const p = phone(phoneNumber ?? '');
  const parts = text ? (text as string).split('*') : [];
  const lvl = parts.length;

  console.log(`[USSD] ${p} text="${text}"`);

  try {
    // ── Level 0: main menu ──────────────────────────────────────────────────
    if (lvl === 0 || text === '') {
      return ussdReply(res, `CON Karibu MatatuPulse!\n1. Check fare\n2. Find route\n3. Fare alerts\n4. Report incident\n5. Emergency SOS`);
    }

    const [m1, m2, m3] = parts;

    // ── Module 1: Check Fare ────────────────────────────────────────────────
    if (m1 === '1') {
      if (lvl === 1) return ussdReply(res, `CON Check fare:\nEnter FROM stage\n(e.g. CBD, Westlands, Karen)`);
      if (lvl === 2) return ussdReply(res, `CON From ${m2}.\nEnter TO stage\n(e.g. Rongai, Thika, Eastleigh)`);
      if (lvl === 3) {
        const info = fareText(m2, m3);
        await trySMS(p, fareSMS(m2, m3));
        return ussdReply(res, `END ${info}\nFull details sent by SMS.`);
      }
    }

    // ── Module 2: Find Route ────────────────────────────────────────────────
    if (m1 === '2') {
      if (lvl === 1) return ussdReply(res, `CON Find route:\nEnter FROM stage\n(e.g. CBD, Ngong Road)`);
      if (lvl === 2) return ussdReply(res, `CON From ${m2}.\nEnter TO stage\n(e.g. Rongai, Karen, Kikuyu)`);
      if (lvl === 3) {
        const routes = findRoutes(m2, m3);
        if (routes.length === 0) {
          return ussdReply(res, `END No routes found\n${m2} to ${m3}.\nCheck spelling & try again.`);
        }
        const peak = isPeakNow();
        const lines = routes.slice(0, 3).map(r => {
          const [lo, hi] = peak ? r.farePeak : r.fareOffPeak;
          return `Rt ${r.number}: KES ${lo}-${hi}`;
        }).join('\n');
        await trySMS(p, fareSMS(m2, m3));
        return ussdReply(res, `END Routes ${m2}>${m3}:\n${lines}\nFull list sent by SMS.`);
      }
    }

    // ── Module 3: Fare Alerts ────────────────────────────────────────────────
    if (m1 === '3') {
      if (lvl === 1) return ussdReply(res, `CON Fare alerts:\nEnter route number\n(e.g. 111, 125, 23)`);
      if (lvl === 2) {
        const routeNum = m2.trim();
        try {
          await sql`INSERT INTO fare_alert_subs (phone_number, route_number)
                    VALUES (${p}, ${routeNum})
                    ON CONFLICT (phone_number, route_number) DO NOTHING`;
        } catch (_) {}
        await trySMS(p,
          `MatatuPulse: Fare alerts activated for Route ${routeNum}!\nWe'll SMS you when fares change.\nText STOP to 31333 to cancel.\nDial *384*3133# for more.`
        );
        return ussdReply(res, `END Alerts ON for Rt ${routeNum}!\nWe'll SMS fare changes.\nText STOP to cancel.`);
      }
    }

    // ── Module 4: Report Incident ────────────────────────────────────────────
    if (m1 === '4') {
      if (lvl === 1) return ussdReply(res, `CON Report incident:\n1. Accident\n2. Congestion\n3. Police check\n4. Roadworks\n5. Other`);
      if (lvl === 2) {
        const types: Record<string, string> = { '1':'accident','2':'congestion','3':'police','4':'roadworks','5':'other' };
        const type = types[m2] ?? 'other';
        try {
          await sql`INSERT INTO incident_reports (phone_number, incident_type, status)
                    VALUES (${p}, ${type}, 'active')`;
        } catch (_) {}
        await trySMS(p, `MatatuPulse: ${type} reported.\nOther commuters on the map will see this.\nThank you for keeping Nairobi safe!`);
        return ussdReply(res, `END ${type} reported!\nOther commuters notified.\nThank you!`);
      }
    }

    // ── Module 5: Emergency SOS ──────────────────────────────────────────────
    if (m1 === '5') {
      const contacts = (process.env.EMERGENCY_CONTACTS ?? '').split(',').filter(Boolean);
      for (const c of contacts) {
        await trySMS(c.trim(), `EMERGENCY SOS from ${p}!\nMatatuPulse USSD alert.\nPlease call immediately!`);
      }
      await trySMS(p, `SOS sent! Emergency contacts have been notified.\nStay calm. Help is coming.\nDial 999 if urgent.`);
      return ussdReply(res, `END SOS activated!\nEmergency contacts notified.\nStay safe. Dial 999 if needed.`);
    }

    return ussdReply(res, `END Invalid selection.\nDial *384*3133# to start again.`);

  } catch (err) {
    console.error('[USSD] Unhandled error:', err);
    ussdReply(res, `END Service error. Please try again.\nDial *384*3133#`);
  }
});

export default router;
