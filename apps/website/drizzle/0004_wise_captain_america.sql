CREATE TABLE `publish_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`publisher_id` text NOT NULL,
	`publisher_email` text NOT NULL,
	`token_hash` text NOT NULL,
	`token_expires_at` text NOT NULL,
	`token_consumed_at` text,
	`publish_token_hash` text,
	`publish_token_expires_at` text,
	`publish_token_consumed_at` text,
	`status` text DEFAULT 'build_created' NOT NULL,
	`validator_version` text NOT NULL,
	`terms_version` text NOT NULL,
	`rights_confirmed_at` text,
	`author_confirmed_at` text,
	`category` text NOT NULL,
	`author_platform` text NOT NULL,
	`author_url` text NOT NULL,
	`theme_id` text,
	`theme_version` text,
	`draft_manifest_json` text,
	`draft_preview_json` text DEFAULT '{}' NOT NULL,
	`draft_digest` text,
	`confirmed_draft_digest` text,
	`expected_sha256` text,
	`archive_key` text,
	`archive_bytes` integer,
	`attempt_count` integer DEFAULT 0 NOT NULL,
	`risk_level` text,
	`decision_reason` text,
	`validation_json` text DEFAULT '{}' NOT NULL,
	`idempotency_key` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`completed_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `publish_sessions_publisher_idempotency_unique` ON `publish_sessions` (`publisher_id`,`idempotency_key`);--> statement-breakpoint
CREATE INDEX `publish_sessions_publisher_created_idx` ON `publish_sessions` (`publisher_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `publish_sessions_status_updated_idx` ON `publish_sessions` (`status`,`updated_at`);--> statement-breakpoint
CREATE INDEX `publish_sessions_expiry_idx` ON `publish_sessions` (`token_expires_at`);--> statement-breakpoint
CREATE INDEX `publish_sessions_publish_expiry_idx` ON `publish_sessions` (`publish_token_expires_at`);--> statement-breakpoint
CREATE INDEX `publish_sessions_theme_idx` ON `publish_sessions` (`theme_id`,`theme_version`);--> statement-breakpoint
CREATE TABLE `publish_validation_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`phase` text NOT NULL,
	`validator_version` text NOT NULL,
	`valid` integer NOT NULL,
	`archive_sha256` text,
	`errors_json` text DEFAULT '[]' NOT NULL,
	`warnings_json` text DEFAULT '[]' NOT NULL,
	`coverage_json` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `publish_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `publish_validation_runs_session_created_idx` ON `publish_validation_runs` (`session_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `theme_namespaces` (
	`theme_id` text PRIMARY KEY NOT NULL,
	`publisher_id` text NOT NULL,
	`claimed_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `theme_namespaces_publisher_idx` ON `theme_namespaces` (`publisher_id`);--> statement-breakpoint
ALTER TABLE `theme_submissions` ADD `tagline` text;--> statement-breakpoint
ALTER TABLE `theme_submissions` ADD `design_story` text;