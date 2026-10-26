CREATE TABLE `pages` (
	`id` text PRIMARY KEY NOT NULL,
	`parent_id` text,
	`kind` text DEFAULT 'doc' NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`icon` text,
	`sort_order` text NOT NULL,
	`content_json` text,
	`properties_json` text,
	`is_template` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`parent_id`) REFERENCES `pages`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `pages_parent_sort_idx` ON `pages` (`parent_id`,`sort_order`);