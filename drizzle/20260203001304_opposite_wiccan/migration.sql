CREATE TABLE `exercises` (
	`id` text PRIMARY KEY,
	`local_id` text,
	`workos_id` text NOT NULL,
	`name` text NOT NULL,
	`muscle_group` text,
	`description` text,
	`library_id` text,
	`is_deleted` integer DEFAULT false,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `fk_exercises_workos_id_users_workos_id_fk` FOREIGN KEY (`workos_id`) REFERENCES `users`(`workos_id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `program_cycle_workouts` (
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
	`scheduled_date` text,
	`scheduled_time` text,
	CONSTRAINT `fk_program_cycle_workouts_cycle_id_user_program_cycles_id_fk` FOREIGN KEY (`cycle_id`) REFERENCES `user_program_cycles`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_program_cycle_workouts_template_id_templates_id_fk` FOREIGN KEY (`template_id`) REFERENCES `templates`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `template_exercises` (
	`id` text PRIMARY KEY,
	`template_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`order_index` integer NOT NULL,
	`target_weight` real,
	`added_weight` real DEFAULT 0,
	`sets` integer,
	`reps` integer,
	`reps_raw` text,
	`is_amrap` integer DEFAULT false,
	`is_accessory` integer DEFAULT false,
	`is_required` integer DEFAULT true,
	`set_number` integer,
	CONSTRAINT `fk_template_exercises_template_id_templates_id_fk` FOREIGN KEY (`template_id`) REFERENCES `templates`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_template_exercises_exercise_id_exercises_id_fk` FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `templates` (
	`id` text PRIMARY KEY,
	`local_id` text,
	`workos_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`notes` text,
	`program_cycle_id` text,
	`is_deleted` integer DEFAULT false,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT `fk_templates_workos_id_users_workos_id_fk` FOREIGN KEY (`workos_id`) REFERENCES `users`(`workos_id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `user_preferences` (
	`id` text PRIMARY KEY,
	`workos_id` text,
	`weight_unit` text DEFAULT 'kg',
	`date_format` text DEFAULT 'dd/mm/yyyy',
	`theme` text DEFAULT 'light',
	`weekly_workout_target` integer DEFAULT 3,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `fk_user_preferences_workos_id_users_workos_id_fk` FOREIGN KEY (`workos_id`) REFERENCES `users`(`workos_id`) ON DELETE CASCADE
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
	`starting_squat_1rm` real,
	`starting_bench_1rm` real,
	`starting_deadlift_1rm` real,
	`starting_ohp_1rm` real,
	`current_week` integer DEFAULT 1,
	`current_session` integer DEFAULT 1,
	`total_sessions_completed` integer DEFAULT 0,
	`total_sessions_planned` integer NOT NULL,
	`status` text DEFAULT 'active',
	`is_complete` integer DEFAULT false,
	`started_at` text DEFAULT CURRENT_TIMESTAMP,
	`completed_at` text,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	`preferred_gym_days` text,
	`preferred_time_of_day` text,
	`program_start_date` text,
	`first_session_date` text,
	CONSTRAINT `fk_user_program_cycles_workos_id_users_workos_id_fk` FOREIGN KEY (`workos_id`) REFERENCES `users`(`workos_id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `user_streaks` (
	`id` text PRIMARY KEY,
	`workos_id` text NOT NULL UNIQUE,
	`current_streak` integer DEFAULT 0,
	`longest_streak` integer DEFAULT 0,
	`last_workout_date` text,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `fk_user_streaks_workos_id_users_workos_id_fk` FOREIGN KEY (`workos_id`) REFERENCES `users`(`workos_id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY,
	`workos_id` text NOT NULL UNIQUE,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `workout_exercises` (
	`id` text PRIMARY KEY,
	`local_id` text,
	`workout_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`order_index` integer NOT NULL,
	`notes` text,
	`is_amrap` integer DEFAULT false,
	`set_number` integer,
	CONSTRAINT `fk_workout_exercises_workout_id_workouts_id_fk` FOREIGN KEY (`workout_id`) REFERENCES `workouts`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_workout_exercises_exercise_id_exercises_id_fk` FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `workout_sets` (
	`id` text PRIMARY KEY,
	`local_id` text,
	`workout_exercise_id` text NOT NULL,
	`set_number` integer NOT NULL,
	`weight` real,
	`reps` integer,
	`rpe` real,
	`is_complete` integer DEFAULT false,
	`completed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `fk_workout_sets_workout_exercise_id_workout_exercises_id_fk` FOREIGN KEY (`workout_exercise_id`) REFERENCES `workout_exercises`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `workouts` (
	`id` text PRIMARY KEY,
	`local_id` text,
	`workos_id` text NOT NULL,
	`template_id` text,
	`program_cycle_id` text,
	`name` text NOT NULL,
	`started_at` text NOT NULL,
	`completed_at` text,
	`notes` text,
	`is_deleted` integer DEFAULT false,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`squat_1rm` real,
	`bench_1rm` real,
	`deadlift_1rm` real,
	`ohp_1rm` real,
	`starting_squat_1rm` real,
	`starting_bench_1rm` real,
	`starting_deadlift_1rm` real,
	`starting_ohp_1rm` real,
	CONSTRAINT `fk_workouts_workos_id_users_workos_id_fk` FOREIGN KEY (`workos_id`) REFERENCES `users`(`workos_id`) ON DELETE CASCADE,
	CONSTRAINT `fk_workouts_template_id_templates_id_fk` FOREIGN KEY (`template_id`) REFERENCES `templates`(`id`) ON DELETE SET NULL
);
