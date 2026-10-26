import type { HealthResponse } from '@notiz/shared';
import type { AppDatabase } from '../db/client.js';
import { DomainError } from '../errors.js';
import { pingDatabase } from '../repositories/health.repository.js';

export function getHealth(db: AppDatabase): HealthResponse {
  if (!pingDatabase(db)) {
    throw new DomainError('internal', 'Database did not answer');
  }
  return { status: 'ok', database: 'ok' };
}
