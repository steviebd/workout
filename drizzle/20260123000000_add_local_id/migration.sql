-- Add local_id column to exercises table
ALTER TABLE `exercises` ADD `local_id` text;

-- Add local_id column to templates table
ALTER TABLE `templates` ADD `local_id` text;

-- Add local_id column to workouts table
ALTER TABLE `workouts` ADD `local_id` text;

-- Add local_id column to workout_exercises table
ALTER TABLE `workout_exercises` ADD `local_id` text;

-- Add local_id column to workout_sets table
ALTER TABLE `workout_sets` ADD `local_id` text;
