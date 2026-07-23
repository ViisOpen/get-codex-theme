PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_theme_submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`publisher_id` text NOT NULL,
	`publisher_email` text NOT NULL,
	`theme_id` text NOT NULL,
	`version` text NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`tagline` text,
	`design_story` text,
	`author` text NOT NULL,
	`author_platform` text DEFAULT 'github' NOT NULL,
	`author_url` text DEFAULT 'https://github.com/ViisOpen' NOT NULL,
	`category` text DEFAULT 'aesthetic' NOT NULL,
	`mode` text NOT NULL,
	`license` text NOT NULL,
	`status` text DEFAULT 'published' NOT NULL,
	`archive_key` text NOT NULL,
	`archive_sha256` text NOT NULL,
	`archive_bytes` integer NOT NULL,
	`manifest_json` text NOT NULL,
	`validation_json` text NOT NULL,
	`gallery_assets_json` text DEFAULT '{}' NOT NULL,
	`review_notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`reviewed_at` text,
	`published_at` text
);
--> statement-breakpoint
INSERT INTO `__new_theme_submissions`("id", "publisher_id", "publisher_email", "theme_id", "version", "name", "description", "tagline", "design_story", "author", "author_platform", "author_url", "category", "mode", "license", "status", "archive_key", "archive_sha256", "archive_bytes", "manifest_json", "validation_json", "gallery_assets_json", "review_notes", "created_at", "updated_at", "reviewed_at", "published_at") SELECT "id", "publisher_id", "publisher_email", "theme_id", "version", "name", "description", "tagline", "design_story", "author", "author_platform", "author_url", "category", "mode", "license", CASE WHEN "status" = 'approved' THEN 'published' WHEN "status" = 'published' THEN 'published' WHEN "status" = 'removed' THEN 'removed' ELSE 'failed' END, "archive_key", "archive_sha256", "archive_bytes", "manifest_json", "validation_json", "gallery_assets_json", "review_notes", "created_at", "updated_at", "reviewed_at", "published_at" FROM `theme_submissions`;--> statement-breakpoint
DROP TABLE `theme_submissions`;--> statement-breakpoint
ALTER TABLE `__new_theme_submissions` RENAME TO `theme_submissions`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `theme_submissions_theme_version_unique` ON `theme_submissions` (`theme_id`,`version`);--> statement-breakpoint
CREATE INDEX `theme_submissions_publisher_created_idx` ON `theme_submissions` (`publisher_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `theme_submissions_status_created_idx` ON `theme_submissions` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `theme_submissions_theme_status_idx` ON `theme_submissions` (`theme_id`,`status`);--> statement-breakpoint
UPDATE `publish_sessions` SET `status` = 'failed', `risk_level` = 'blocked', `decision_reason` = COALESCE(`decision_reason`, 'Legacy review hold retired during automatic publishing migration.'), `completed_at` = COALESCE(`completed_at`, CURRENT_TIMESTAMP), `updated_at` = CURRENT_TIMESTAMP WHERE `status` = 'flagged';--> statement-breakpoint
UPDATE `publish_sessions` SET `risk_level` = 'blocked', `updated_at` = CURRENT_TIMESTAMP WHERE `risk_level` = 'review';
