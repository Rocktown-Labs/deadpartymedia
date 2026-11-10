CREATE TABLE `artmakers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`clerk_user_id` text NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`city` text NOT NULL,
	`state` text DEFAULT 'AR' NOT NULL,
	`pronouns` text,
	`show_pronouns` integer DEFAULT false NOT NULL,
	`phone_number` text NOT NULL,
	`medium` text DEFAULT '[]' NOT NULL,
	`instagram_username` text NOT NULL,
	`instagram_url` text NOT NULL,
	`bio` text,
	`image` text,
	`claimed` integer DEFAULT true NOT NULL,
	`hidden` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'published' NOT NULL,
	`profile_views` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `artmakers_city_state_idx` ON `artmakers` (`city`,`state`);--> statement-breakpoint
CREATE UNIQUE INDEX `artmakers_clerk_user_id_unique` ON `artmakers` (`clerk_user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `artmakers_slug_unique` ON `artmakers` (`slug`);--> statement-breakpoint
CREATE INDEX `artmakers_status_idx` ON `artmakers` (`status`);--> statement-breakpoint
CREATE TABLE `artworks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`artmaker_id` integer NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`image` text NOT NULL,
	`description` text,
	`medium` text,
	`year` text,
	`status` text DEFAULT 'published' NOT NULL,
	`for_sale` integer DEFAULT false NOT NULL,
	`price_cents` integer,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`artmaker_id`) REFERENCES `artmakers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `artworks_artmaker_id_idx` ON `artworks` (`artmaker_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `artworks_slug_unique` ON `artworks` (`slug`);--> statement-breakpoint
CREATE INDEX `artworks_status_idx` ON `artworks` (`status`);--> statement-breakpoint
CREATE TABLE `event_artmakers` (
	`artmaker_id` integer NOT NULL,
	`event_id` integer NOT NULL,
	FOREIGN KEY (`artmaker_id`) REFERENCES `artmakers`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
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
	FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `events_slug_unique` ON `events` (`slug`);--> statement-breakpoint
CREATE TABLE `post_artmakers` (
	`artmaker_id` integer NOT NULL,
	`post_id` integer NOT NULL,
	FOREIGN KEY (`artmaker_id`) REFERENCES `artmakers`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `posts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
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
CREATE UNIQUE INDEX `posts_slug_unique` ON `posts` (`slug`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`clerk_id` text NOT NULL,
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
CREATE UNIQUE INDEX `users_clerk_id_unique` ON `users` (`clerk_id`);--> statement-breakpoint
CREATE TABLE `venues` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
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
CREATE UNIQUE INDEX `venues_slug_unique` ON `venues` (`slug`);