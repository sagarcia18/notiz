import {
  createPageInputSchema,
  movePageInputSchema,
  pageIdSchema,
  updatePageInputSchema,
} from '@notiz/shared';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { AppDatabase } from '../db/client.js';
import {
  createPage,
  getPage,
  getPageTree,
  movePage,
  updatePage,
} from '../services/pages.service.js';
import {
  emptyTrash,
  listTrash,
  purgePage,
  restorePage,
  trashPage,
} from '../services/trash.service.js';
import type { AttachmentFiles } from '../storage/attachmentFiles.js';

const idParamsSchema = z.object({ id: pageIdSchema });

export function registerPageRoutes(app: FastifyInstance, db: AppDatabase): void {
  app.get('/api/pages/tree', () => getPageTree(db));

  app.post('/api/pages', async (request, reply) => {
    const page = createPage(db, createPageInputSchema.parse(request.body ?? {}));
    return reply.status(201).send(page);
  });

  app.get('/api/pages/:id', (request) => getPage(db, idParamsSchema.parse(request.params).id));

  app.patch('/api/pages/:id', (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return updatePage(db, id, updatePageInputSchema.parse(request.body));
  });

  app.post('/api/pages/:id/move', (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return movePage(db, id, movePageInputSchema.parse(request.body));
  });

  app.delete('/api/pages/:id', async (request, reply) => {
    trashPage(db, idParamsSchema.parse(request.params).id);
    return reply.status(204).send();
  });
}

export function registerTrashRoutes(
  app: FastifyInstance,
  db: AppDatabase,
  files: AttachmentFiles,
): void {
  app.get('/api/trash', () => listTrash(db));

  app.post('/api/trash/:id/restore', (request) =>
    restorePage(db, idParamsSchema.parse(request.params).id),
  );

  app.delete('/api/trash/:id', async (request, reply) => {
    await purgePage(db, files, idParamsSchema.parse(request.params).id);
    return reply.status(204).send();
  });

  app.delete('/api/trash', async (_request, reply) => {
    await emptyTrash(db, files);
    return reply.status(204).send();
  });
}
