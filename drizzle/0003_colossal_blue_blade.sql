CREATE TABLE `solana_contributions` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`member` text NOT NULL,
	`version` integer NOT NULL,
	`cents` integer NOT NULL,
	`lamports` integer NOT NULL,
	`sender` text NOT NULL,
	`recipient` text NOT NULL,
	`memo` text NOT NULL,
	`transaction_data` text,
	`last_valid_height` integer,
	`signature` text,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `solana_contributions_signature_unique` ON `solana_contributions` (`signature`);