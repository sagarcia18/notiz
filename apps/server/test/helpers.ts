import { type AppDatabase, openDatabase } from '../src/db/client.js';
import { runMigrations } from '../src/db/migrate.js';

export function createTestDatabase(): AppDatabase {
  const db = openDatabase(':memory:');
  runMigrations(db);
  return db;
}
