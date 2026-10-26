import { errorResponseSchema } from '@notiz/shared';
import type { z } from 'zod';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function readErrorMessage(response: Response): Promise<string> {
  const parsed = errorResponseSchema.safeParse(await response.json().catch(() => null));
  return parsed.success ? parsed.data.error.message : response.statusText;
}

type MutationMethod = 'POST' | 'PATCH' | 'DELETE';

async function request(url: string, init: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = { accept: 'application/json' };
  // FormData bodies get their multipart boundary header from the browser.
  if (typeof init.body === 'string') {
    headers['content-type'] = 'application/json';
  }
  const response = await fetch(url, { ...init, headers });
  if (!response.ok) {
    throw new ApiError(response.status, await readErrorMessage(response));
  }
  return response;
}

/** GETs a JSON endpoint and validates the body against the shared schema. */
export async function getJson<T>(url: string, schema: z.ZodType<T>): Promise<T> {
  const response = await request(url);
  return schema.parse(await response.json());
}

/** Sends a JSON body and validates the JSON response against the shared schema. */
export async function sendJson<T>(
  method: MutationMethod,
  url: string,
  body: unknown,
  schema: z.ZodType<T>,
): Promise<T> {
  const response = await request(url, { method, body: JSON.stringify(body) });
  return schema.parse(await response.json());
}

/** POSTs one file as multipart/form-data and validates the JSON response. */
export async function uploadFile<T>(url: string, file: File, schema: z.ZodType<T>): Promise<T> {
  const body = new FormData();
  body.append('file', file);
  const response = await request(url, { method: 'POST', body });
  return schema.parse(await response.json());
}

/** Calls an endpoint that answers 204 No Content. */
export async function sendEmpty(method: MutationMethod, url: string): Promise<void> {
  await request(url, { method });
}
