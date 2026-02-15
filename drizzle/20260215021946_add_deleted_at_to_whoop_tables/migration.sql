ALTER TABLE `whoop_recoveries` ADD `sleep_id` text;--> statement-breakpoint
ALTER TABLE `whoop_recoveries` ADD `deleted_at` text;--> statement-breakpoint
ALTER TABLE `whoop_sleeps` ADD `deleted_at` text;--> statement-breakpoint
ALTER TABLE `whoop_webhook_events` ADD `trace_id` text;--> statement-breakpoint
ALTER TABLE `whoop_workouts` ADD `deleted_at` text;