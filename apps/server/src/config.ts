import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

const envSchema = z.object({
  DATA_DIR: z.string().min(1).default('./data'),
  PORT: z.coerce.number().int().positive().default(3001),
});

export interface AppConfig {
  dataDir: string;
  databaseFile: string;
  attachmentsDir: string;
  port: number;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.parse(env);
  const dataDir = path.resolve(repoRoot, parsed.DATA_DIR);
  return {
    dataDir,
    databaseFile: path.join(dataDir, 'notiz.db'),
    attachmentsDir: path.join(dataDir, 'attachments'),
    port: parsed.PORT,
  };
}
