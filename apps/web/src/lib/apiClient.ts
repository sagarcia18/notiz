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

/** GETs a JSON endpoint and validates the body against the shared schema. */
export async function getJson<T>(url: string, schema: z.ZodType<T>): Promise<T> {
  const response = await fetch(url, { headers: { accept: 'application/json' } });
  if (!response.ok) {
    throw new ApiError(response.status, await readErrorMessage(response));
  }
  return schema.parse(await response.json());
}
