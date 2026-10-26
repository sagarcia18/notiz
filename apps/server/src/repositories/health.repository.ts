import { sql } from 'drizzle-orm';
import type { AppDatabase } from '../db/client.js';

export function pingDatabase(db: AppDatabase): boolean {
  const row = db.get<{ ok: number }>(sql`select 1 as ok`);
  return row.ok === 1;
}
