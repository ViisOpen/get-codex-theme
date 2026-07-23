CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`download_token_hash` text NOT NULL,
	`stripe_session_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`product` text NOT NULL,
	`template_slug` text NOT NULL,
	`asset_key` text NOT NULL,
	`config_json` text NOT NULL,
	`amount_total` integer,
	`currency` text,
	`customer_email` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`paid_at` text,
	`downloaded_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_download_token_hash_unique` ON `orders` (`download_token_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `orders_stripe_session_id_unique` ON `orders` (`stripe_session_id`);--> statement-breakpoint
CREATE INDEX `orders_status_created_idx` ON `orders` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `stripe_events` (
	`event_id` text PRIMARY KEY NOT NULL,
	`event_type` text NOT NULL,
	`order_id` text,
	`processed_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
