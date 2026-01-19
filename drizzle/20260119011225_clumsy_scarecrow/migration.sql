CREATE TABLE `user_preferences` (
	`id` text PRIMARY KEY,
	`user_id` text,
	`weight_unit` text DEFAULT 'kg',
	`theme` text DEFAULT 'light',
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `fk_user_preferences_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
