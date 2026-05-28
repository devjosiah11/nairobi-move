import { Router } from 'express';
import { sql } from '@nairobi-move/db';
import { sendSMS, logSMS } from '@nairobi-move/utils';
import { findRoutes, isPeakNow } from '../lib/fare-data.js';

const router = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalise(raw: string) {
  return raw.startsWith('+') ? raw : `+254${raw.replace(/^0/, '')}`;
}

async function reply(phone: string, msg: string) {
  try {
    await sendSMS(phone, msg);
    await logSMS(sql, 'matatu-pulse', 'outbound', phone, msg);
  } catch (_) {}
}

function fareReply(args: string[]): string {
  if (args.length < 2) return `Usage: FARE CBD RONGAI\nDial *384*3133# for the full menu.`;
  const [from, ...rest] = args;
  const to = rest.join(' ');
  const routes = findRoutes(from, to);
  if (routes.length === 0) return `No routes found from ${from} to ${to}.\nCheck spelling and try again.\nDial *384*3133# for help.`;
  const peak = isPeakNow();
  const lines = routes.slice(0, 4).map(r =>
    `Rt ${r.number}: off-peak KES ${r.fareOffPeak[0]}-${r.fareOffPeak[1]}, peak KES ${r.farePeak[0]}-${r.farePeak[1]}`
  );
  const now = peak ? 'PEAK now — higher fares apply.' : 'OFF-PEAK now — best fares now.';
  return `MatatuPulse fares ${from.toUpperCase()}>${to.toUpperCase()}:\n${lines.join('\n')}\n${now}`;
}

function routeReply(args: string[]): string {
  if (args.length < 2) return `Usage: ROUTE CBD RONGAI\nDial *384*3133# for full menu.`;
  const [from, ...rest] = args;
  const to = rest.join(' ');
  const routes = findRoutes(from, to);
  if (routes.length === 0) return `No routes found ${from} to ${to}.\nCheck spelling & try again.`;
  const peak = isPeakNow();
  const lines = routes.slice(0, 5).map(r => {
    const [lo, hi] = peak ? r.farePeak : r.fareOffPeak;
    return `Rt ${r.number} — ${r.from}>${r.to}: KES ${lo}-${hi}`;
  });
  return `Routes ${from.toUpperCase()}>${to.toUpperCase()}:\n${lines.join('\n')}\nDial *384*3133# for USSD.`;
}

// ─── POST /api/sms/incoming ───────────────────────────────────────────────────

router.post('/incoming', async (req, res) => {
  try {
    const { from, to, text } = req.body;
    console.log(`[SMS] From: ${from}, Text: "${text}"`);

    const p = normalise(from ?? '');
    const raw = (text ?? '').trim();
    const upper = raw.toUpperCase();
    const words = upper.split(/\s+/);
    const cmd = words[0];
    const args = words.slice(1);   // remaining words, already upper-cased

    let response = '';

    if (cmd === 'HELP' || cmd === 'MENU' || raw === '') {
      response = `MatatuPulse (Shortcode 31333):\nFARE CBD RONGAI — check fares\nROUTE CBD KAREN — find routes\nALERTS 111 — get fare alerts\nREPORT ACCIDENT — report incident\nSOS — emergency help\nSTOP — cancel alerts\nDial *384*3133# for USSD`;
    } else if (cmd === 'FARE') {
      response = fareReply(args.map(a => a.toLowerCase()));
    } else if (cmd === 'ROUTE' || cmd === 'FIND') {
      response = routeReply(args.map(a => a.toLowerCase()));
    } else if (cmd === 'ALERTS' || cmd === 'ALERT') {
      const routeNum = args[0] ?? '';
      if (!routeNum) {
        response = `Usage: ALERTS 111\nDial *384*3133# to subscribe via USSD.`;
      } else {
        try {
          await sql`INSERT INTO fare_alert_subs (phone_number, route_number)
                    VALUES (${p}, ${routeNum})
                    ON CONFLICT (phone_number, route_number) DO NOTHING`;
        } catch (_) {}
        response = `Fare alerts ON for Route ${routeNum}!\nWe'll SMS you when fares change.\nText STOP to cancel.`;
      }
    } else if (cmd === 'REPORT') {
      const type = args[0]?.toLowerCase() ?? 'other';
      try {
        await sql`INSERT INTO incident_reports (phone_number, incident_type, status)
                  VALUES (${p}, ${type}, 'active')`;
      } catch (_) {}
      response = `${type} reported! Other commuters on the map will see this.\nThank you for keeping Nairobi safe!`;
    } else if (cmd === 'SOS') {
      const contacts = (process.env.EMERGENCY_CONTACTS ?? '').split(',').filter(Boolean);
      for (const c of contacts) {
        await reply(c.trim(), `EMERGENCY SOS from ${p}!\nMatatuPulse SMS alert.\nPlease call immediately!`);
      }
      response = `SOS sent! Emergency contacts notified.\nStay calm. Dial 999 if urgent.`;
    } else if (cmd === 'STOP') {
      try {
        await sql`UPDATE commuters SET sms_subscribed=false WHERE phone_number=${p}`;
        await sql`DELETE FROM fare_alert_subs WHERE phone_number=${p}`;
      } catch (_) {}
      response = `You have been unsubscribed from all MatatuPulse alerts.\nDial *384*3133# or text ALERTS 111 to reactivate.`;
    } else {
      response = `Unknown command "${cmd}".\nText HELP for commands.\nDial *384*3133# for USSD menu.`;
    }

    await reply(p, response);
    res.json({ status: 'success' });
  } catch (error) {
    console.error('[SMS incoming] error:', error);
    res.status(500).json({ status: 'error' });
  }
});

// Delivery callback from Africa's Talking
router.post('/delivery', async (req, res) => {
  try {
    const { id, status, failureReason } = req.body;
    
    console.log(`[SMS Delivery] ID: ${id}, Status: ${status}, Reason: ${failureReason}`);
    
    // Update SMS delivery status in database
    await sql`
      UPDATE sms_logs 
      SET delivery_status = ${status}, delivery_reason = ${failureReason || null}, delivered_at = NOW()
      WHERE external_id = ${id}
    `;

    res.json({ status: 'success' });
  } catch (error) {
    console.error('SMS delivery callback error:', error);
    res.status(500).json({ status: 'error' });
  }
});

export default router;
