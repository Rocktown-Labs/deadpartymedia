ALTER TABLE `auth_user` ADD `username` text;--> statement-breakpoint
ALTER TABLE `auth_user` ADD `display_username` text;--> statement-breakpoint
CREATE UNIQUE INDEX `auth_user_username_unique` ON `auth_user` (`username`);