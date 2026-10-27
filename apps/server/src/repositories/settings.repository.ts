import { eq } from 'drizzle-orm';
import type { AppDatabase } from '../db/client.js';
import { settings } from '../db/schema.js';

export function findSettingJson(db: AppDatabase, key: string): string | undefined {
  return db.select().from(settings).where(eq(settings.key, key)).get()?.valueJson;
}

export function saveSettingJson(db: AppDatabase, key: string, valueJson: string): void {
  db.insert(settings)
    .values({ key, valueJson })
    .onConflictDoUpdate({ target: settings.key, set: { valueJson } })
    .run();
}
