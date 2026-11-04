CREATE TABLE `vehicles` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`dirty` integer DEFAULT 1 NOT NULL,
	`name` text NOT NULL,
	`make` text,
	`model` text,
	`year` integer,
	`plate` text,
	`fuel_types` text NOT NULL,
	`tank_liters` real,
	`odometer_km` integer DEFAULT 0 NOT NULL
);
