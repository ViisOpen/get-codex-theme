ALTER TABLE `publish_sessions` ADD `author_profiles_json` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `theme_submissions` ADD `author_profiles_json` text DEFAULT '[]' NOT NULL;