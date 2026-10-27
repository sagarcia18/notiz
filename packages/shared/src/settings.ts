import { z } from 'zod';

/** Header the MCP server sends on every request, so the API can tell its calls apart. */
export const NOTIZ_CLIENT_HEADER = 'x-notiz-client';
export const MCP_CLIENT_ID = 'mcp';

export const settingsSchema = z.object({
  /** Whether the API answers requests from the MCP server (Claude). */
  mcpEnabled: z.boolean(),
  /** Last MCP request since the server started; null if none. Not persisted. */
  mcpLastUsedAt: z.string().nullable(),
});

export type Settings = z.infer<typeof settingsSchema>;

export const updateSettingsInputSchema = z
  .object({ mcpEnabled: z.boolean().optional() })
  .refine((input) => input.mcpEnabled !== undefined, { message: 'Nothing to update' });

export type UpdateSettingsInput = z.infer<typeof updateSettingsInputSchema>;
