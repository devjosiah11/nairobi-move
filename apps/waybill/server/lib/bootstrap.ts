/**
 * One-shot DB bootstrap for a fresh Neon branch:
 *   1. DROP 3 stale tables (user-confirmed, branch is effectively empty)
 *   2. Apply shared/db/schema.sql (master schema + seeds)
 *   3. Apply shared/db/schema-waybill.sql (waybill module)
 *   4. Verify
 */
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import pg from 'pg';

const { Client } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));
const dbDir = resolve(__dirname, '../../../../shared/db');

async function run(client: pg.Client, label: string, sql: string) {
  console.log(`\n[bootstrap] ${label} (${sql.length} bytes) …`);
  await client.query(sql);
  console.log(`[bootstrap] ${label} ✓`);
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not set');
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  console.log(`[bootstrap] connected`);

  try {
    await run(
      client,
      'drop stale tables',
      `DROP TABLE IF EXISTS commuters, fare_alert_subs, incident_reports CASCADE;`,
    );

    const master = readFileSync(resolve(dbDir, 'schema.sql'), 'utf-8');
    await run(client, 'apply schema.sql (master)', master);

    const waybill = readFileSync(resolve(dbDir, 'schema-waybill.sql'), 'utf-8');
    await run(client, 'apply schema-waybill.sql', waybill);

    const tables = await client.query<{ tablename: string }>(`
      SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename
    `);
    console.log(`\n[bootstrap] tables (${tables.rowCount}):`);
    for (const t of tables.rows) console.log(`  - ${t.tablename}`);

    const seeded = await client.query(`
      SELECT v.plate_number, c.full_name, c.phone_number
      FROM conductors c JOIN vehicles v ON v.id = c.vehicle_id
      WHERE c.phone_number = '+254712345678'
    `);
    if (seeded.rowCount && seeded.rowCount > 0) {
      const r = seeded.rows[0];
      console.log(
        `\n[bootstrap] seeded conductor: ${r.full_name} (${r.phone_number}) → ${r.plate_number}`,
      );
    } else {
      console.warn('[bootstrap] seeded conductor row not found');
    }

    const routes = await client.query<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM routes`,
    );
    console.log(`[bootstrap] routes: ${routes.rows[0].c}`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('[bootstrap] failed:', err.message);
  process.exit(1);
});
