import { Router } from 'express';
import { sql } from '@nairobi-move/db';
import { sendSMS, logSMS } from '@nairobi-move/utils';
import { findRoutes, isPeakNow } from '../../src/lib/data.js';

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

// All logic is inline in the /incoming handler above.
if (false as boolean) {
  const handleSmsSOS = async (phoneNumber: string) => {
    await sql`INSERT INTO commuter_sos (phone_number, status) VALUES (${phoneNumber}, 'active')`;

    // Get user info
    const userResult = await sql`
      SELECT full_name FROM commuters WHERE phone_number = ${phoneNumber}
    `;

    const userName = userResult.length > 0 ? userResult[0].full_name : 'Commuter';

    // Send emergency SMS to contacts
    const emergencyContacts = process.env.EMERGENCY_CONTACTS?.split(',') || [];
    
    for (const contact of emergencyContacts) {
      const message = `EMERGENCY SOS: ${userName} (${phoneNumber}) needs immediate help!
SMS SOS activated. Please call immediately!`;
      
      try {
        await sendSMS(contact.trim(), message);
        await logSMS(sql, 'matatu-pulse', 'outbound', contact.trim(), message);
      } catch (error) {
        console.error(`Failed to send emergency SMS to ${contact}:`, error);
      }
    }

    // Send confirmation to user
    const confirmationMessage = `SOS activated! Help is on the way.
Emergency contacts notified. Stay safe.`;
    
    try {
      await sendSMS(phoneNumber, confirmationMessage);
      await logSMS(sql, 'matatu-pulse', 'outbound', phoneNumber, confirmationMessage);
    } catch (error) {
      console.error('Failed to send SOS confirmation:', error);
    }

    res.json({ status: 'success', message: 'SOS processed' });
  } catch (error) {
    console.error('SMS SOS error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to process SOS' });
  }
}

async function handleSmsFindMatatu(phoneNumber: string, routeNumber: string, res: any) {
  try {
    // Find active matatus on this route
    const matatusResult = await sql`
      SELECT 
        v.plate_number,
        v.driver_name,
        v.current_location,
        s.name as stage_name,
        v.last_updated
      FROM vehicles v
      JOIN stages s ON v.current_stage_id = s.id
      WHERE v.route_number = ${routeNumber.toUpperCase()}
      AND v.is_active = true
      AND v.last_updated >= NOW() - INTERVAL '30 minutes'
      ORDER BY v.last_updated DESC
      LIMIT 5
    `;

    let response;
    if (matatusResult.length === 0) {
      response = `No active matatus found on route ${routeNumber.toUpperCase()}.
Try again later or dial *384*3133# for more options.`;
    } else {
      response = `Route ${routeNumber.toUpperCase()} matatus:
${matatusResult.map(m => `${m.plate_number} at ${m.stage_name}`).join(', ')}
Last updated: ${new Date().toLocaleTimeString()}`;
    }
    
    try {
      await sendSMS(phoneNumber, response);
      await logSMS(sql, 'matatu-pulse', 'outbound', phoneNumber, response);
    } catch (error) {
      console.error('Failed to send matatu info SMS:', error);
    }

    res.json({ status: 'success', message: 'Matatu info sent' });
  } catch (error) {
    console.error('SMS find matatu error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to find matatus' });
  }
}

async function handleSmsTrafficReport(phoneNumber: string, reportText: string, res: any) {
  try {
    // Parse traffic report (e.g. "11 HEAVY" or "ACCIDENT ON THIKA ROAD")
    const parts = reportText.split(' ');
    const routeNumber = parts[0]?.toUpperCase();
    const trafficType = parts.slice(1).join(' ').toUpperCase();

    // Create traffic report
    await sql`
      INSERT INTO traffic_reports (phone_number, report_type, route_number, status, created_at)
      VALUES (${phoneNumber}, ${trafficType || 'UNKNOWN'}, ${routeNumber}, 'active', NOW())
    `;

    const response = `Traffic report received: ${trafficType || 'UNKNOWN'} on route ${routeNumber || 'UNKNOWN'}.
Thank you for helping other commuters!`;
    
    try {
      await sendSMS(phoneNumber, response);
      await logSMS(sql, 'matatu-pulse', 'outbound', phoneNumber, response);
    } catch (error) {
      console.error('Failed to send traffic confirmation:', error);
    }

    res.json({ status: 'success', message: 'Traffic report processed' });
  } catch (error) {
    console.error('SMS traffic report error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to process traffic report' });
  }
}

async function handleSmsIncidentReport(phoneNumber: string, incidentText: string, res: any) {
  try {
    // Create incident report
    await sql`
      INSERT INTO incident_reports (phone_number, incident_type, description, status, created_at)
      VALUES (${phoneNumber}, ${incidentText.split(' ')[0] || 'OTHER'}, ${incidentText}, 'active', NOW())
    `;

    const response = `Incident report received: ${incidentText}.
Thank you for reporting. Stay safe!`;
    
    try {
      await sendSMS(phoneNumber, response);
      await logSMS(sql, 'matatu-pulse', 'outbound', phoneNumber, response);
    } catch (error) {
      console.error('Failed to send incident confirmation:', error);
    }

    res.json({ status: 'success', message: 'Incident report processed' });
  } catch (error) {
    console.error('SMS incident report error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to process incident report' });
  }
}

async function handleSmsUnsubscribe(phoneNumber: string, res: any) {
  try {
    // Update user subscription status
    await sql`
      UPDATE commuters 
      SET sms_subscribed = false, updated_at = NOW()
      WHERE phone_number = ${phoneNumber}
    `;

    const response = `You have been unsubscribed from SMS alerts.
Dial *384*3133# to reactivate or text HELP for commands.`;
    
    try {
      await sendSMS(phoneNumber, response);
      await logSMS(sql, 'matatu-pulse', 'outbound', phoneNumber, response);
    } catch (error) {
      console.error('Failed to send unsubscribe confirmation:', error);
    }

    res.json({ status: 'success', message: 'User unsubscribed' });
  } catch (error) {
    console.error('SMS unsubscribe error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to unsubscribe' });
  }
}

async function handleSmsStatus(phoneNumber: string, res: any) {
  try {
    // Get user stats
    const userResult = await sql`
      SELECT * FROM commuters WHERE phone_number = ${phoneNumber}
    `;

    if (userResult.length === 0) {
      const response = `You're not registered. Dial *384*3133# to register.`;
      
      try {
        await sendSMS(phoneNumber, response);
        await logSMS(sql, 'matatu-pulse', 'outbound', phoneNumber, response);
      } catch (error) {
        console.error('Failed to send status SMS:', error);
      }
    } else {
      const user = userResult[0];
      const reportsCount = await sql`
        SELECT COUNT(*) as count FROM traffic_reports 
        WHERE phone_number = ${phoneNumber}
      `;
      
      const response = `Account: ${user.full_name}
Reports: ${reportsCount[0].count}
Member: ${user.created_at.toLocaleDateString()}
SMS alerts: ${user.sms_subscribed ? 'Active' : 'Inactive'}`;
      
      try {
        await sendSMS(phoneNumber, response);
        await logSMS(sql, 'matatu-pulse', 'outbound', phoneNumber, response);
      } catch (error) {
        console.error('Failed to send status SMS:', error);
      }
    }

    res.json({ status: 'success', message: 'Status sent' });
  } catch (error) {
    console.error('SMS status error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to get status' });
  }
}

export default router;
