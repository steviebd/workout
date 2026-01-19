ALTER TABLE `templates` ADD `notes` text;--> statement-breakpoint
ALTER TABLE `templates` ADD `is_deleted` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `template_exercises` DROP COLUMN `target_sets`;--> statement-breakpoint
ALTER TABLE `template_exercises` DROP COLUMN `target_reps`;--> statement-breakpoint
ALTER TABLE `template_exercises` DROP COLUMN `notes`;