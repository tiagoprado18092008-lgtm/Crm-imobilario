import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
try {
  const r = await p.$queryRawUnsafe(`SELECT COUNT(*)::int AS n FROM "_prisma_migrations"`);
  console.log(`registadas ${r[0].n}/28`);
} catch { console.log('registadas 0/28'); }
await p.$disconnect();
