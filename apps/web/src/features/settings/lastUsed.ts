const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/** "Not used yet", "Last used just now", "Last used 5 min ago", "… 3 h ago", "… 2 d ago". */
export function formatLastUsed(lastUsedAt: string | null, now: Date): string {
  if (lastUsedAt === null) return 'Not used since the server started';
  const elapsed = Math.max(0, now.getTime() - new Date(lastUsedAt).getTime());
  if (elapsed < MINUTE_MS) return 'Last used just now';
  if (elapsed < HOUR_MS) return `Last used ${Math.floor(elapsed / MINUTE_MS)} min ago`;
  if (elapsed < DAY_MS) return `Last used ${Math.floor(elapsed / HOUR_MS)} h ago`;
  return `Last used ${Math.floor(elapsed / DAY_MS)} d ago`;
}
