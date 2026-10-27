import { MAX_DESCRIPTION_LENGTH, pageDetailSchema } from '@notiz/shared';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DatabaseApi } from './databaseApi.js';
import { errorCode } from './pageApi.js';

describe('database description', () => {
  let api: DatabaseApi;

  beforeEach(() => {
    api = new DatabaseApi();
  });

  afterEach(async () => {
    await api.close();
  });

  async function patch(
    id: string,
    description: string,
  ): Promise<{ status: number; body: unknown }> {
    const response = await api.app.inject({
      method: 'PATCH',
      url: `/api/pages/${id}`,
      payload: { description },
    });
    return { status: response.statusCode, body: response.json() };
  }

  it('starts empty and is saved and searchable', async () => {
    const database = await api.createDatabase();
    expect(database.description).toBe('');

    const saved = await patch(database.id, 'Open work for the fire alarm project');
    expect(saved.status).toBe(200);
    expect(pageDetailSchema.parse(saved.body).description).toBe(
      'Open work for the fire alarm project',
    );
    expect((await api.page(database.id)).description).toBe('Open work for the fire alarm project');
    expect(api.searchBody(database.id)).toBe('Open work for the fire alarm project');
  });

  it('is null for other pages and rejected on them', async () => {
    const page = await api.create('Notes');
    expect(page.description).toBeNull();
    const saved = await patch(page.id, 'Nope');
    expect(saved.status).toBe(400);
    expect(errorCode(saved.body)).toBe('validation_failed');
  });

  it('rejects descriptions over the limit', async () => {
    const database = await api.createDatabase();
    const saved = await patch(database.id, 'x'.repeat(MAX_DESCRIPTION_LENGTH + 1));
    expect(saved.status).toBe(400);
  });
});
