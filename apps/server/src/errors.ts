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

export class ValidationError extends DomainError {
  constructor(message: string) {
    super('validation_failed', message);
  }
}

/** The user turned MCP access off; requests from the MCP server are refused. */
export class McpDisabledError extends DomainError {
  constructor() {
    super(
      'mcp_disabled',
      'MCP access is turned off in Notiz. Turn it on with the switch in the bottom-left corner of the sidebar.',
    );
  }
}

const statusByCode: Record<ErrorCode, number> = {
  not_found: 404,
  validation_failed: 400,
  conflict: 409,
  mcp_disabled: 403,
  internal: 500,
};

/** Fastify and plugin errors for bad requests (malformed body, wrong content type, too large). */
function isClientError(error: unknown): error is Error & { statusCode: number } {
  return (
    error instanceof Error &&
    'statusCode' in error &&
    typeof error.statusCode === 'number' &&
    error.statusCode >= 400 &&
    error.statusCode < 500
  );
}

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
  if (isClientError(error)) {
    return {
      status: error.statusCode,
      body: { error: { code: 'validation_failed', message: error.message } },
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
