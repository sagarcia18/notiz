import type { FastifyInstance } from 'fastify';
import type { AppDatabase } from '../db/client.js';
import { getHealth } from '../services/health.service.js';

export function registerHealthRoutes(app: FastifyInstance, db: AppDatabase): void {
  app.get('/api/health', () => getHealth(db));
}
