CREATE TABLE `publisher_oauth_states` (
	`state_hash` text PRIMARY KEY NOT NULL,
	`publisher_id` text NOT NULL,
	`platform` text NOT NULL,
	`code_verifier` text NOT NULL,
	`redirect_uri` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `publisher_oauth_states_publisher_platform_unique` ON `publisher_oauth_states` (`publisher_id`,`platform`);--> statement-breakpoint
CREATE INDEX `publisher_oauth_states_expiry_idx` ON `publisher_oauth_states` (`expires_at`);--> statement-breakpoint
CREATE TABLE `publisher_social_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`publisher_id` text NOT NULL,
	`platform` text NOT NULL,
	`provider_account_id` text NOT NULL,
	`username` text NOT NULL,
	`display_name` text NOT NULL,
	`profile_url` text NOT NULL,
	`connected_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `publisher_social_profiles_publisher_platform_unique` ON `publisher_social_profiles` (`publisher_id`,`platform`);--> statement-breakpoint
CREATE UNIQUE INDEX `publisher_social_profiles_provider_account_unique` ON `publisher_social_profiles` (`platform`,`provider_account_id`);--> statement-breakpoint
CREATE INDEX `publisher_social_profiles_publisher_idx` ON `publisher_social_profiles` (`publisher_id`);