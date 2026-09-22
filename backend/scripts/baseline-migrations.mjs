#!/usr/bin/env node
/**
 * Baselines the migration history.
 *
 * The database was created with `db push`, so it never had a
 * `_prisma_migrations` table. Prisma therefore wanted to run all 35 migrations
 * from scratch against a database whose early tables already exist, and the
 * first one would have failed.
 *
 * This records the migrations that predate the AlphaCRM work as already
 * applied — writing history only, executing no SQL from them — so that
 * `prisma migrate deploy` runs exactly the ones that are genuinely outstanding.
 *
 * One connection rather than one process per migration: `prisma migrate
 * resolve` takes about fifteen seconds per call against a remote database.
 *
 * Run once: node scripts/baseline-migrations.mjs
 */
import 'dotenv/config';
import { readdirSync, readFileSync } from 'fs';
import { createHash } from 'crypto';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'prisma', 'migrations');

/**
 * Everything up to and including this one predates the AlphaCRM work and is
 * already present in the database.
 */
const LAST_PREEXISTING = '20260509000000_add_ami_number_and_contact_tags';

const prisma = new PrismaClient();

const all = readdirSync(MIGRATIONS_DIR)
  .filter((name) => name !== 'migration_lock.toml')
  .sort();

const cutoff = all.indexOf(LAST_PREEXISTING);
if (cutoff === -1) {
  console.error(`Migração de corte não encontrada: ${LAST_PREEXISTING}`);
  process.exit(1);
}

const preexisting = all.slice(0, cutoff + 1);
const outstanding = all.slice(cutoff + 1);

console.log(`${preexisting.length} migrações pré-existentes a registar.`);
console.log(`${outstanding.length} por aplicar depois disto:`);
for (const name of outstanding) console.log(`  ${name}`);

await prisma.$executeRawUnsafe(`
  CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    "id"                  VARCHAR(36) PRIMARY KEY,
    "checksum"            VARCHAR(64) NOT NULL,
    "finished_at"         TIMESTAMPTZ,
    "migration_name"      VARCHAR(255) NOT NULL,
    "logs"                TEXT,
    "rolled_back_at"      TIMESTAMPTZ,
    "started_at"          TIMESTAMPTZ NOT NULL DEFAULT now(),
    "applied_steps_count" INTEGER NOT NULL DEFAULT 0
  )
`);

let written = 0;

for (const name of preexisting) {
  const existing = await prisma.$queryRawUnsafe(
    `SELECT 1 FROM "_prisma_migrations" WHERE migration_name = $1 LIMIT 1`,
    name,
  );
  if (existing.length > 0) continue;

  // Prisma compares this checksum on every run, so it has to be the real one.
  const sql = readFileSync(join(MIGRATIONS_DIR, name, 'migration.sql'), 'utf8');
  const checksum = createHash('sha256').update(sql).digest('hex');

  await prisma.$executeRawUnsafe(
    `INSERT INTO "_prisma_migrations"
       ("id", "checksum", "finished_at", "migration_name", "started_at", "applied_steps_count")
     VALUES ($1, $2, now(), $3, now(), 1)`,
    crypto.randomUUID(),
    checksum,
    name,
  );
  written++;
}

await prisma.$disconnect();

console.log(`\n${written} registada(s). Agora corre: npx prisma migrate deploy`);
