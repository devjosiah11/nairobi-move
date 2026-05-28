import { Router } from 'express';
import { sql } from '@nairobi-move/db';
import { sendSMS, logSMS } from '@nairobi-move/utils';

const router = Router();

function phone(raw: string) {
  return raw.startsWith('+') ? raw : `+254${raw.replace(/^0/, '')}`;
}

async function reply(to: string, msg: string) {
  try {
    await sendSMS(to, msg);
    await logSMS(sql, 'fleet-pulse', 'outbound', to, msg);
  } catch (_) {}
}

function fmt(d: string | null): string {
  if (!d) return 'N/A';
  return new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' });
}

function statusLabel(s: string | null): string {
  if (s === 'overdue') return 'EXPIRED';
  if (s === 'expiring') return 'EXPIRING SOON';
  return 'OK';
}

// POST /api/ussd-sms/incoming — Africa's Talking inbound SMS webhook
router.post('/incoming', async (req, res) => {
  // AT sends: from, to, text, date, id
  const from = phone(req.body.from ?? req.body.phoneNumber ?? '');
  const rawText: string = (req.body.text ?? req.body.message ?? '').trim();
  const text = rawText.toUpperCase();

  console.log(`[SMS:fleet] from=${from} text="${rawText}"`);
  res.sendStatus(200); // acknowledge AT immediately

  // Log inbound
  logSMS(sql, 'fleet-pulse', 'inbound', from, rawText).catch(() => {});

  // ── Commands ──────────────────────────────────────────────────────────────
  // CHECK <plate>  — compliance status
  // REMIND <plate> — send renewal reminder to driver
  // SUMMARY        — fleet overview
  // HELP           — list commands

  if (text.startsWith('CHECK ')) {
    const plate = text.replace('CHECK ', '').trim().replace(/\s/g, '');
    try {
      const rows = await sql`
        SELECT plate_number, driver_name, driver_phone,
          ntsa_expiry, insurance_expiry, psv_expiry,
          compliance_status(ntsa_expiry) as ntsa_status,
          compliance_status(insurance_expiry) as ins_status,
          compliance_status(psv_expiry) as psv_status
        FROM vehicles
        WHERE UPPER(REPLACE(plate_number,' ','')) = ${plate}
        LIMIT 1
      `;
      if (rows.length === 0) {
        await reply(from, `FleetPulse: ${plate} not found. Text CHECK <plate> to try again.`);
        return;
      }
      const v = rows[0];
      await reply(from,
        `FleetPulse: ${v.plate_number} (${v.driver_name})\n` +
        `NTSA: ${statusLabel(v.ntsa_status)} — ${fmt(v.ntsa_expiry)}\n` +
        `Insurance: ${statusLabel(v.ins_status)} — ${fmt(v.insurance_expiry)}\n` +
        `PSV: ${statusLabel(v.psv_status)} — ${fmt(v.psv_expiry)}`
      );
    } catch (e) {
      await reply(from, `FleetPulse: Could not fetch details. Try again shortly.`);
    }
    return;
  }

  if (text.startsWith('REMIND ')) {
    const plate = text.replace('REMIND ', '').trim().replace(/\s/g, '');
    try {
      const rows = await sql`
        SELECT plate_number, driver_name, driver_phone,
          ntsa_expiry, insurance_expiry, psv_expiry
        FROM vehicles
        WHERE UPPER(REPLACE(plate_number,' ','')) = ${plate}
        LIMIT 1
      `;
      if (rows.length === 0) {
        await reply(from, `FleetPulse: ${plate} not found.`);
        return;
      }
      const v = rows[0];
      const msg =
        `FleetPulse REMINDER: Dear ${v.driver_name}, please check your vehicle documents.\n` +
        `NTSA: ${fmt(v.ntsa_expiry)}\n` +
        `Insurance: ${fmt(v.insurance_expiry)}\n` +
        `PSV: ${fmt(v.psv_expiry)}\n` +
        `Vehicle: ${v.plate_number}`;
      if (v.driver_phone) await reply(v.driver_phone, msg);
      await reply(from, `FleetPulse: Renewal reminder sent to ${v.driver_name} (${v.plate_number}).`);
    } catch (e) {
      await reply(from, `FleetPulse: Could not send reminder. Try again shortly.`);
    }
    return;
  }

  if (text === 'SUMMARY') {
    try {
      const rows = await sql`
        SELECT
          COUNT(*) FILTER (WHERE
            compliance_status(ntsa_expiry) = 'compliant' AND
            compliance_status(insurance_expiry) = 'compliant' AND
            compliance_status(psv_expiry) = 'compliant'
          ) AS compliant,
          COUNT(*) FILTER (WHERE
            compliance_status(ntsa_expiry) = 'overdue' OR
            compliance_status(insurance_expiry) = 'overdue' OR
            compliance_status(psv_expiry) = 'overdue'
          ) AS overdue,
          COUNT(*) FILTER (WHERE
            compliance_status(ntsa_expiry) = 'expiring' OR
            compliance_status(insurance_expiry) = 'expiring' OR
            compliance_status(psv_expiry) = 'expiring'
          ) AS expiring,
          COUNT(*) AS total
        FROM vehicles
      `;
      const s = rows[0];
      await reply(from,
        `FleetPulse Summary:\nTotal: ${s.total} vehicles\nCompliant: ${s.compliant}\nExpiring: ${s.expiring}\nOverdue: ${s.overdue}`
      );
    } catch (e) {
      await reply(from, `FleetPulse: Could not fetch summary. Try again shortly.`);
    }
    return;
  }

  // Default: HELP
  await reply(from,
    `FleetPulse SMS Commands:\nCHECK <plate> — compliance status\nREMIND <plate> — send driver reminder\nSUMMARY — fleet overview\nOr dial *384*3138# for USSD menu.`
  );
});

// POST /api/ussd-sms/delivery — delivery report webhook
router.post('/delivery', (req, res) => {
  console.log('[SMS:fleet] delivery report', req.body);
  res.sendStatus(200);
});

export default router;
