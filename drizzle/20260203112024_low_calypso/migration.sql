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
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
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
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT `fk_templates_workos_id_users_workos_id_fk` FOREIGN KEY (`workos_id`) REFERENCES `users`(`workos_id`) ON DELETE CASCADE
);
--> statement-breakpoint
INSERT INTO `__new_templates`(`id`, `local_id`, `workos_id`, `name`, `description`, `notes`, `program_cycle_id`, `is_deleted`, `created_at`, `updated_at`) SELECT `id`, `local_id`, `workos_id`, `name`, `description`, `notes`, `program_cycle_id`, `is_deleted`, `created_at`, `updated_at` FROM `templates`;--> statement-breakpoint
DROP TABLE `templates`;--> statement-breakpoint
ALTER TABLE `__new_templates` RENAME TO `templates`;--> statement-breakpoint
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
	CONSTRAINT `fk_workout_exercises_workout_id_workouts_id_fk` FOREIGN KEY (`workout_id`) REFERENCES `workouts`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_workout_exercises_exercise_id_exercises_id_fk` FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
INSERT INTO `__new_workout_exercises`(`id`, `local_id`, `workout_id`, `exercise_id`, `order_index`, `notes`, `is_amrap`, `set_number`) SELECT `id`, `local_id`, `workout_id`, `exercise_id`, `order_index`, `notes`, `is_amrap`, `set_number` FROM `workout_exercises`;--> statement-breakpoint
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
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `fk_workout_sets_workout_exercise_id_workout_exercises_id_fk` FOREIGN KEY (`workout_exercise_id`) REFERENCES `workout_exercises`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
INSERT INTO `__new_workout_sets`(`id`, `local_id`, `workout_exercise_id`, `set_number`, `weight`, `reps`, `rpe`, `is_complete`, `completed_at`, `created_at`) SELECT `id`, `local_id`, `workout_exercise_id`, `set_number`, `weight`, `reps`, `rpe`, `is_complete`, `completed_at`, `created_at` FROM `workout_sets`;--> statement-breakpoint
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
--> statement-breakpoint
INSERT INTO `__new_workouts`(`id`, `local_id`, `workos_id`, `template_id`, `program_cycle_id`, `name`, `started_at`, `completed_at`, `notes`, `is_deleted`, `created_at`, `squat_1rm`, `bench_1rm`, `deadlift_1rm`, `ohp_1rm`, `starting_squat_1rm`, `starting_bench_1rm`, `starting_deadlift_1rm`, `starting_ohp_1rm`) SELECT `id`, `local_id`, `workos_id`, `template_id`, `program_cycle_id`, `name`, `started_at`, `completed_at`, `notes`, `is_deleted`, `created_at`, `squat_1rm`, `bench_1rm`, `deadlift_1rm`, `ohp_1rm`, `starting_squat_1rm`, `starting_bench_1rm`, `starting_deadlift_1rm`, `starting_ohp_1rm` FROM `workouts`;--> statement-breakpoint
DROP TABLE `workouts`;--> statement-breakpoint
ALTER TABLE `__new_workouts` RENAME TO `workouts`;--> statement-breakpoint
PRAGMA foreign_keys=ON;