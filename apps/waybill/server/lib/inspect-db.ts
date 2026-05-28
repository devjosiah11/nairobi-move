/** Quick read-only sanity check: what tables exist in DATABASE_URL? */
import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not set');
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  const r = await client.query<{ tablename: string }>(`
    SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename
  `);
  console.log(`tables (${r.rowCount}):`);
  for (const row of r.rows) {
    const cnt = await client.query<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM "${row.tablename}"`,
    );
    console.log(`  - ${row.tablename} (${cnt.rows[0].c} rows)`);
  }
  await client.end();
}
main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
