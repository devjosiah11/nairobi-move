import { Router } from 'express';
import { sql } from '@nairobi-move/db';
import { sendSMS } from '../lib/at-mock.js';
import { logSMS } from '../lib/sms-log.js';
import { payIncentive } from '../lib/incentives.js';

const router = Router();

/**
 * Africa's Talking inbound SMS callback (POST /api/sms/incoming).
 *
 * Expected payload (form-urlencoded):
 *   from   - sender's phone (e.g. +254712...)
 *   to     - our shortcode
 *   text   - message body
 *   id     - AT's message id (unused, but logged)
 *   date   - timestamp
 *
 * Only the PAID keyword is handled in this module. Other keywords are
 * already routed through matatu-pulse.
 *
 *   PAID <plate> <amount> [optional from-to]
 *   e.g. "PAID KCA123G 80"  or  "paid kca 123g 100 westlands-cbd"
 */
router.post('/incoming', async (req, res) => {
  try {
    const from = normalizePhone(String(req.body?.from ?? ''));
    const text = String(req.body?.text ?? '').trim();

    console.log(`[SMS in] from=${from} text="${text}"`);

    if (!from || !text) {
      return res.json({ ok: false, error: 'missing from/text' });
    }
    await logSMS('inbound', from, text);

    const firstWord = text.split(/\s+/)[0].toUpperCase();
    if (firstWord !== 'PAID') {
      // Not our keyword — quietly acknowledge so AT doesn't retry.
      return res.json({ ok: true, ignored: true });
    }

    const parsed = parsePaidMessage(text);
    if (!parsed) {
      await replyAndLog(
        from,
        'NairobiMove: format is "PAID <plate> <amount>" e.g. PAID KCA123G 80',
      );
      return res.json({ ok: false, error: 'bad_format' });
    }

    const result = await handlePaidReport({
      reporterPhone: from,
      plate: parsed.plate,
      reportedFare: parsed.amount,
      fromStage: parsed.fromStage,
      toStage: parsed.toStage,
    });

    return res.json({ ok: true, ...result });
  } catch (err) {
    console.error('[SMS in] error:', err);
    res.json({ ok: false, error: 'internal' });
  }
});

// ---- core handler ----------------------------------------------------------

async function handlePaidReport(p: {
  reporterPhone: string;
  plate: string;
  reportedFare: number;
  fromStage?: string;
  toStage?: string;
}) {
  // Vehicle exists?
  const vehicleRows = (await sql`
    SELECT id, plate_number FROM vehicles
    WHERE REPLACE(UPPER(plate_number), ' ', '') = ${p.plate}
    LIMIT 1
  `) as any[];

  if (vehicleRows.length === 0) {
    await replyAndLog(
      p.reporterPhone,
      `NairobiMove: plate "${p.plate}" not in our system. ` +
        `Verify and try again.`,
    );
    return { matched: false, reason: 'vehicle_not_found' };
  }
  const vehicle = vehicleRows[0];

  // Find the most recent relevant trip on this vehicle (last 2h).
  const tripRows = (await sql`
    SELECT t.id, t.route_id, t.peak_flag, t.status,
           t.expected_total_kes, t.passenger_count
    FROM trips_recon t
    WHERE t.vehicle_id = ${vehicle.id}
      AND t.start_at > NOW() - INTERVAL '2 hours'
    ORDER BY t.start_at DESC
    LIMIT 1
  `) as any[];

  const trip = tripRows[0] ?? null;

  // Compute fare envelope (min..max) for the trip's fare window.
  let envelope: { fareType: string; min: number; max: number } | null = null;
  let anomaly = false;

  if (trip) {
    const fareType = trip.peak_flag ? 'peak' : 'off_peak';
    const fareRows = (await sql`
      SELECT min_fare, max_fare FROM fares
      WHERE route_id = ${trip.route_id} AND fare_type = ${fareType}
      LIMIT 1
    `) as any[];
    if (fareRows[0]) {
      envelope = {
        fareType,
        min: fareRows[0].min_fare,
        max: fareRows[0].max_fare,
      };
      // Anomaly: passenger paid clearly outside this window.
      // (e.g. conductor logged off_peak but passenger paid peak fare)
      anomaly =
        p.reportedFare > envelope.max + 5 || p.reportedFare < envelope.min - 5;
    }
  }

  // Insert passenger report.
  const inserted = (await sql`
    INSERT INTO passenger_reports
      (plate, reported_fare_kes, from_stage, to_stage, reporter_phone, matched_trip_id)
    VALUES
      (${vehicle.plate_number}, ${p.reportedFare},
       ${p.fromStage ?? null}, ${p.toStage ?? null},
       ${p.reporterPhone}, ${trip?.id ?? null})
    RETURNING id
  `) as any[];
  const reportId = inserted[0].id as string;

  // Airtime payout: KES 2 default, KES 10 if anomaly match.
  const airtime = anomaly ? 10 : 2;
  await payIncentive({
    recipientPhone: p.reporterPhone,
    role: 'passenger',
    amountKES: airtime,
    reason: anomaly ? 'anomaly_match' : 'spot_check',
    relatedId: reportId,
  });

  // Update the airtime_paid column on the report (audit trail).
  await sql`
    UPDATE passenger_reports SET airtime_paid_kes = ${airtime}
    WHERE id = ${reportId}
  `;

  // Reply.
  let replyText: string;
  if (!trip) {
    replyText =
      `NairobiMove: thanks. KES ${airtime} airtime credited.\n` +
      `Note: no recent active trip on ${vehicle.plate_number}.`;
  } else if (anomaly && envelope) {
    replyText =
      `NairobiMove: thanks - flagged as anomaly.\n` +
      `You paid KES ${p.reportedFare} but conductor logged ${envelope.fareType} ` +
      `(KES ${envelope.min}-${envelope.max}).\n` +
      `Airtime: KES ${airtime} credited.`;
  } else {
    replyText =
      `NairobiMove: thanks for confirming KES ${p.reportedFare} on ${vehicle.plate_number}.\n` +
      `Airtime: KES ${airtime} credited.`;
  }
  await replyAndLog(p.reporterPhone, replyText, reportId);

  return {
    matched: !!trip,
    anomaly,
    airtimeKES: airtime,
    reportId,
    tripId: trip?.id ?? null,
  };
}

// ---- helpers ---------------------------------------------------------------

async function replyAndLog(to: string, message: string, relatedId?: string) {
  await sendSMS(to, message);
  await logSMS('outbound', to, message, relatedId);
}

function normalizePhone(input: string): string {
  if (!input) return input;
  const cleaned = input.replace(/\s+/g, '');
  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.startsWith('254')) return `+${cleaned}`;
  return `+254${cleaned.replace(/^0/, '')}`;
}

/**
 * Parses "PAID <plate> <amount> [from-to]".
 * Plate may contain a space (e.g. "KCA 123G"); we accept tokens until the
 * first all-numeric token, treat that as amount, rest as optional route hint.
 */
function parsePaidMessage(text: string): {
  plate: string;
  amount: number;
  fromStage?: string;
  toStage?: string;
} | null {
  const tokens = text.trim().split(/\s+/);
  if (tokens[0].toUpperCase() !== 'PAID') return null;

  const rest = tokens.slice(1);
  let amountIdx = rest.findIndex((t) => /^\d{1,5}$/.test(t));
  if (amountIdx <= 0) return null; // need at least one plate token before the amount

  const plateTokens = rest.slice(0, amountIdx);
  const amount = Number.parseInt(rest[amountIdx], 10);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 10_000) return null;

  const plate = plateTokens.join('').toUpperCase();

  const tail = rest.slice(amountIdx + 1).join(' ');
  let fromStage: string | undefined;
  let toStage: string | undefined;
  if (tail) {
    const m = tail.match(/^([\w]+)\s*-\s*([\w]+)$/);
    if (m) {
      fromStage = m[1];
      toStage = m[2];
    }
  }

  return { plate, amount, fromStage, toStage };
}

export default router;
