ALTER TABLE `publish_sessions` ADD `agent_public_key_json` text;--> statement-breakpoint
ALTER TABLE `publish_sessions` ADD `publish_token_envelope` text;--> statement-breakpoint
ALTER TABLE `publisher_social_profiles` ADD `verified_at` text;