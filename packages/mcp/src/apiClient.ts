import { type ErrorCode, errorResponseSchema } from '@notiz/shared';
import type { z } from 'zod';

export type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

/** An error answer of the Notiz API, or a server that cannot be reached. */
export class NotizApiError extends Error {
  constructor(
    readonly code: ErrorCode | 'unreachable' | 'bad_response',
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'NotizApiError';
  }
}

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

/** Typed HTTP client for the Notiz REST API; every answer is validated with a shared schema. */
export class NotizApi {
  private readonly baseUrl: string;

  constructor(
    baseUrl: string,
    private readonly fetchFn: FetchLike = fetch,
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  get<T>(path: string, schema: z.ZodType<T>): Promise<T> {
    return this.request('GET', path, schema);
  }

  post<T>(path: string, body: unknown, schema: z.ZodType<T>): Promise<T> {
    return this.request('POST', path, schema, body);
  }

  patch<T>(path: string, body: unknown, schema: z.ZodType<T>): Promise<T> {
    return this.request('PATCH', path, schema, body);
  }

  async delete(path: string): Promise<void> {
    await this.send('DELETE', path);
  }

  private async request<T>(
    method: Method,
    path: string,
    schema: z.ZodType<T>,
    body?: unknown,
  ): Promise<T> {
    const response = await this.send(method, path, body);
    const parsed = schema.safeParse(await response.json());
    if (!parsed.success) {
      throw new NotizApiError('bad_response', `Unexpected answer from ${method} ${path}`);
    }
    return parsed.data;
  }

  private async send(method: Method, path: string, body?: unknown): Promise<Response> {
    const init: RequestInit = { method };
    if (body !== undefined) {
      init.headers = { 'content-type': 'application/json' };
      init.body = JSON.stringify(body);
    }
    let response: Response;
    try {
      response = await this.fetchFn(`${this.baseUrl}${path}`, init);
    } catch {
      throw new NotizApiError(
        'unreachable',
        `Notiz server not reachable at ${this.baseUrl}; start it with "pnpm dev"`,
      );
    }
    if (!response.ok) throw await toApiError(response);
    return response;
  }
}

async function toApiError(response: Response): Promise<NotizApiError> {
  const body: unknown = await response.json().catch(() => undefined);
  const parsed = errorResponseSchema.safeParse(body);
  return parsed.success
    ? new NotizApiError(parsed.data.error.code, parsed.data.error.message, response.status)
    : new NotizApiError('internal', `HTTP ${response.status}`, response.status);
}
