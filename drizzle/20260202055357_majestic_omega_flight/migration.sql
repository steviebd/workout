PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_program_cycle_workouts` (
	`id` text PRIMARY KEY,
	`cycle_id` text NOT NULL,
	`template_id` text,
	`week_number` integer NOT NULL,
	`session_number` integer NOT NULL,
	`session_name` text NOT NULL,
	`target_lifts` text,
	`is_complete` integer DEFAULT false,
	`workout_id` text,
	`created_at` text,
	`updated_at` text,
	CONSTRAINT `fk_program_cycle_workouts_cycle_id_user_program_cycles_id_fk` FOREIGN KEY (`cycle_id`) REFERENCES `user_program_cycles`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_program_cycle_workouts_template_id_templates_id_fk` FOREIGN KEY (`template_id`) REFERENCES `templates`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
INSERT INTO `__new_program_cycle_workouts`(`id`, `cycle_id`, `template_id`, `week_number`, `session_number`, `session_name`, `target_lifts`, `is_complete`, `workout_id`, `created_at`, `updated_at`) SELECT `id`, `cycle_id`, `template_id`, `week_number`, `session_number`, `session_name`, `target_lifts`, `is_complete`, `workout_id`, `created_at`, `updated_at` FROM `program_cycle_workouts`;--> statement-breakpoint
DROP TABLE `program_cycle_workouts`;--> statement-breakpoint
ALTER TABLE `__new_program_cycle_workouts` RENAME TO `program_cycle_workouts`;--> statement-breakpoint
PRAGMA foreign_keys=ON;