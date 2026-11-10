CREATE TABLE `article_comments` (
	`clerk_user_id` text NOT NULL,
	`content` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`parent_id` integer,
	`post_id` integer NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`user_email` text,
	`user_name` text,
	FOREIGN KEY (`parent_id`) REFERENCES `article_comments`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `article_comments_user_created_at_idx` ON `article_comments` (`clerk_user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `article_comments_clerk_user_id_idx` ON `article_comments` (`clerk_user_id`);--> statement-breakpoint
CREATE INDEX `article_comments_parent_id_idx` ON `article_comments` (`parent_id`);--> statement-breakpoint
CREATE INDEX `article_comments_post_id_idx` ON `article_comments` (`post_id`);--> statement-breakpoint
CREATE TABLE `artists` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
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
CREATE UNIQUE INDEX `artists_slug_unique` ON `artists` (`slug`);--> statement-breakpoint
CREATE TABLE `backfill_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`run_id` text NOT NULL,
	`status` text NOT NULL,
	`total_posts` integer DEFAULT 0 NOT NULL,
	`processed_posts` integer DEFAULT 0 NOT NULL,
	`results` text,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `backfill_runs_run_id_unique` ON `backfill_runs` (`run_id`);--> statement-breakpoint
CREATE TABLE `event_artists` (
	`artist_id` integer NOT NULL,
	`event_id` integer NOT NULL,
	FOREIGN KEY (`artist_id`) REFERENCES `artists`(`id`) ON UPDATE no action ON DELETE cascade,
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
CREATE TABLE `music_releases` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`artist_name` text NOT NULL,
	`artist_id` integer,
	`release_type` text DEFAULT 'Single' NOT NULL,
	`genre` text DEFAULT 'OTHER' NOT NULL,
	`release_date` text,
	`cover_art` text,
	`audio_url` text,
	`excerpt` text NOT NULL,
	`content` text,
	`spotify_url` text,
	`apple_music_url` text,
	`bandcamp_url` text,
	`youtube_url` text,
	`author_id` text NOT NULL,
	`status` text DEFAULT 'published' NOT NULL,
	`submission_status` text DEFAULT 'approved' NOT NULL,
	`decline_reason` text,
	`featured` integer DEFAULT false NOT NULL,
	`views` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`artist_id`) REFERENCES `artists`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `music_releases_slug_unique` ON `music_releases` (`slug`);--> statement-breakpoint
CREATE INDEX `music_releases_artist_id_idx` ON `music_releases` (`artist_id`);--> statement-breakpoint
CREATE INDEX `music_releases_featured_idx` ON `music_releases` (`featured`);--> statement-breakpoint
CREATE INDEX `music_releases_genre_idx` ON `music_releases` (`genre`);--> statement-breakpoint
CREATE INDEX `music_releases_release_type_idx` ON `music_releases` (`release_type`);--> statement-breakpoint
CREATE INDEX `music_releases_status_idx` ON `music_releases` (`status`);--> statement-breakpoint
CREATE INDEX `music_releases_submission_status_idx` ON `music_releases` (`submission_status`);--> statement-breakpoint
CREATE TABLE `post_artists` (
	`artist_id` integer NOT NULL,
	`post_id` integer NOT NULL,
	FOREIGN KEY (`artist_id`) REFERENCES `artists`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `post_import_sources` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`imported_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`post_id` integer NOT NULL,
	`source_author_slug` text NOT NULL,
	`source_categories_json` text NOT NULL,
	`source_modified_at` integer,
	`source_published_at` integer NOT NULL,
	`source_url` text NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `post_import_sources_post_id_unique` ON `post_import_sources` (`post_id`);--> statement-breakpoint
CREATE INDEX `post_import_sources_source_author_slug_idx` ON `post_import_sources` (`source_author_slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `post_import_sources_source_url_unique` ON `post_import_sources` (`source_url`);--> statement-breakpoint
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
CREATE TABLE `user_article_reads` (
	`clerk_user_id` text NOT NULL,
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`post_id` integer NOT NULL,
	`read_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `user_article_reads_user_idx` ON `user_article_reads` (`clerk_user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_article_reads_user_post_unique` ON `user_article_reads` (`clerk_user_id`,`post_id`);--> statement-breakpoint
CREATE TABLE `user_article_saves` (
	`clerk_user_id` text NOT NULL,
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`post_id` integer NOT NULL,
	`saved_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `user_article_saves_user_idx` ON `user_article_saves` (`clerk_user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_article_saves_user_post_unique` ON `user_article_saves` (`clerk_user_id`,`post_id`);--> statement-breakpoint
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