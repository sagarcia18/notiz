import { searchQuerySchema } from '@notiz/shared';
import type { FastifyInstance } from 'fastify';
import type { AppDatabase } from '../db/client.js';
import { searchPages } from '../services/search.service.js';

export function registerSearchRoutes(app: FastifyInstance, db: AppDatabase): void {
  app.get('/api/search', (request) => searchPages(db, searchQuerySchema.parse(request.query)));
}
