CREATE TABLE `expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`dirty` integer DEFAULT 1 NOT NULL,
	`vehicle_id` text NOT NULL,
	`date` integer NOT NULL,
	`odometer_km` integer,
	`category` text NOT NULL,
	`subtype` text,
	`amount` real NOT NULL,
	`note` text
);
--> statement-breakpoint
CREATE INDEX `expenses_vehicle_date` ON `expenses` (`vehicle_id`,`date`);--> statement-breakpoint
CREATE TABLE `reminders` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`dirty` integer DEFAULT 1 NOT NULL,
	`vehicle_id` text NOT NULL,
	`kind` text NOT NULL,
	`title` text,
	`due_date` integer,
	`due_km` integer,
	`interval_months` integer,
	`interval_km` integer,
	`last_done_date` integer,
	`last_done_km` integer,
	`enabled` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `reminders_vehicle` ON `reminders` (`vehicle_id`);