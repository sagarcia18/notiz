import Fastify, { type FastifyInstance } from 'fastify';
import type { AppDatabase } from './db/client.js';
import { handleError } from './errors.js';
import { registerAttachmentRoutes } from './routes/attachments.routes.js';
import { registerDashboardRoutes } from './routes/dashboards.routes.js';
import { registerDatabaseRoutes } from './routes/databases.routes.js';
import { registerHealthRoutes } from './routes/health.routes.js';
import { registerPageRoutes, registerTrashRoutes } from './routes/pages.routes.js';
import { AttachmentFiles } from './storage/attachmentFiles.js';

/** Page content can be large; uploads have their own limit. */
const BODY_LIMIT_BYTES = 10 * 1024 * 1024;

export interface BuildAppOptions {
  db: AppDatabase;
  /** Folder that holds the attachments folder (DATA_DIR). */
  dataDir: string;
  logger?: boolean;
}

export function buildApp({ db, dataDir, logger = false }: BuildAppOptions): FastifyInstance {
  const app = Fastify({ logger, bodyLimit: BODY_LIMIT_BYTES });
  app.setErrorHandler(handleError);
  app.setNotFoundHandler((request, reply) =>
    reply.status(404).send({
      error: { code: 'not_found', message: `Route ${request.method} ${request.url} not found` },
    }),
  );
  registerHealthRoutes(app, db);
  registerPageRoutes(app, db);
  registerDatabaseRoutes(app, db);
  registerDashboardRoutes(app, db);
  const files = new AttachmentFiles(dataDir);
  registerTrashRoutes(app, db, files);
  registerAttachmentRoutes(app, db, files);
  return app;
}
