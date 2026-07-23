CREATE TABLE `theme_like_rate_limits` (
	`actor_kind` text NOT NULL,
	`actor_key_hash` text NOT NULL,
	`window_seconds` integer NOT NULL,
	`window_started_at` integer NOT NULL,
	`request_count` integer DEFAULT 0 NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`actor_kind`, `actor_key_hash`, `window_seconds`)
);
--> statement-breakpoint
CREATE INDEX `theme_like_rate_limits_updated_idx` ON `theme_like_rate_limits` (`updated_at`);--> statement-breakpoint
CREATE TABLE `theme_likes` (
	`id` text PRIMARY KEY NOT NULL,
	`theme_id` text NOT NULL,
	`actor_kind` text NOT NULL,
	`actor_key_hash` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `theme_likes_theme_actor_unique` ON `theme_likes` (`theme_id`,`actor_kind`,`actor_key_hash`);--> statement-breakpoint
CREATE INDEX `theme_likes_theme_created_idx` ON `theme_likes` (`theme_id`,`created_at`);--> statement-breakpoint
ALTER TABLE `theme_submissions` ADD `author_platform` text DEFAULT 'github' NOT NULL;--> statement-breakpoint
ALTER TABLE `theme_submissions` ADD `author_url` text DEFAULT 'https://github.com/ViisOpen' NOT NULL;--> statement-breakpoint
ALTER TABLE `theme_submissions` ADD `category` text DEFAULT 'aesthetic' NOT NULL;--> statement-breakpoint
ALTER TABLE `theme_submissions` ADD `gallery_assets_json` text DEFAULT '{}' NOT NULL;
