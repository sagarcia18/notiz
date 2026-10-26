-- Full-text index over page titles and plain-text content.
-- Standalone FTS5 table, kept in sync by the page service (not by triggers),
-- because the body is plain text extracted from BlockNote JSON in TypeScript.
CREATE VIRTUAL TABLE `pages_fts` USING fts5(
	`page_id` UNINDEXED,
	`title`,
	`body`,
	tokenize = 'unicode61 remove_diacritics 2'
);
