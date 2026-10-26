import fs from 'node:fs';
import { buildApp } from './app.js';
import { loadConfig } from './config.js';
import { openDatabase } from './db/client.js';
import { runMigrations } from './db/migrate.js';

const config = loadConfig();
fs.mkdirSync(config.attachmentsDir, { recursive: true });

const db = openDatabase(config.databaseFile);
runMigrations(db);

const app = buildApp({ db, dataDir: config.dataDir, logger: true });

app.addHook('onClose', () => {
  db.$client.close();
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    void app.close();
  });
}

await app.listen({ port: config.port, host: '127.0.0.1' });
