-- Reset password for geral@alphascaleai.com to Tiagoprado12
UPDATE "User"
SET "passwordHash" = '$2a$10$GPOnVeZ/ZggjCpQ0.GgpMukjyOPhpCHEh6x.jGQLji0AKFuXqaq.C',
    "isActive" = true,
    "role" = 'AGENCY_OWNER'
WHERE "email" = 'geral@alphascaleai.com';
