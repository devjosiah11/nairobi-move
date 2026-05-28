import 'dotenv/config';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { sql } from '@nairobi-move/db';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const seedSql = readFileSync(path.join(__dirname, 'seed-fleet.sql'), 'utf-8');

// Split on semicolons, run each statement
const statements = seedSql
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'));

console.log(`Running ${statements.length} statements...`);
for (const stmt of statements) {
  try {
    const rows = await sql.unsafe(stmt);
    if (Array.isArray(rows) && rows.length > 0) {
      console.table(rows);
    }
  } catch (e: any) {
    console.error('Statement failed:', e.message);
    console.error('SQL:', stmt.slice(0, 120));
  }
}
console.log('Seed complete.');
process.exit(0);
