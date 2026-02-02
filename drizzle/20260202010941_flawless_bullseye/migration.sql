ALTER TABLE `template_exercises` ADD `added_weight` real DEFAULT 0;--> statement-breakpoint
ALTER TABLE `template_exercises` ADD `reps_raw` text;--> statement-breakpoint
ALTER TABLE `template_exercises` ADD `is_accessory` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `template_exercises` ADD `is_required` integer DEFAULT true;