import type { PageKind } from '@notiz/shared';
import { sql } from 'drizzle-orm';
import type { AppDatabase } from '../db/client.js';

export interface SearchRow {
  id: string;
  parentId: string | null;
  kind: PageKind;
  title: string;
  icon: string | null;
  parentKind: PageKind | null;
  snippet: string;
}

const SNIPPET_TOKENS = 12;

/** Active, non-template pages matching an FTS5 query, best rank first. */
export function searchPages(db: AppDatabase, ftsQuery: string, limit: number): SearchRow[] {
  return db.all<SearchRow>(sql`
    select p.id, p.parent_id as parentId, p.kind, p.title, p.icon,
      parent.kind as parentKind,
      snippet(pages_fts, -1, '', '', '…', ${SNIPPET_TOKENS}) as snippet
    from pages_fts
    join pages p on p.id = pages_fts.page_id
    left join pages parent on parent.id = p.parent_id
    where pages_fts match ${ftsQuery} and p.deleted_at is null and p.is_template = 0
    order by pages_fts.rank, p.title
    limit ${limit}`);
}
