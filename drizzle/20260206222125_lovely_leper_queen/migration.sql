ALTER TABLE `workout_exercises` ADD COLUMN `is_deleted` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `workout_exercises` ADD COLUMN `updated_at` text;
UPDATE `workout_exercises` SET `updated_at` = datetime('now') WHERE `updated_at` IS NULL;
--> statement-breakpoint
ALTER TABLE `workout_sets` ADD COLUMN `is_deleted` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `workout_sets` ADD COLUMN `updated_at` text;
UPDATE `workout_sets` SET `updated_at` = datetime('now') WHERE `updated_at` IS NULL;
--> statement-breakpoint
ALTER TABLE `workouts` ADD COLUMN `updated_at` text;
UPDATE `workouts` SET `updated_at` = datetime('now') WHERE `updated_at` IS NULL;
