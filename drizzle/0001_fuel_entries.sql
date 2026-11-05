CREATE TABLE `fuel_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`dirty` integer DEFAULT 1 NOT NULL,
	`vehicle_id` text NOT NULL,
	`date` integer NOT NULL,
	`odometer_km` integer NOT NULL,
	`liters` real NOT NULL,
	`total_price` real NOT NULL,
	`unit_price` real NOT NULL,
	`fuel_type` text NOT NULL,
	`is_full` integer NOT NULL,
	`station` text,
	`note` text
);
--> statement-breakpoint
CREATE INDEX `fuel_entries_vehicle_date` ON `fuel_entries` (`vehicle_id`,`date`);