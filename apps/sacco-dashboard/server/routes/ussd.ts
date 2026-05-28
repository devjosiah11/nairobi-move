import { Router } from 'express';
import { sql } from '@nairobi-move/db';
import { sendSMS, logSMS } from '@nairobi-move/utils';

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

// ─── USSD Handler — Africa's Talking *384*3138# ───────────────────────────────
// STATELESS: all state from `text`. No DB calls before res.send().
// Modules:
//   1 = Check vehicle compliance (enter plate)
//   2 = Send renewal reminder SMS to driver
//   3 = Report vehicle issue
//   4 = Fleet summary (compliant vs overdue count)

router.post('/', (req, res) => {
  const { phoneNumber, text } = req.body;
  const p = phone(phoneNumber ?? '');
  const parts = text ? (text as string).split('*') : [];
  const lvl = parts.length;
  const [m1, m2, m3] = parts;

  console.log(`[USSD:fleet] ${p} text="${text}"`);

  // ── Level 0: main menu ────────────────────────────────────────────────────
  if (lvl === 0 || text === '') {
    ussdReply(res, `CON FleetPulse USSD\n1. Check vehicle compliance\n2. Send renewal reminder\n3. Report vehicle issue\n4. Fleet summary`);
    return;
  }

  // ── Module 1: Check vehicle compliance ───────────────────────────────────
  // Flow: 1 → enter plate → show NTSA/insurance/PSV status
  if (m1 === '1') {
    if (lvl === 1) {
      ussdReply(res, `CON Check compliance:\nEnter vehicle plate\ne.g. KDA421X or KCJ089M`);
      return;
    }
    if (lvl === 2) {
      const plate = (m2 ?? '').trim().toUpperCase().replace(/\s/g, '');
      // Respond immediately, fetch data async and SMS it
      ussdReply(res, `END Checking ${plate}...\nCompliance details sent by SMS shortly.`);

      // Fire-and-forget DB lookup + SMS after reply
      (async () => {
        try {
          const rows = await sql`
            SELECT
              plate_number, driver_name, driver_phone,
              ntsa_expiry, insurance_expiry, psv_expiry,
              compliance_status(ntsa_expiry) as ntsa_status,
              compliance_status(insurance_expiry) as ins_status,
              compliance_status(psv_expiry) as psv_status
            FROM vehicles
            WHERE UPPER(REPLACE(plate_number,' ','')) = ${plate}
            LIMIT 1
          `;
          if (rows.length === 0) {
            await trySMS(p, `FleetPulse: Vehicle ${plate} not found in your fleet.\nDial *384*3138# to try again.`);
            return;
          }
          const v = rows[0];
          const msg =
            `FleetPulse: ${v.plate_number} (${v.driver_name})\n` +
            `NTSA: ${statusLabel(v.ntsa_status)} — expires ${fmt(v.ntsa_expiry)}\n` +
            `Insurance: ${statusLabel(v.ins_status)} — expires ${fmt(v.insurance_expiry)}\n` +
            `PSV: ${statusLabel(v.psv_status)} — expires ${fmt(v.psv_expiry)}\n` +
            `Dial *384*3138# for more.`;
          await trySMS(p, msg);
        } catch (e) {
          console.error('[USSD:fleet] compliance lookup error', e);
        }
      })();
      return;
    }
  }

  // ── Module 2: Send renewal reminder to driver ─────────────────────────────
  // Flow: 2 → enter plate → pick doc type → sends SMS to driver
  if (m1 === '2') {
    if (lvl === 1) {
      ussdReply(res, `CON Send reminder:\nEnter vehicle plate\ne.g. KDA421X`);
      return;
    }
    if (lvl === 2) {
      const plate = (m2 ?? '').trim().toUpperCase().replace(/\s/g, '');
      ussdReply(res, `CON Plate: ${plate}\nWhich document?\n1. NTSA inspection\n2. Insurance\n3. PSV licence\n4. All`);
      return;
    }
    if (lvl === 3) {
      const plate = (m2 ?? '').trim().toUpperCase().replace(/\s/g, '');
      const docMap: Record<string, string> = { '1': 'NTSA inspection', '2': 'Insurance', '3': 'PSV licence', '4': 'All documents' };
      const docLabel = docMap[m3] ?? 'documents';
      ussdReply(res, `END Reminder sent to driver of ${plate}\nfor ${docLabel}.\nFleetPulse notified.`);

      (async () => {
        try {
          const rows = await sql`
            SELECT plate_number, driver_name, driver_phone,
              ntsa_expiry, insurance_expiry, psv_expiry
            FROM vehicles
            WHERE UPPER(REPLACE(plate_number,' ','')) = ${plate}
            LIMIT 1
          `;
          if (rows.length === 0) return;
          const v = rows[0];
          const driverPhone = v.driver_phone;

          let msg = `FleetPulse REMINDER: Dear ${v.driver_name}, `;
          if (m3 === '1') msg += `your NTSA inspection expires ${fmt(v.ntsa_expiry)}. Please renew urgently.`;
          else if (m3 === '2') msg += `your Insurance expires ${fmt(v.insurance_expiry)}. Please renew urgently.`;
          else if (m3 === '3') msg += `your PSV licence expires ${fmt(v.psv_expiry)}. Please renew urgently.`;
          else msg +=
            `NTSA: ${fmt(v.ntsa_expiry)}, Insurance: ${fmt(v.insurance_expiry)}, PSV: ${fmt(v.psv_expiry)}. Please renew all expiring docs.`;

          msg += `\nVehicle: ${v.plate_number}`;
          if (driverPhone) await trySMS(driverPhone, msg);
          // Also notify the manager who dialed
          await trySMS(p, `FleetPulse: Reminder sent to ${v.driver_name} (${v.plate_number}) for ${docLabel}.`);

          // Log compliance event
          await sql`INSERT INTO compliance_events (vehicle_id, doc_type, event_type, notes)
            SELECT id, ${m3 === '4' ? 'all' : docLabel.toLowerCase()}, 'reminder_sent', ${'USSD reminder by ' + p}
            FROM vehicles WHERE UPPER(REPLACE(plate_number,' ','')) = ${plate}`.catch(() => {});
        } catch (e) {
          console.error('[USSD:fleet] reminder error', e);
        }
      })();
      return;
    }
  }

  // ── Module 3: Report vehicle issue ────────────────────────────────────────
  // Flow: 3 → issue type → enter plate → saved + notified
  if (m1 === '3') {
    if (lvl === 1) {
      ussdReply(res, `CON Report vehicle issue:\n1. Mechanical breakdown\n2. Accident\n3. Road unfit\n4. Driver absence\n5. Other`);
      return;
    }
    if (lvl === 2) {
      ussdReply(res, `CON Enter vehicle plate:\ne.g. KDA421X`);
      return;
    }
    if (lvl === 3) {
      const issueMap: Record<string, string> = {
        '1': 'mechanical breakdown', '2': 'accident',
        '3': 'road unfit', '4': 'driver absence', '5': 'other'
      };
      const issue = issueMap[m2] ?? 'other';
      const plate = (m3 ?? '').trim().toUpperCase().replace(/\s/g, '');
      ussdReply(res, `END ${issue} reported for ${plate}.\nFleet manager notified.\nAsante!`);

      (async () => {
        try {
          // Log compliance event
          await sql`INSERT INTO compliance_events (vehicle_id, doc_type, event_type, notes)
            SELECT id, 'other', 'issue_reported', ${issue + ' — reported via USSD by ' + p}
            FROM vehicles WHERE UPPER(REPLACE(plate_number,' ','')) = ${plate}`.catch(() => {});
          // SMS to manager who reported
          await trySMS(p, `FleetPulse: ${issue} reported for ${plate}. Check your dashboard for details.`);
        } catch (e) {
          console.error('[USSD:fleet] issue report error', e);
        }
      })();
      return;
    }
  }

  // ── Module 4: Fleet summary ───────────────────────────────────────────────
  // Immediate reply, then fire SMS with counts
  if (m1 === '4') {
    ussdReply(res, `END Fetching fleet summary...\nWe'll SMS your stats shortly.`);

    (async () => {
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
        const msg =
          `FleetPulse Summary:\n` +
          `Total vehicles: ${s.total}\n` +
          `Compliant: ${s.compliant}\n` +
          `Expiring soon: ${s.expiring}\n` +
          `Expired/Overdue: ${s.overdue}\n` +
          `Open FleetPulse dashboard for full details.`;
        await trySMS(p, msg);
      } catch (e) {
        console.error('[USSD:fleet] summary error', e);
      }
    })();
    return;
  }

  ussdReply(res, `END Invalid selection.\nDial *384*3138# to start again.`);
});

export default router;
