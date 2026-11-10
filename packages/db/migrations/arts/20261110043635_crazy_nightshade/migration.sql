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
DROP INDEX IF EXISTS `events_slug_unique`;--> statement-breakpoint
DROP INDEX IF EXISTS `posts_slug_unique`;--> statement-breakpoint
DROP INDEX IF EXISTS `users_clerk_id_unique`;--> statement-breakpoint
DROP INDEX IF EXISTS `venues_slug_unique`;--> statement-breakpoint
CREATE UNIQUE INDEX `eventArtmakers_unique` ON `event_artmakers` (`artmaker_id`,`event_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `postArtmakers_unique` ON `post_artmakers` (`artmaker_id`,`post_id`);