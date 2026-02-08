PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_exercises` (
	`id` text PRIMARY KEY,
	`local_id` text UNIQUE,
	`workos_id` text NOT NULL,
	`name` text NOT NULL,
	`muscle_group` text,
	`description` text,
	`library_id` text,
	`is_deleted` integer DEFAULT false,
	`created_at` text,
	`updated_at` text,
	CONSTRAINT `fk_exercises_workos_id_users_workos_id_fk` FOREIGN KEY (`workos_id`) REFERENCES `users`(`workos_id`) ON DELETE CASCADE
);
--> statement-breakpoint
INSERT INTO `__new_exercises`(`id`, `local_id`, `workos_id`, `name`, `muscle_group`, `description`, `library_id`, `is_deleted`, `created_at`, `updated_at`) SELECT `id`, `local_id`, `workos_id`, `name`, `muscle_group`, `description`, `library_id`, `is_deleted`, `created_at`, `updated_at` FROM `exercises`;--> statement-breakpoint
DROP TABLE `exercises`;--> statement-breakpoint
ALTER TABLE `__new_exercises` RENAME TO `exercises`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_templates` (
	`id` text PRIMARY KEY,
	`local_id` text UNIQUE,
	`workos_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`notes` text,
	`program_cycle_id` text,
	`is_deleted` integer DEFAULT false,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT `fk_templates_workos_id_users_workos_id_fk` FOREIGN KEY (`workos_id`) REFERENCES `users`(`workos_id`) ON DELETE CASCADE
);
--> statement-breakpoint
INSERT INTO `__new_templates`(`id`, `local_id`, `workos_id`, `name`, `description`, `notes`, `program_cycle_id`, `is_deleted`, `created_at`, `updated_at`) SELECT `id`, `local_id`, `workos_id`, `name`, `description`, `notes`, `program_cycle_id`, `is_deleted`, `created_at`, `updated_at` FROM `templates`;--> statement-breakpoint
DROP TABLE `templates`;--> statement-breakpoint
ALTER TABLE `__new_templates` RENAME TO `templates`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_user_preferences` (
	`workos_id` text PRIMARY KEY,
	`weight_unit` text DEFAULT 'kg',
	`date_format` text DEFAULT 'dd/mm/yyyy',
	`theme` text DEFAULT 'light',
	`weekly_workout_target` integer DEFAULT 3,
	`created_at` text,
	`updated_at` text,
	CONSTRAINT `fk_user_preferences_workos_id_users_workos_id_fk` FOREIGN KEY (`workos_id`) REFERENCES `users`(`workos_id`) ON DELETE CASCADE
);
--> statement-breakpoint
INSERT INTO `__new_user_preferences`(`workos_id`, `weight_unit`, `date_format`, `theme`, `weekly_workout_target`, `created_at`, `updated_at`) SELECT `workos_id`, `weight_unit`, `date_format`, `theme`, `weekly_workout_target`, `created_at`, `updated_at` FROM `user_preferences`;--> statement-breakpoint
DROP TABLE `user_preferences`;--> statement-breakpoint
ALTER TABLE `__new_user_preferences` RENAME TO `user_preferences`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_user_program_cycles` (
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
	`started_at` text,
	`completed_at` text,
	`updated_at` text,
	`preferred_gym_days` text,
	`preferred_time_of_day` text,
	`program_start_date` text,
	`first_session_date` text,
	CONSTRAINT `fk_user_program_cycles_workos_id_users_workos_id_fk` FOREIGN KEY (`workos_id`) REFERENCES `users`(`workos_id`) ON DELETE CASCADE
);
--> statement-breakpoint
INSERT INTO `__new_user_program_cycles`(`id`, `workos_id`, `program_slug`, `name`, `squat_1rm`, `bench_1rm`, `deadlift_1rm`, `ohp_1rm`, `starting_squat_1rm`, `starting_bench_1rm`, `starting_deadlift_1rm`, `starting_ohp_1rm`, `current_week`, `current_session`, `total_sessions_completed`, `total_sessions_planned`, `status`, `is_complete`, `started_at`, `completed_at`, `updated_at`, `preferred_gym_days`, `preferred_time_of_day`, `program_start_date`, `first_session_date`) SELECT `id`, `workos_id`, `program_slug`, `name`, `squat_1rm`, `bench_1rm`, `deadlift_1rm`, `ohp_1rm`, `starting_squat_1rm`, `starting_bench_1rm`, `starting_deadlift_1rm`, `starting_ohp_1rm`, `current_week`, `current_session`, `total_sessions_completed`, `total_sessions_planned`, `status`, `is_complete`, `started_at`, `completed_at`, `updated_at`, `preferred_gym_days`, `preferred_time_of_day`, `program_start_date`, `first_session_date` FROM `user_program_cycles`;--> statement-breakpoint
DROP TABLE `user_program_cycles`;--> statement-breakpoint
ALTER TABLE `__new_user_program_cycles` RENAME TO `user_program_cycles`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_user_streaks` (
	`id` text PRIMARY KEY,
	`workos_id` text NOT NULL UNIQUE,
	`current_streak` integer DEFAULT 0,
	`longest_streak` integer DEFAULT 0,
	`last_workout_date` text,
	`updated_at` text,
	CONSTRAINT `fk_user_streaks_workos_id_users_workos_id_fk` FOREIGN KEY (`workos_id`) REFERENCES `users`(`workos_id`) ON DELETE CASCADE
);
--> statement-breakpoint
INSERT INTO `__new_user_streaks`(`id`, `workos_id`, `current_streak`, `longest_streak`, `last_workout_date`, `updated_at`) SELECT `id`, `workos_id`, `current_streak`, `longest_streak`, `last_workout_date`, `updated_at` FROM `user_streaks`;--> statement-breakpoint
DROP TABLE `user_streaks`;--> statement-breakpoint
ALTER TABLE `__new_user_streaks` RENAME TO `user_streaks`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` text PRIMARY KEY,
	`workos_id` text NOT NULL UNIQUE,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`created_at` text
);
--> statement-breakpoint
INSERT INTO `__new_users`(`id`, `workos_id`, `name`, `email`, `created_at`) SELECT `id`, `workos_id`, `name`, `email`, `created_at` FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_workout_exercises` (
	`id` text PRIMARY KEY,
	`local_id` text UNIQUE,
	`workout_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`order_index` integer NOT NULL,
	`notes` text,
	`is_amrap` integer DEFAULT false,
	`set_number` integer,
	`is_deleted` integer DEFAULT false,
	`updated_at` text,
	CONSTRAINT `fk_workout_exercises_workout_id_workouts_id_fk` FOREIGN KEY (`workout_id`) REFERENCES `workouts`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_workout_exercises_exercise_id_exercises_id_fk` FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
INSERT INTO `__new_workout_exercises`(`id`, `local_id`, `workout_id`, `exercise_id`, `order_index`, `notes`, `is_amrap`, `set_number`, `is_deleted`, `updated_at`) SELECT `id`, `local_id`, `workout_id`, `exercise_id`, `order_index`, `notes`, `is_amrap`, `set_number`, `is_deleted`, `updated_at` FROM `workout_exercises`;--> statement-breakpoint
DROP TABLE `workout_exercises`;--> statement-breakpoint
ALTER TABLE `__new_workout_exercises` RENAME TO `workout_exercises`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_workout_sets` (
	`id` text PRIMARY KEY,
	`local_id` text UNIQUE,
	`workout_exercise_id` text NOT NULL,
	`set_number` integer NOT NULL,
	`weight` real,
	`reps` integer,
	`rpe` real,
	`is_complete` integer DEFAULT false,
	`completed_at` text,
	`created_at` text,
	`is_deleted` integer DEFAULT false,
	`updated_at` text,
	CONSTRAINT `fk_workout_sets_workout_exercise_id_workout_exercises_id_fk` FOREIGN KEY (`workout_exercise_id`) REFERENCES `workout_exercises`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
INSERT INTO `__new_workout_sets`(`id`, `local_id`, `workout_exercise_id`, `set_number`, `weight`, `reps`, `rpe`, `is_complete`, `completed_at`, `created_at`, `is_deleted`, `updated_at`) SELECT `id`, `local_id`, `workout_exercise_id`, `set_number`, `weight`, `reps`, `rpe`, `is_complete`, `completed_at`, `created_at`, `is_deleted`, `updated_at` FROM `workout_sets`;--> statement-breakpoint
DROP TABLE `workout_sets`;--> statement-breakpoint
ALTER TABLE `__new_workout_sets` RENAME TO `workout_sets`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_workouts` (
	`id` text PRIMARY KEY,
	`local_id` text UNIQUE,
	`workos_id` text NOT NULL,
	`template_id` text,
	`program_cycle_id` text,
	`name` text NOT NULL,
	`started_at` text NOT NULL,
	`completed_at` text,
	`notes` text,
	`is_deleted` integer DEFAULT false,
	`created_at` text,
	`updated_at` text,
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
--> statement-breakpoint
INSERT INTO `__new_workouts`(`id`, `local_id`, `workos_id`, `template_id`, `program_cycle_id`, `name`, `started_at`, `completed_at`, `notes`, `is_deleted`, `created_at`, `updated_at`, `squat_1rm`, `bench_1rm`, `deadlift_1rm`, `ohp_1rm`, `starting_squat_1rm`, `starting_bench_1rm`, `starting_deadlift_1rm`, `starting_ohp_1rm`) SELECT `id`, `local_id`, `workos_id`, `template_id`, `program_cycle_id`, `name`, `started_at`, `completed_at`, `notes`, `is_deleted`, `created_at`, `updated_at`, `squat_1rm`, `bench_1rm`, `deadlift_1rm`, `ohp_1rm`, `starting_squat_1rm`, `starting_bench_1rm`, `starting_deadlift_1rm`, `starting_ohp_1rm` FROM `workouts`;--> statement-breakpoint
DROP TABLE `workouts`;--> statement-breakpoint
ALTER TABLE `__new_workouts` RENAME TO `workouts`;--> statement-breakpoint
PRAGMA foreign_keys=ON;