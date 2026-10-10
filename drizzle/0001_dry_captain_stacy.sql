CREATE TABLE `calendar_connections` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`member` text NOT NULL,
	`refresh` text NOT NULL,
	`event_id` text NOT NULL,
	`synced` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`lease` integer DEFAULT 0 NOT NULL,
	`updated` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `calendar_oauth` (
	`state` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`member` text NOT NULL,
	`browser` text NOT NULL,
	`expires` integer NOT NULL
);
