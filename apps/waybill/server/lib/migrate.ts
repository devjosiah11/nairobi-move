/**
 * Apply shared/db/schema-waybill.sql to the Neon database referenced by
 * DATABASE_URL. Uses `pg` (TCP, single connection) rather than the neon HTTP
 * client because the migration is multi-statement and includes a function
 * body with $$ delimiters.
 *
 * Run: npm run -w waybill migrate
 */
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import pg from 'pg';

const { Client } = pg;

const __dirname = dirname(fileURLToPath(import.meta.url));
const schemaPath = resolve(__dirname, '../../../../shared/db/schema-waybill.sql');

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }
  const sql = readFileSync(schemaPath, 'utf-8');
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  console.log(`[migrate] connecting to ${redact(process.env.DATABASE_URL)} …`);
  await client.connect();
  console.log(`[migrate] applying ${schemaPath} (${sql.length} bytes) …`);

  try {
    await client.query(sql);
    console.log('[migrate] schema applied successfully');

    const tables = await client.query<{ tablename: string }>(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename IN ('conductors','trips_recon','passenger_reports','reconciliations','incentives')
      ORDER BY tablename
    `);
    console.log(
      `[migrate] verified tables: ${tables.rows.map((r) => r.tablename).join(', ')}`,
    );

    const conductor = await client.query(
      `SELECT phone_number, full_name FROM conductors WHERE phone_number = '+254712345678'`,
    );
    if (conductor.rowCount && conductor.rowCount > 0) {
      console.log(
        `[migrate] seeded conductor: ${conductor.rows[0].full_name} (${conductor.rows[0].phone_number})`,
      );
    } else {
      console.warn('[migrate] seeded conductor NOT found — vehicle KCA 123G may be missing');
    }
  } finally {
    await client.end();
  }
}

function redact(url: string): string {
  return url.replace(/:\/\/([^:]+):[^@]+@/, '://$1:***@');
}

main().catch((err) => {
  console.error('[migrate] failed:', err);
  process.exit(1);
});
