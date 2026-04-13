CREATE TABLE `nutrition_chat_messages` (
	`id` text PRIMARY KEY,
	`workos_id` text NOT NULL,
	`date` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`has_image` integer DEFAULT false,
	`created_at` text,
	CONSTRAINT `fk_nutrition_chat_messages_workos_id_users_workos_id_fk` FOREIGN KEY (`workos_id`) REFERENCES `users`(`workos_id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `nutrition_entries` (
	`id` text PRIMARY KEY,
	`workos_id` text NOT NULL,
	`meal_type` text,
	`name` text,
	`calories` real,
	`protein_g` real,
	`carbs_g` real,
	`fat_g` real,
	`ai_analysis` text,
	`logged_at` text NOT NULL,
	`date` text NOT NULL,
	`is_deleted` integer DEFAULT false,
	`created_at` text,
	`updated_at` text,
	CONSTRAINT `fk_nutrition_entries_workos_id_users_workos_id_fk` FOREIGN KEY (`workos_id`) REFERENCES `users`(`workos_id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `nutrition_training_context` (
	`id` text PRIMARY KEY,
	`workos_id` text NOT NULL,
	`date` text NOT NULL,
	`training_type` text NOT NULL,
	`custom_label` text,
	`created_at` text,
	`updated_at` text,
	CONSTRAINT `fk_nutrition_training_context_workos_id_users_workos_id_fk` FOREIGN KEY (`workos_id`) REFERENCES `users`(`workos_id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `user_body_stats` (
	`id` text PRIMARY KEY,
	`workos_id` text NOT NULL UNIQUE,
	`bodyweight_kg` real,
	`height_cm` real,
	`target_calories` integer,
	`target_protein_g` integer,
	`target_carbs_g` integer,
	`target_fat_g` integer,
	`recorded_at` text,
	`created_at` text,
	`updated_at` text,
	CONSTRAINT `fk_user_body_stats_workos_id_users_workos_id_fk` FOREIGN KEY (`workos_id`) REFERENCES `users`(`workos_id`) ON DELETE CASCADE
);
--> statement-breakpoint
ALTER TABLE `user_preferences` ADD `energy_unit` text DEFAULT 'kcal';