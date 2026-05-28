import { Router } from 'express';
import { sql } from '@nairobi-move/db';
import { sendSMS, logSMS } from '@nairobi-move/utils';
import { findRoutes, isPeakNow, suggestPlace } from '../lib/fare-data.js';

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


// ─── USSD Handler — Africa's Talking *384*3133# ───────────────────────────────
// Fully STATELESS: all state derived from `text` field, no session DB table.
// text = '' (main), '1' (fare: ask from), '1*CBD' (fare: ask to),
//         '1*CBD*Rongai' (fare: respond)
// Modules: 1=Check Fare, 2=Find Route, 3=Fare Alerts, 4=Report Incident, 5=SOS

router.post('/', (req, res) => {
  const { phoneNumber, text } = req.body;
  const p = phone(phoneNumber ?? '');
  const parts = text ? (text as string).split('*') : [];
  const lvl = parts.length;
  const [m1, m2, m3] = parts;

  console.log(`[USSD] ${p} text="${text}"`);

  // ── Determine reply synchronously — NO awaits before res.send ──────────────
  // All DB writes and SMS sends happen AFTER we reply to AT.

  // Level 0: main menu
  if (lvl === 0 || text === '') {
    ussdReply(res, `CON Karibu MatatuPulse!\n1. Check fare\n2. Find route\n3. Fare alerts\n4. Report incident`);
    return;
  }

  // ── Module 1: Check Fare ──────────────────────────────────────────────────
  if (m1 === '1') {
    if (lvl === 1) { ussdReply(res, `CON Check fare:\nEnter FROM stage\ne.g. CBD, Westlands, Karen`); return; }
    if (lvl === 2) {
      const suggested = suggestPlace(m2);
      ussdReply(res, `CON From ${suggested}.\nEnter TO stage\ne.g. Rongai, Thika, Eastleigh`);
      return;
    }
    if (lvl === 3) {
      const info = fareText(m2, m3);
      ussdReply(res, `END ${info}\nSMS with full details sent.`);
      trySMS(p, fareSMS(m2, m3));
      return;
    }
  }

  // ── Module 2: Find Route ──────────────────────────────────────────────────
  if (m1 === '2') {
    if (lvl === 1) { ussdReply(res, `CON Find route:\nEnter FROM stage\ne.g. CBD, Ngong Road`); return; }
    if (lvl === 2) {
      const suggested = suggestPlace(m2);
      ussdReply(res, `CON From ${suggested}.\nEnter TO stage\ne.g. Rongai, Karen, Kikuyu`);
      return;
    }
    if (lvl === 3) {
      const routes = findRoutes(m2, m3);
      if (routes.length === 0) {
        const sug = suggestPlace(m3);
        ussdReply(res, `END No routes found.\nDid you mean ${sug}?\nDial *384*3133# & try again.`);
        return;
      }
      const peak = isPeakNow();
      const lines = routes.slice(0, 3).map(r => {
        const [lo, hi] = peak ? r.farePeak : r.fareOffPeak;
        return `Rt ${r.number}: KES ${lo}-${hi}`;
      }).join('\n');
      ussdReply(res, `END Routes ${suggestPlace(m2)}>${suggestPlace(m3)}:\n${lines}\nFull list sent by SMS.`);
      trySMS(p, fareSMS(m2, m3));
      return;
    }
  }

  // ── Module 3: Fare Alerts ─────────────────────────────────────────────────
  if (m1 === '3') {
    if (lvl === 1) { ussdReply(res, `CON Fare alerts:\nEnter route number\n(e.g. 111, 125, 23)`); return; }
    if (lvl === 2) {
      const routeNum = m2.trim();
      ussdReply(res, `END Alerts ON for Rt ${routeNum}!\nWe'll SMS fare changes.\nText STOP to 31333 to cancel.`);
      // DB write + SMS after reply
      sql`INSERT INTO fare_alert_subs (phone_number, route_number)
          VALUES (${p}, ${routeNum})
          ON CONFLICT (phone_number, route_number) DO NOTHING`.catch(() => {});
      trySMS(p, `MatatuPulse: Fare alerts ON for Route ${routeNum}!\nWe'll SMS you when fares change.\nText STOP to 31333 to cancel.`);
      return;
    }
  }

  // ── Module 4: Report Incident ─────────────────────────────────────────────
  // Flow: 4 → type → location → saved
  if (m1 === '4') {
    if (lvl === 1) {
      ussdReply(res, `CON Report incident:\n1. Accident\n2. Congestion\n3. Police check\n4. Roadworks\n5. Other`);
      return;
    }
    if (lvl === 2) {
      ussdReply(res, `CON Enter location:\nUse landmark & road\ne.g. Odeon Cinema Moi Ave\nor Rongai Stage Langata Rd`);
      return;
    }
    if (lvl === 3) {
      const types: Record<string, string> = { '1':'accident','2':'congestion','3':'police check','4':'roadworks','5':'other' };
      const type = types[m2] ?? 'other';
      const location = m3 ?? '';
      ussdReply(res, `END ${type} at ${location} reported!\nVisible to all commuters on map.\nAsante!`);
      // fire-and-forget after reply
      sql`INSERT INTO incident_reports (phone_number, incident_type, description, status)
          VALUES (${p}, ${type}, ${location}, 'active')`.catch(() => {});
      trySMS(p, `MatatuPulse: ${type} reported at ${location}.\nOther commuters can see this on the map. Thank you!`);
      return;
    }
  }

  ussdReply(res, `END Invalid selection.\nDial *384*3133# to start again.`);
});

export default router;
