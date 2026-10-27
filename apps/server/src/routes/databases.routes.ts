import {
  createPropertyInputSchema,
  createRowInputSchema,
  createViewInputSchema,
  databaseAggregateInputSchema,
  databaseQueryInputSchema,
  pageIdSchema,
  propertyIdSchema,
  updatePropertyInputSchema,
  updateViewInputSchema,
  viewIdSchema,
} from '@notiz/shared';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { AppDatabase } from '../db/client.js';
import { aggregateDatabase, queryDatabase } from '../services/databaseQuery.service.js';
import {
  createProperty,
  deleteProperty,
  getDatabase,
  updateProperty,
} from '../services/databases.service.js';
import { createRow } from '../services/rows.service.js';
import { createView, deleteView, listViewRows, updateView } from '../services/views.service.js';

const databaseParamsSchema = z.object({ id: pageIdSchema });
const propertyParamsSchema = z.object({ id: propertyIdSchema });
const viewParamsSchema = z.object({ id: viewIdSchema });

export function registerDatabaseRoutes(app: FastifyInstance, db: AppDatabase): void {
  app.get('/api/databases/:id', (request) =>
    getDatabase(db, databaseParamsSchema.parse(request.params).id),
  );

  app.post('/api/databases/:id/properties', async (request, reply) => {
    const { id } = databaseParamsSchema.parse(request.params);
    const property = createProperty(db, id, createPropertyInputSchema.parse(request.body));
    return reply.status(201).send(property);
  });

  app.patch('/api/properties/:id', (request) => {
    const { id } = propertyParamsSchema.parse(request.params);
    return updateProperty(db, id, updatePropertyInputSchema.parse(request.body));
  });

  app.delete('/api/properties/:id', async (request, reply) => {
    deleteProperty(db, propertyParamsSchema.parse(request.params).id);
    return reply.status(204).send();
  });

  app.post('/api/databases/:id/views', async (request, reply) => {
    const { id } = databaseParamsSchema.parse(request.params);
    const view = createView(db, id, createViewInputSchema.parse(request.body));
    return reply.status(201).send(view);
  });

  app.patch('/api/views/:id', (request) => {
    const { id } = viewParamsSchema.parse(request.params);
    return updateView(db, id, updateViewInputSchema.parse(request.body));
  });

  app.delete('/api/views/:id', async (request, reply) => {
    deleteView(db, viewParamsSchema.parse(request.params).id);
    return reply.status(204).send();
  });

  app.get('/api/views/:id/rows', (request) =>
    listViewRows(db, viewParamsSchema.parse(request.params).id),
  );

  app.post('/api/databases/:id/query', (request) =>
    queryDatabase(
      db,
      databaseParamsSchema.parse(request.params).id,
      databaseQueryInputSchema.parse(request.body ?? {}),
    ),
  );

  app.post('/api/databases/:id/aggregate', (request) =>
    aggregateDatabase(
      db,
      databaseParamsSchema.parse(request.params).id,
      databaseAggregateInputSchema.parse(request.body ?? {}),
    ),
  );

  app.post('/api/databases/:id/rows', async (request, reply) => {
    const { id } = databaseParamsSchema.parse(request.params);
    const row = createRow(db, id, createRowInputSchema.parse(request.body ?? {}));
    return reply.status(201).send(row);
  });
}
