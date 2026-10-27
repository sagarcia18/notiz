CREATE TABLE `diagram_links` (
	`diagram_id` text NOT NULL,
	`element_id` text NOT NULL,
	`page_id` text NOT NULL,
	FOREIGN KEY (`diagram_id`) REFERENCES `pages`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `diagram_links_diagram_idx` ON `diagram_links` (`diagram_id`);--> statement-breakpoint
CREATE INDEX `diagram_links_page_idx` ON `diagram_links` (`page_id`);