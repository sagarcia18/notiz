import type { Settings, UpdateSettingsInput } from '@notiz/shared';
import { z } from 'zod';
import type { AppDatabase } from '../db/client.js';
import { McpDisabledError } from '../errors.js';
import * as repo from '../repositories/settings.repository.js';

const MCP_ENABLED_KEY = 'mcp_enabled';

/** Per-app runtime state that is not worth persisting. */
export class McpActivity {
  private lastUsedAt: string | null = null;

  touch(now: Date = new Date()): void {
    this.lastUsedAt = now.toISOString();
  }

  get lastUsed(): string | null {
    return this.lastUsedAt;
  }
}

function isMcpEnabled(db: AppDatabase): boolean {
  const json = repo.findSettingJson(db, MCP_ENABLED_KEY);
  if (json === undefined) return true;
  const parsed = z.boolean().safeParse(JSON.parse(json));
  return parsed.success ? parsed.data : true;
}

export function getSettings(db: AppDatabase, activity: McpActivity): Settings {
  return { mcpEnabled: isMcpEnabled(db), mcpLastUsedAt: activity.lastUsed };
}

export function updateSettings(
  db: AppDatabase,
  activity: McpActivity,
  input: UpdateSettingsInput,
): Settings {
  if (input.mcpEnabled !== undefined) {
    repo.saveSettingJson(db, MCP_ENABLED_KEY, JSON.stringify(input.mcpEnabled));
  }
  return getSettings(db, activity);
}

/** Refuses an MCP request while access is off; records it as last use otherwise. */
export function admitMcpRequest(db: AppDatabase, activity: McpActivity): void {
  if (!isMcpEnabled(db)) throw new McpDisabledError();
  activity.touch();
}
