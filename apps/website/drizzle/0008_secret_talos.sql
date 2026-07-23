CREATE TABLE `content_report_rate_limits` (
	`source_key_hash` text NOT NULL,
	`window_seconds` integer NOT NULL,
	`window_started_at` integer NOT NULL,
	`request_count` integer DEFAULT 0 NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`source_key_hash`, `window_seconds`)
);
--> statement-breakpoint
CREATE INDEX `content_report_rate_limits_updated_idx` ON `content_report_rate_limits` (`updated_at`);--> statement-breakpoint
CREATE TABLE `content_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`theme_id` text,
	`theme_version` text,
	`reporter_email` text,
	`details` text NOT NULL,
	`evidence_url` text,
	`source_key_hash` text NOT NULL,
	`status` text DEFAULT 'received' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`resolved_at` text
);
--> statement-breakpoint
CREATE INDEX `content_reports_status_created_idx` ON `content_reports` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `content_reports_theme_created_idx` ON `content_reports` (`theme_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `content_reports_source_created_idx` ON `content_reports` (`source_key_hash`,`created_at`);