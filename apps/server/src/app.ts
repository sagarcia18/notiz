import Fastify, { type FastifyInstance } from 'fastify';
import type { AppDatabase } from './db/client.js';
import { handleError } from './errors.js';
import { registerHealthRoutes } from './routes/health.routes.js';
import { registerPageRoutes, registerTrashRoutes } from './routes/pages.routes.js';

export interface BuildAppOptions {
  db: AppDatabase;
  logger?: boolean;
}

export function buildApp({ db, logger = false }: BuildAppOptions): FastifyInstance {
  const app = Fastify({ logger });
  app.setErrorHandler(handleError);
  app.setNotFoundHandler((request, reply) =>
    reply.status(404).send({
      error: { code: 'not_found', message: `Route ${request.method} ${request.url} not found` },
    }),
  );
  registerHealthRoutes(app, db);
  registerPageRoutes(app, db);
  registerTrashRoutes(app, db);
  return app;
}
