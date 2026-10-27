import { z } from 'zod';

const envSchema = z.object({
  NOTIZ_API_URL: z.url().optional(),
  PORT: z.coerce.number().int().positive().default(3001),
});

export interface McpConfig {
  apiUrl: string;
}

/** API address: NOTIZ_API_URL, else the local server on PORT (same default as the server). */
export function loadMcpConfig(env: NodeJS.ProcessEnv = process.env): McpConfig {
  const parsed = envSchema.parse(env);
  return { apiUrl: parsed.NOTIZ_API_URL ?? `http://localhost:${parsed.PORT}` };
}
