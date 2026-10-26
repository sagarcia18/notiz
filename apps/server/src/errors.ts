import type { ErrorCode, ErrorResponse } from '@notiz/shared';
import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';

/** Base class for errors thrown by services; mapped to HTTP in one place. */
export class DomainError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class NotFoundError extends DomainError {
  constructor(entity: string, id: string) {
    super('not_found', `${entity} ${id} not found`);
  }
}

export class ConflictError extends DomainError {
  constructor(message: string) {
    super('conflict', message);
  }
}

const statusByCode: Record<ErrorCode, number> = {
  not_found: 404,
  validation_failed: 400,
  conflict: 409,
  internal: 500,
};

function toErrorResponse(error: unknown): { status: number; body: ErrorResponse } {
  if (error instanceof DomainError) {
    return {
      status: statusByCode[error.code],
      body: { error: { code: error.code, message: error.message } },
    };
  }
  if (error instanceof ZodError) {
    const message = error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
    return {
      status: 400,
      body: { error: { code: 'validation_failed', message: message.join('; ') } },
    };
  }
  return {
    status: 500,
    body: { error: { code: 'internal', message: 'Internal server error' } },
  };
}

export function handleError(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply,
): FastifyReply {
  const { status, body } = toErrorResponse(error);
  if (status >= 500) {
    request.log.error(error);
  }
  return reply.status(status).send(body);
}
