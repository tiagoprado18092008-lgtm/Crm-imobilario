#!/usr/bin/env node
/**
 * Checks the database actually has the schema the code expects.
 *
 * Written after every screen that reads Opportunity or Conversation started
 * failing in production while `tsc` was clean and every test passed: the
 * migrations had been written but never applied, so the generated client was
 * querying columns that did not exist.
 *
 * A type check proves the code agrees with the schema file. It proves nothing
 * about the database. This closes that gap.
 *
 * Run: node scripts/check-schema.mjs
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Every model the client knows about, read once.
 *
 * Derived from the client rather than hand-listed: the first version of this
 * file only checked the models added during the rebuild, so pre-existing ones
 * that had drifted — Contact.tags, SystemSettings.id — passed the check and
 * then failed in the app.
 *
 * findFirst with no select reads every column, which is what catches a
 * missing one.
 */
const MODELS = Object.keys(prisma).filter(
  (key) =>
    !key.startsWith('$') &&
    !key.startsWith('_') &&
    typeof prisma[key] === 'object' &&
    prisma[key] !== null &&
    typeof prisma[key].findFirst === 'function',
);

const CHECKS = MODELS.map((name) => [
  name.charAt(0).toUpperCase() + name.slice(1),
  () => prisma[name].findFirst(),
]);

const failures = [];

for (const [name, run] of CHECKS) {
  try {
    await run();
    console.log(`  ok    ${name}`);
  } catch (err) {
    const detail = String(err.message).split('\n').pop().trim();
    failures.push(`  ${name}: ${detail}`);
    console.log(`  FALHA ${name}`);
  }
}

await prisma.$disconnect();

if (failures.length) {
  console.error(`\n${failures.length} modelo(s) fora de sincronia com a base de dados:\n`);
  console.error(failures.join('\n'));
  console.error('\nCorre: npx prisma migrate deploy');
  process.exit(1);
}

console.log(`\nSchema alinhado: ${CHECKS.length} modelos verificados.`);
