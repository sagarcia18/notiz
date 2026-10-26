import { loadConfig } from '../config.js';
import { openDatabase } from './client.js';
import { runMigrations } from './migrate.js';

const config = loadConfig();
const db = openDatabase(config.databaseFile);
runMigrations(db);
db.$client.close();
process.stdout.write(`Migrations applied to ${config.databaseFile}\n`);
