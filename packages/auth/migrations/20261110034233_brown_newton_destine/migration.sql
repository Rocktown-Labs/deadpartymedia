ALTER TABLE `app_invitation` ADD `artist_id` integer;--> statement-breakpoint
ALTER TABLE `app_invitation` ADD `local_profile_id` integer;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_app_invitation` (
	`id` text PRIMARY KEY,
	`app` text NOT NULL,
	`email` text NOT NULL,
	`role` text NOT NULL,
	`artist_id` integer,
	`local_profile_id` integer,
	`token_hash` text NOT NULL UNIQUE,
	`invited_by` text NOT NULL,
	`expires_at` integer NOT NULL,
	`accepted_at` integer,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	CONSTRAINT `app_invitation_invited_by_auth_user_id_fk` FOREIGN KEY (`invited_by`) REFERENCES `auth_user`(`id`)
);
--> statement-breakpoint
INSERT INTO `__new_app_invitation`(`id`, `app`, `email`, `role`, `token_hash`, `invited_by`, `expires_at`, `accepted_at`, `created_at`) SELECT `id`, `app`, `email`, `role`, `token_hash`, `invited_by`, `expires_at`, `accepted_at`, `created_at` FROM `app_invitation`;--> statement-breakpoint
DROP TABLE `app_invitation`;--> statement-breakpoint
ALTER TABLE `__new_app_invitation` RENAME TO `app_invitation`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_auth_session` (
	`id` text PRIMARY KEY,
	`user_id` text NOT NULL,
	`token` text NOT NULL UNIQUE,
	`expires_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	CONSTRAINT `auth_session_user_id_auth_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `auth_user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
INSERT INTO `__new_auth_session`(`id`, `user_id`, `token`, `expires_at`, `ip_address`, `user_agent`, `created_at`, `updated_at`) SELECT `id`, `user_id`, `token`, `expires_at`, `ip_address`, `user_agent`, `created_at`, `updated_at` FROM `auth_session`;--> statement-breakpoint
DROP TABLE `auth_session`;--> statement-breakpoint
ALTER TABLE `__new_auth_session` RENAME TO `auth_session`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_auth_user` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`email` text NOT NULL UNIQUE,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`disabled` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_auth_user`(`id`, `name`, `email`, `email_verified`, `image`, `disabled`, `created_at`, `updated_at`) SELECT `id`, `name`, `email`, `email_verified`, `image`, `disabled`, `created_at`, `updated_at` FROM `auth_user`;--> statement-breakpoint
DROP TABLE `auth_user`;--> statement-breakpoint
ALTER TABLE `__new_auth_user` RENAME TO `auth_user`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
DROP INDEX IF EXISTS `app_invitation_token_hash_unique`;--> statement-breakpoint
DROP INDEX IF EXISTS `auth_session_token_unique`;--> statement-breakpoint
DROP INDEX IF EXISTS `auth_user_email_unique`;