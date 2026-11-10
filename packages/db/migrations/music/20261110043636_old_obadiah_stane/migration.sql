PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_artists` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`slug` text NOT NULL UNIQUE,
	`name` text NOT NULL,
	`bio` text NOT NULL,
	`image` text,
	`location` text NOT NULL,
	`genre` text NOT NULL,
	`spotify_url` text,
	`spotify_artist_id` text,
	`instagram` text,
	`twitter` text,
	`tiktok` text,
	`website` text,
	`email` text,
	`phone_number` text,
	`claimed` integer DEFAULT false NOT NULL,
	`hidden` integer DEFAULT false NOT NULL,
	`claimed_by_id` text,
	`profile_views` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_artists`(`id`, `slug`, `name`, `bio`, `image`, `location`, `genre`, `spotify_url`, `spotify_artist_id`, `instagram`, `twitter`, `tiktok`, `website`, `email`, `phone_number`, `claimed`, `hidden`, `claimed_by_id`, `profile_views`, `created_at`, `updated_at`) SELECT `id`, `slug`, `name`, `bio`, `image`, `location`, `genre`, `spotify_url`, `spotify_artist_id`, `instagram`, `twitter`, `tiktok`, `website`, `email`, `phone_number`, `claimed`, `hidden`, `claimed_by_id`, `profile_views`, `created_at`, `updated_at` FROM `artists`;--> statement-breakpoint
DROP TABLE `artists`;--> statement-breakpoint
ALTER TABLE `__new_artists` RENAME TO `artists`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_backfill_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`run_id` text NOT NULL UNIQUE,
	`status` text NOT NULL,
	`total_posts` integer DEFAULT 0 NOT NULL,
	`processed_posts` integer DEFAULT 0 NOT NULL,
	`results` text,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_backfill_runs`(`id`, `run_id`, `status`, `total_posts`, `processed_posts`, `results`, `created_at`, `updated_at`) SELECT `id`, `run_id`, `status`, `total_posts`, `processed_posts`, `results`, `created_at`, `updated_at` FROM `backfill_runs`;--> statement-breakpoint
DROP TABLE `backfill_runs`;--> statement-breakpoint
ALTER TABLE `__new_backfill_runs` RENAME TO `backfill_runs`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`title` text NOT NULL,
	`slug` text NOT NULL UNIQUE,
	`description` text NOT NULL,
	`image` text,
	`venue_id` integer,
	`venue` text NOT NULL,
	`location` text NOT NULL,
	`date` text NOT NULL,
	`time` text,
	`ticket_link` text,
	`price` text,
	`genre` text NOT NULL,
	`vertical` text DEFAULT 'music' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_by_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	CONSTRAINT `events_venue_id_venues_id_fk` FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
INSERT INTO `__new_events`(`id`, `title`, `slug`, `description`, `image`, `venue_id`, `venue`, `location`, `date`, `time`, `ticket_link`, `price`, `genre`, `vertical`, `status`, `created_by_id`, `created_at`, `updated_at`) SELECT `id`, `title`, `slug`, `description`, `image`, `venue_id`, `venue`, `location`, `date`, `time`, `ticket_link`, `price`, `genre`, `vertical`, `status`, `created_by_id`, `created_at`, `updated_at` FROM `events`;--> statement-breakpoint
DROP TABLE `events`;--> statement-breakpoint
ALTER TABLE `__new_events` RENAME TO `events`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_posts` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`title` text NOT NULL,
	`slug` text NOT NULL UNIQUE,
	`category` text NOT NULL,
	`excerpt` text NOT NULL,
	`content` text NOT NULL,
	`cover_image` text,
	`author_id` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`vertical` text DEFAULT 'music' NOT NULL,
	`is_cover_story` integer DEFAULT false NOT NULL,
	`published_at` integer,
	`views` integer DEFAULT 0 NOT NULL,
	`delete_requested` integer DEFAULT false NOT NULL,
	`delete_requested_at` integer,
	`tags` text,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_posts`(`id`, `title`, `slug`, `category`, `excerpt`, `content`, `cover_image`, `author_id`, `status`, `vertical`, `is_cover_story`, `published_at`, `views`, `delete_requested`, `delete_requested_at`, `tags`, `created_at`, `updated_at`) SELECT `id`, `title`, `slug`, `category`, `excerpt`, `content`, `cover_image`, `author_id`, `status`, `vertical`, `is_cover_story`, `published_at`, `views`, `delete_requested`, `delete_requested_at`, `tags`, `created_at`, `updated_at` FROM `posts`;--> statement-breakpoint
DROP TABLE `posts`;--> statement-breakpoint
ALTER TABLE `__new_posts` RENAME TO `posts`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`clerk_id` text NOT NULL UNIQUE,
	`email` text NOT NULL,
	`first_name` text,
	`last_name` text,
	`image_url` text,
	`role` text DEFAULT 'fan' NOT NULL,
	`onboarding_complete` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_users`(`id`, `clerk_id`, `email`, `first_name`, `last_name`, `image_url`, `role`, `onboarding_complete`, `created_at`, `updated_at`) SELECT `id`, `clerk_id`, `email`, `first_name`, `last_name`, `image_url`, `role`, `onboarding_complete`, `created_at`, `updated_at` FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_venues` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`name` text NOT NULL,
	`slug` text NOT NULL UNIQUE,
	`address` text,
	`city` text DEFAULT 'Little Rock' NOT NULL,
	`state` text DEFAULT 'AR' NOT NULL,
	`zip` text,
	`website` text,
	`phone` text,
	`capacity` text,
	`genres` text,
	`description` text,
	`booking_rates` text,
	`booking_email` text,
	`image` text,
	`claimed_by_id` text,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_venues`(`id`, `name`, `slug`, `address`, `city`, `state`, `zip`, `website`, `phone`, `capacity`, `genres`, `description`, `booking_rates`, `booking_email`, `image`, `claimed_by_id`, `created_at`, `updated_at`) SELECT `id`, `name`, `slug`, `address`, `city`, `state`, `zip`, `website`, `phone`, `capacity`, `genres`, `description`, `booking_rates`, `booking_email`, `image`, `claimed_by_id`, `created_at`, `updated_at` FROM `venues`;--> statement-breakpoint
DROP TABLE `venues`;--> statement-breakpoint
ALTER TABLE `__new_venues` RENAME TO `venues`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
DROP INDEX IF EXISTS `artists_slug_unique`;--> statement-breakpoint
DROP INDEX IF EXISTS `backfill_runs_run_id_unique`;--> statement-breakpoint
DROP INDEX IF EXISTS `events_slug_unique`;--> statement-breakpoint
DROP INDEX IF EXISTS `posts_slug_unique`;--> statement-breakpoint
DROP INDEX IF EXISTS `users_clerk_id_unique`;--> statement-breakpoint
DROP INDEX IF EXISTS `venues_slug_unique`;--> statement-breakpoint
CREATE UNIQUE INDEX `eventArtists_unique` ON `event_artists` (`artist_id`,`event_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `postArtists_unique` ON `post_artists` (`artist_id`,`post_id`);