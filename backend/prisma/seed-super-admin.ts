import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL || 'geral@alphascaleai.com';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.user.update({
      where: { email },
      data: { role: 'SUPER_ADMIN', agencyId: null, locationId: null, isActive: true },
    });
    console.log(`✓ Super-admin updated: ${email}`);
  } else {
    await prisma.user.create({
      data: {
        name: 'Super Admin',
        email,
        role: 'SUPER_ADMIN',
        agencyId: null,
        locationId: null,
        isActive: true,
      },
    });
    console.log(`✓ Super-admin created: ${email}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
