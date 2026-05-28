/** Show passenger_reports + incentives counts (read-only). */
import 'dotenv/config';
import pg from 'pg';
const { Client } = pg;

async function main() {
  const c = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();

  const reports = await c.query(`
    SELECT plate, reported_fare_kes, reporter_phone, airtime_paid_kes,
           matched_trip_id IS NOT NULL AS matched,
           reported_at
    FROM passenger_reports
    ORDER BY reported_at DESC
    LIMIT 10
  `);
  console.log(`passenger_reports (${reports.rowCount}):`);
  console.dir(reports.rows, { depth: 3 });

  const incentives = await c.query(`
    SELECT recipient_phone, recipient_role, airtime_kes, reason, paid_at
    FROM incentives
    ORDER BY paid_at DESC
    LIMIT 10
  `);
  console.log(`\nincentives (${incentives.rowCount}):`);
  console.dir(incentives.rows, { depth: 3 });

  await c.end();
}
main().catch((e) => { console.error(e.message); process.exit(1); });
