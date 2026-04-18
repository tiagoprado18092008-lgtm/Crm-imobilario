-- Disable all NEW_LEAD automation rules to prevent unwanted WhatsApp messages on contact creation
UPDATE "AutomationRule" SET "isActive" = false WHERE "trigger" = 'NEW_LEAD';
