import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AppDatabase } from '../src/db/client.js';
import { createTestDatabase } from './helpers.js';

describe('migrations', () => {
  let db: AppDatabase;

  beforeEach(() => {
    db = createTestDatabase();
  });

  afterEach(() => {
    db.$client.close();
  });

  it('creates the pages table with defaults', () => {
    db.$client.prepare("insert into pages (id, sort_order) values ('p1', 'a0')").run();
    const row = db.$client.prepare("select * from pages where id = 'p1'").get() as Record<
      string,
      unknown
    >;
    expect(row).toMatchObject({ kind: 'doc', title: '', is_template: 0, deleted_at: null });
    expect(row['created_at']).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('enforces the parent foreign key', () => {
    const insertOrphan = (): void => {
      db.$client
        .prepare("insert into pages (id, parent_id, sort_order) values ('c', 'missing', 'a0')")
        .run();
    };
    expect(insertOrphan).toThrow(/FOREIGN KEY/);
  });

  it('creates an FTS5 index that ignores accents', () => {
    db.$client
      .prepare('insert into pages_fts (page_id, title, body) values (?, ?, ?)')
      .run('p1', 'Sesión de trabajo', 'Detección de humo');
    const hits = db.$client
      .prepare('select page_id from pages_fts where pages_fts match ?')
      .all('deteccion');
    expect(hits).toEqual([{ page_id: 'p1' }]);
  });
});
