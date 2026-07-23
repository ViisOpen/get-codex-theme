CREATE TABLE `theme_submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`publisher_id` text NOT NULL,
	`publisher_email` text NOT NULL,
	`theme_id` text NOT NULL,
	`version` text NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`author` text NOT NULL,
	`mode` text NOT NULL,
	`license` text NOT NULL,
	`status` text DEFAULT 'pending_review' NOT NULL,
	`archive_key` text NOT NULL,
	`archive_sha256` text NOT NULL,
	`archive_bytes` integer NOT NULL,
	`manifest_json` text NOT NULL,
	`validation_json` text NOT NULL,
	`review_notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`reviewed_at` text,
	`published_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `theme_submissions_theme_version_unique` ON `theme_submissions` (`theme_id`,`version`);--> statement-breakpoint
CREATE INDEX `theme_submissions_publisher_created_idx` ON `theme_submissions` (`publisher_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `theme_submissions_status_created_idx` ON `theme_submissions` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `theme_submissions_theme_status_idx` ON `theme_submissions` (`theme_id`,`status`);
