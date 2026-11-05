ALTER TABLE `expenses` ADD `subtypes` text;--> statement-breakpoint
-- Elle eklendi: tek alt tür, tek elemanlı diziye taşınır ("oil" → ["oil"]).
UPDATE `expenses` SET `subtypes` = json_array(`subtype`) WHERE `subtype` IS NOT NULL;
