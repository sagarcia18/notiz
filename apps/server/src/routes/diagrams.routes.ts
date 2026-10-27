import { pageIdSchema } from '@notiz/shared';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { AppDatabase } from '../db/client.js';
import { listDiagramLinks, listDiagramUsages } from '../services/diagramLinks.service.js';

const idParamsSchema = z.object({ id: pageIdSchema });

export function registerDiagramRoutes(app: FastifyInstance, db: AppDatabase): void {
  app.get('/api/pages/:id/diagram-links', (request) =>
    listDiagramLinks(db, idParamsSchema.parse(request.params).id),
  );
  app.get('/api/pages/:id/diagram-usages', (request) =>
    listDiagramUsages(db, idParamsSchema.parse(request.params).id),
  );
}
