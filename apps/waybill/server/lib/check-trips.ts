/** Show latest trips_recon rows (read-only) to confirm USSD writes landed. */
import 'dotenv/config';
import pg from 'pg';
const { Client } = pg;

async function main() {
  const c = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();
  const r = await c.query(`
    SELECT
      t.id, t.conductor_phone, t.peak_flag, t.passenger_count,
      t.declared_total_kes, t.expected_total_kes, t.variance_pct, t.status,
      v.plate_number, r.name AS route_name
    FROM trips_recon t
    JOIN vehicles v ON v.id = t.vehicle_id
    JOIN routes r ON r.id = t.route_id
    ORDER BY t.start_at DESC
    LIMIT 5
  `);
  console.log(`latest ${r.rowCount} trip(s):`);
  console.dir(r.rows, { depth: 3 });
  await c.end();
}
main().catch((e) => { console.error(e.message); process.exit(1); });
