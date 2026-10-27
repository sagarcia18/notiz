import { MCP_CLIENT_ID, NOTIZ_CLIENT_HEADER, updateSettingsInputSchema } from '@notiz/shared';
import type { FastifyInstance } from 'fastify';
import type { AppDatabase } from '../db/client.js';
import {
  McpActivity,
  admitMcpRequest,
  getSettings,
  updateSettings,
} from '../services/settings.service.js';

export function registerSettingsRoutes(app: FastifyInstance, db: AppDatabase): void {
  const activity = new McpActivity();

  // Runs before every route, so the MCP switch covers the whole API; a rejected
  // promise sends the domain error through the central error handler.
  app.addHook('onRequest', (request) =>
    Promise.resolve().then(() => {
      if (request.headers[NOTIZ_CLIENT_HEADER] === MCP_CLIENT_ID) {
        admitMcpRequest(db, activity);
      }
    }),
  );

  app.get('/api/settings', () => getSettings(db, activity));
  app.patch('/api/settings', (request) =>
    updateSettings(db, activity, updateSettingsInputSchema.parse(request.body)),
  );
}
