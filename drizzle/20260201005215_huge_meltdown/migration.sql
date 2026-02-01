CREATE TABLE `program_cycle_workouts` (
	`id` text PRIMARY KEY,
	`cycle_id` text NOT NULL,
	`template_id` text NOT NULL,
	`week_number` integer NOT NULL,
	`session_number` integer NOT NULL,
	`session_name` text NOT NULL,
	`target_lifts` text,
	`is_complete` integer DEFAULT false,
	`workout_id` text,
	CONSTRAINT `fk_program_cycle_workouts_cycle_id_user_program_cycles_id_fk` FOREIGN KEY (`cycle_id`) REFERENCES `user_program_cycles`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_program_cycle_workouts_template_id_templates_id_fk` FOREIGN KEY (`template_id`) REFERENCES `templates`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `user_program_cycles` (
	`id` text PRIMARY KEY,
	`workos_id` text NOT NULL,
	`program_slug` text NOT NULL,
	`name` text NOT NULL,
	`squat_1rm` real NOT NULL,
	`bench_1rm` real NOT NULL,
	`deadlift_1rm` real NOT NULL,
	`ohp_1rm` real NOT NULL,
	`current_week` integer DEFAULT 1,
	`current_session` integer DEFAULT 1,
	`total_sessions_completed` integer DEFAULT 0,
	`total_sessions_planned` integer NOT NULL,
	`status` text DEFAULT 'active',
	`is_complete` integer DEFAULT false,
	`started_at` text DEFAULT CURRENT_TIMESTAMP,
	`completed_at` text,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `fk_user_program_cycles_workos_id_users_workos_id_fk` FOREIGN KEY (`workos_id`) REFERENCES `users`(`workos_id`) ON DELETE CASCADE
);
--> statement-breakpoint
ALTER TABLE `template_exercises` ADD `target_weight` real;--> statement-breakpoint
ALTER TABLE `template_exercises` ADD `sets` integer;--> statement-breakpoint
ALTER TABLE `template_exercises` ADD `reps` integer;--> statement-breakpoint
ALTER TABLE `templates` ADD `program_cycle_id` text;--> statement-breakpoint
ALTER TABLE `workouts` ADD `program_cycle_id` text;