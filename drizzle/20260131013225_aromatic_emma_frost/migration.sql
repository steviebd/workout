CREATE TABLE `user_streaks` (
	`id` text PRIMARY KEY,
	`workos_id` text NOT NULL UNIQUE,
	`current_streak` integer DEFAULT 0,
	`longest_streak` integer DEFAULT 0,
	`last_workout_date` text,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `fk_user_streaks_workos_id_users_workos_id_fk` FOREIGN KEY (`workos_id`) REFERENCES `users`(`workos_id`) ON DELETE CASCADE
);
