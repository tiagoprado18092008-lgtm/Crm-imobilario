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

/** One cheap read per model the app depends on. */
const CHECKS = [
  ['Contact', () => prisma.contact.findFirst({ select: { id: true, agencyId: true } })],
  ['Opportunity', () => prisma.opportunity.findFirst({ select: { id: true, agencyId: true, rottingAt: true, nextActivityAt: true } })],
  ['Conversation', () => prisma.conversation.findFirst({ select: { id: true, agencyId: true } })],
  ['Message', () => prisma.message.findFirst({ select: { id: true, agencyId: true } })],
  ['PipelineStage', () => prisma.pipelineStage.findFirst({ select: { id: true, rotDays: true, requiredFields: true } })],
  ['Lead', () => prisma.lead.findFirst({ select: { id: true } })],
  ['Company', () => prisma.company.findFirst({ select: { id: true } })],
  ['SavedView', () => prisma.savedView.findFirst({ select: { id: true } })],
  ['Call', () => prisma.call.findFirst({ select: { id: true } })],
  ['CallEvent', () => prisma.callEvent.findFirst({ select: { id: true } })],
  ['Recording', () => prisma.recording.findFirst({ select: { id: true } })],
  ['AgentExtension', () => prisma.agentExtension.findFirst({ select: { id: true } })],
  ['Product', () => prisma.product.findFirst({ select: { id: true } })],
  ['DealLineItem', () => prisma.dealLineItem.findFirst({ select: { id: true } })],
  ['Quote', () => prisma.quote.findFirst({ select: { id: true } })],
  ['Project', () => prisma.project.findFirst({ select: { id: true } })],
  ['ProjectTask', () => prisma.projectTask.findFirst({ select: { id: true } })],
  ['Deliverable', () => prisma.deliverable.findFirst({ select: { id: true } })],
];

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
