CREATE TABLE `db_properties` (
	`id` text PRIMARY KEY NOT NULL,
	`database_id` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`options_json` text DEFAULT '[]' NOT NULL,
	`sort_order` text NOT NULL,
	FOREIGN KEY (`database_id`) REFERENCES `pages`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `db_properties_database_idx` ON `db_properties` (`database_id`,`sort_order`);--> statement-breakpoint
CREATE TABLE `db_views` (
	`id` text PRIMARY KEY NOT NULL,
	`database_id` text NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`config_json` text DEFAULT '{}' NOT NULL,
	`sort_order` text NOT NULL,
	FOREIGN KEY (`database_id`) REFERENCES `pages`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `db_views_database_idx` ON `db_views` (`database_id`,`sort_order`);