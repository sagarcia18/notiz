import { z } from 'zod';

const envSchema = z.object({
  NOTIZ_API_URL: z.url().optional(),
  API_PORT: z.coerce.number().int().positive().default(3001),
});

export interface McpConfig {
  apiUrl: string;
}

/** API address: NOTIZ_API_URL, else the local server on API_PORT (same default as the server). */
export function loadMcpConfig(env: NodeJS.ProcessEnv = process.env): McpConfig {
  const parsed = envSchema.parse(env);
  return { apiUrl: parsed.NOTIZ_API_URL ?? `http://127.0.0.1:${parsed.API_PORT}` };
}
