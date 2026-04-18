-- Remove the old singleton WhatsApp session so it doesn't conflict with per-agency sessions
DELETE FROM "WhatsAppSession" WHERE "id" = 'singleton';
