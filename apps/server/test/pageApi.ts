import {
  type MovePageInput,
  type PageDetail,
  type PageTreeNode,
  type TrashEntry,
  errorResponseSchema,
  pageDetailSchema,
  pageTreeSchema,
  trashListSchema,
} from '@notiz/shared';
import fs from 'node:fs';
import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import { buildApp } from '../src/app.js';
import type { AppDatabase } from '../src/db/client.js';
import { createTempDataDir, createTestDatabase } from './helpers.js';

/** Thin typed wrapper around app.inject for page and trash API tests. */
export class PageApi {
  readonly db: AppDatabase = createTestDatabase();
  readonly dataDir: string = createTempDataDir();
  readonly app: FastifyInstance = buildApp({ db: this.db, dataDir: this.dataDir });

  async close(): Promise<void> {
    await this.app.close();
    this.db.$client.close();
    fs.rmSync(this.dataDir, { recursive: true, force: true });
  }

  async create(title: string, parentId: string | null = null): Promise<PageDetail> {
    const response = await this.app.inject({
      method: 'POST',
      url: '/api/pages',
      payload: { title, parentId },
    });
    if (response.statusCode !== 201) {
      throw new Error(`create failed: ${response.body}`);
    }
    return pageDetailSchema.parse(response.json());
  }

  async tree(): Promise<PageTreeNode[]> {
    const response = await this.app.inject({ method: 'GET', url: '/api/pages/tree' });
    return pageTreeSchema.parse(response.json());
  }

  async trash(): Promise<TrashEntry[]> {
    const response = await this.app.inject({ method: 'GET', url: '/api/trash' });
    return trashListSchema.parse(response.json());
  }

  move(id: string, input: MovePageInput): Promise<LightMyRequestResponse> {
    return this.app.inject({ method: 'POST', url: `/api/pages/${id}/move`, payload: input });
  }

  remove(id: string): Promise<LightMyRequestResponse> {
    return this.app.inject({ method: 'DELETE', url: `/api/pages/${id}` });
  }

  restore(id: string): Promise<LightMyRequestResponse> {
    return this.app.inject({ method: 'POST', url: `/api/trash/${id}/restore` });
  }

  purge(id: string): Promise<LightMyRequestResponse> {
    return this.app.inject({ method: 'DELETE', url: `/api/trash/${id}` });
  }

  searchBody(pageId: string): string | undefined {
    return this.db.$client
      .prepare<[string], { body: string }>('select body from pages_fts where page_id = ?')
      .get(pageId)?.body;
  }

  searchTitles(): string[] {
    return this.db.$client
      .prepare<[], { title: string }>('select title from pages_fts order by title')
      .all()
      .map((row) => row.title);
  }
}

export function titles(nodes: PageTreeNode[]): string[] {
  return nodes.map((node) => node.title);
}

export function errorCode(body: unknown): string {
  return errorResponseSchema.parse(body).error.code;
}
