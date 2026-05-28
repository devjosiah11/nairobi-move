import { Router } from 'express';
import { sql } from '@nairobi-move/db';
import { sendSMS } from '../lib/at-mock.js';
import { logSMS } from '../lib/sms-log.js';

const router = Router();

/**
 * Africa's Talking USSD callback.
 *
 * The conductor's USSD code is *384*1#. AT POSTs:
 *   { sessionId, serviceCode, phoneNumber, text }
 * where `text` is the cumulative path so far, segments joined by `*`.
 *
 * Flow (trip-totals mode):
 *   ""                         → main menu (Start / End / Summary)
 *   "1"                        → ask for plate
 *   "1*<plate>"                → ask for route
 *   "1*<plate>*<routeIdx>"     → START trip (insert trips_recon row)
 *   "2"                        → find open trip, ask passenger count
 *   "2*<count>"                → ask cash
 *   "2*<count>*<cashKES>"      → CLOSE trip, compute variance, SMS receipt
 *   "3"                        → today's summary
 */
router.post('/', async (req, res) => {
  res.set('Content-Type', 'text/plain');

  try {
    const { sessionId, phoneNumber, text = '' } = req.body ?? {};

    if (!sessionId || !phoneNumber) {
      return res.send('END Missing session or phone. Try again.');
    }

    const phone = normalizePhone(phoneNumber);
    const parts = (text as string).split('*').filter((s) => s !== '');
    const level = parts.length;
    const top = parts[0];

    console.log(`[USSD] session=${sessionId} phone=${phone} text="${text}"`);

    // -- Main menu --------------------------------------------------------
    if (level === 0) {
      return res.send(
        'CON NairobiMove Waybill\n' +
          '1. Start trip\n' +
          '2. End trip\n' +
          '3. My summary',
      );
    }

    // -- Start trip flow --------------------------------------------------
    if (top === '1') {
      if (level === 1) {
        return res.send('CON Enter vehicle plate (e.g. KCA123G):');
      }

      const rawPlate = parts[1];
      const vehicle = await findVehicleByPlate(rawPlate);
      if (!vehicle) {
        return res.send(
          `END Vehicle "${rawPlate}" not found. Contact your SACCO to register.`,
        );
      }

      // Block if conductor already has an open trip
      const open = await sql`
        SELECT id FROM trips_recon
        WHERE conductor_phone = ${phone} AND status = 'open'
        LIMIT 1
      ` as any[];
      if (open.length > 0) {
        return res.send(
          'END You have an active trip. Use option 2 to end it first.',
        );
      }

      if (level === 2) {
        const routes = await listSeededRoutes();
        if (routes.length === 0) {
          return res.send('END No routes seeded. Contact admin.');
        }
        let menu = 'CON Select route:\n';
        routes.forEach((r, i) => {
          menu += `${i + 1}. ${r.name} (#${r.route_number})\n`;
        });
        return res.send(menu.trimEnd());
      }

      // level === 3 → route picked, START the trip
      const routeIdx = parseInt(parts[2], 10);
      const routes = await listSeededRoutes();
      const picked = routes[routeIdx - 1];
      if (!picked) {
        return res.send('END Invalid route choice. Start again.');
      }

      const peakRow = (await sql`SELECT is_peak_now() AS peak`) as any[];
      const peakFlag: boolean = !!peakRow[0]?.peak;

      const inserted = (await sql`
        INSERT INTO trips_recon
          (vehicle_id, conductor_phone, route_id, peak_flag, status, start_at)
        VALUES
          (${vehicle.id}, ${phone}, ${picked.id}, ${peakFlag}, 'open', NOW())
        RETURNING id
      `) as any[];

      const tripId = inserted[0].id;
      const peakLabel = peakFlag ? 'PEAK' : 'OFF-PEAK';

      const msg =
        `NairobiMove: trip started\n` +
        `Vehicle: ${vehicle.plate_number}\n` +
        `Route: ${picked.name}\n` +
        `Window: ${peakLabel}\n` +
        `End the trip via *384*1# option 2.`;
      await sendSMS(phone, msg);
      await logSMS('outbound', phone, msg, tripId);

      return res.send(
        `END Trip started: ${picked.name} (${peakLabel}). ` +
          `SMS sent. Dial again at trip end.`,
      );
    }

    // -- End trip flow ----------------------------------------------------
    if (top === '2') {
      const tripRows = (await sql`
        SELECT t.id, t.route_id, t.peak_flag, t.vehicle_id,
               r.name AS route_name, r.route_number, v.plate_number
        FROM trips_recon t
        JOIN routes r ON r.id = t.route_id
        JOIN vehicles v ON v.id = t.vehicle_id
        WHERE t.conductor_phone = ${phone} AND t.status = 'open'
        ORDER BY t.start_at DESC
        LIMIT 1
      `) as any[];

      if (tripRows.length === 0) {
        return res.send(
          'END No active trip. Start one with option 1 first.',
        );
      }
      const trip = tripRows[0];

      if (level === 1) {
        return res.send(
          `CON Ending trip ${trip.plate_number} on ${trip.route_name}.\n` +
            `Enter total passengers boarded:`,
        );
      }

      const passengers = parseInt(parts[1], 10);
      if (!Number.isFinite(passengers) || passengers <= 0 || passengers > 500) {
        return res.send('END Invalid passenger count. Start again.');
      }

      if (level === 2) {
        return res.send('CON Enter total cash collected (KES):');
      }

      const declared = parseInt(parts[2], 10);
      if (!Number.isFinite(declared) || declared < 0) {
        return res.send('END Invalid cash amount. Start again.');
      }

      // expected = passengers × avg_fare(route, peak/off_peak)
      const fareType = trip.peak_flag ? 'peak' : 'off_peak';
      const fareRows = (await sql`
        SELECT avg_fare FROM route_avg_fares
        WHERE route_id = ${trip.route_id} AND fare_type = ${fareType}
        LIMIT 1
      `) as any[];

      const avgFare = fareRows[0]?.avg_fare ?? 0;
      const expected = passengers * avgFare;
      const variance = declared - expected;
      const variancePct =
        expected > 0 ? Number(((variance / expected) * 100).toFixed(2)) : 0;
      const status = variancePct < -10 ? 'flagged' : 'closed';

      await sql`
        UPDATE trips_recon SET
          end_at = NOW(),
          passenger_count = ${passengers},
          declared_total_kes = ${declared},
          expected_total_kes = ${expected},
          variance_kes = ${variance},
          variance_pct = ${variancePct},
          status = ${status}
        WHERE id = ${trip.id}
      `;

      const sign = variance >= 0 ? '+' : '';
      const summary =
        `NairobiMove: trip closed\n` +
        `${trip.plate_number} ${trip.route_name}\n` +
        `Passengers: ${passengers} | Fare type: ${fareType}\n` +
        `Expected: KES ${expected}\n` +
        `Declared: KES ${declared}\n` +
        `Variance: ${sign}${variance} (${sign}${variancePct}%)\n` +
        (status === 'flagged' ? 'FLAGGED for review.' : 'Within tolerance.');

      await sendSMS(phone, summary);
      await logSMS('outbound', phone, summary, trip.id);

      return res.send(
        `END Trip closed. Variance ${sign}${variancePct}%. ` +
          `${status === 'flagged' ? 'FLAGGED.' : 'OK.'} SMS sent.`,
      );
    }

    // -- Today's summary --------------------------------------------------
    if (top === '3') {
      const stats = (await sql`
        SELECT
          COUNT(*)::int AS trips,
          COALESCE(SUM(passenger_count),0)::int AS passengers,
          COALESCE(SUM(declared_total_kes),0)::int AS declared,
          COALESCE(SUM(expected_total_kes),0)::int AS expected,
          COALESCE(SUM(CASE WHEN status='flagged' THEN 1 ELSE 0 END),0)::int AS flagged
        FROM trips_recon
        WHERE conductor_phone = ${phone}
          AND status IN ('closed','flagged')
          AND (start_at AT TIME ZONE 'Africa/Nairobi')::date
              = (NOW() AT TIME ZONE 'Africa/Nairobi')::date
      `) as any[];

      const s = stats[0];
      const variance = (s.declared as number) - (s.expected as number);
      const pct =
        s.expected > 0
          ? Number(((variance / s.expected) * 100).toFixed(1))
          : 0;
      const sign = variance >= 0 ? '+' : '';

      return res.send(
        `END Today: ${s.trips} trips, ${s.passengers} pax\n` +
          `Declared KES ${s.declared} vs expected KES ${s.expected}\n` +
          `Variance ${sign}${pct}% | Flagged: ${s.flagged}`,
      );
    }

    return res.send('END Invalid option. Dial *384*1# to start over.');
  } catch (err) {
    console.error('[waybill USSD] error:', err);
    res.send('END Service temporarily unavailable. Try again.');
  }
});

// ---------- helpers -----------------------------------------------------

function normalizePhone(input: string): string {
  if (!input) return input;
  // Form encoding can turn '+' into ' '; strip any whitespace before checking.
  const cleaned = input.replace(/\s+/g, '');
  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.startsWith('254')) return `+${cleaned}`;
  return `+254${cleaned.replace(/^0/, '')}`;
}

function normalizePlate(raw: string): string {
  return raw.toUpperCase().replace(/\s+/g, '');
}

async function findVehicleByPlate(raw: string) {
  const normalized = normalizePlate(raw);
  const rows = (await sql`
    SELECT id, plate_number
    FROM vehicles
    WHERE REPLACE(UPPER(plate_number), ' ', '') = ${normalized}
    LIMIT 1
  `) as any[];
  return rows[0] ?? null;
}

async function listSeededRoutes() {
  return (await sql`
    SELECT id, route_number, name
    FROM routes
    ORDER BY route_number
  `) as any[];
}

export default router;
