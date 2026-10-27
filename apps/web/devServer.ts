/** Dev server settings read from the repo `.env` (or the shell). */
export interface DevServerSettings {
  /** Undefined keeps Vite's default: this computer only. */
  host: string | undefined;
  apiTarget: string;
}

/**
 * `WEB_HOST` is an opt-in: Notiz has no login, so only set it to an address of a
 * private network such as Tailscale (e.g. `100.x.y.z`), never to a public one.
 */
export function devServerSettings(env: Record<string, string | undefined>): DevServerSettings {
  const host = env['WEB_HOST']?.trim();
  return {
    host: host === undefined || host === '' ? undefined : host,
    apiTarget: `http://127.0.0.1:${env['API_PORT'] ?? '3001'}`,
  };
}
