import {
  createWidgetInputSchema,
  pageIdSchema,
  updateDashboardLayoutInputSchema,
  updateWidgetInputSchema,
  widgetIdSchema,
} from '@notiz/shared';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { AppDatabase } from '../db/client.js';
import {
  createWidget,
  deleteWidget,
  getDashboard,
  getWidgetData,
  updateDashboardLayout,
  updateWidget,
} from '../services/dashboards.service.js';

const dashboardParamsSchema = z.object({ id: pageIdSchema });
const widgetParamsSchema = z.object({ id: widgetIdSchema });

export function registerDashboardRoutes(app: FastifyInstance, db: AppDatabase): void {
  app.get('/api/dashboards/:id', (request) =>
    getDashboard(db, dashboardParamsSchema.parse(request.params).id),
  );

  app.put('/api/dashboards/:id/layout', (request) => {
    const { id } = dashboardParamsSchema.parse(request.params);
    return updateDashboardLayout(db, id, updateDashboardLayoutInputSchema.parse(request.body));
  });

  app.post('/api/dashboards/:id/widgets', async (request, reply) => {
    const { id } = dashboardParamsSchema.parse(request.params);
    const widget = createWidget(db, id, createWidgetInputSchema.parse(request.body));
    return reply.status(201).send(widget);
  });

  app.patch('/api/widgets/:id', (request) => {
    const { id } = widgetParamsSchema.parse(request.params);
    return updateWidget(db, id, updateWidgetInputSchema.parse(request.body));
  });

  app.delete('/api/widgets/:id', async (request, reply) => {
    deleteWidget(db, widgetParamsSchema.parse(request.params).id);
    return reply.status(204).send();
  });

  app.get('/api/widgets/:id/data', (request) =>
    getWidgetData(db, widgetParamsSchema.parse(request.params).id),
  );
}
