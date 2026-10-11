CREATE TABLE `card_checkouts` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`member` text NOT NULL,
	`version` integer NOT NULL,
	`cents` integer NOT NULL,
	`stripe_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`created` integer NOT NULL
);
