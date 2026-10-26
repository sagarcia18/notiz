CREATE TABLE `attachments` (
	`id` text PRIMARY KEY NOT NULL,
	`page_id` text NOT NULL,
	`file_name` text NOT NULL,
	`stored_path` text NOT NULL,
	`mime` text NOT NULL,
	`size` integer NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`page_id`) REFERENCES `pages`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `attachments_page_idx` ON `attachments` (`page_id`);