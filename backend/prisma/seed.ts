import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * AlphaCRM seed.
 *
 * Creates the workspace, its users and the two default sales pipelines.
 * Deliberately does NOT create contacts or deals: cold-call leads enter
 * through the CSV importer once the Lead model lands (phase 3), so seeding
 * fake ones here would recreate the "pipeline full of unqualified rows"
 * problem this rebuild exists to fix.
 */
async function main() {
  console.log('A iniciar seed...');

  const existingUsers = await prisma.user.count();
  if (existingUsers > 0 && process.env.FORCE_SEED !== 'true') {
    console.log(`Seed cancelado: já existem ${existingUsers} utilizador(es) na base de dados.`);
    console.log('Para forçar o seed e apagar tudo, usa: FORCE_SEED=true npm run db:seed');
    return;
  }

  // Limpar dados existentes (ordem respeita as chaves estrangeiras)
  await prisma.activityLog.deleteMany();
  await prisma.automationLog.deleteMany();
  await prisma.emailCampaignRecipient.deleteMany();
  await prisma.emailCampaign.deleteMany();
  await prisma.formSubmission.deleteMany();
  await prisma.form.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.interaction.deleteMany();
  await prisma.opportunity.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.quote.deleteMany();
  await prisma.dealLineItem.deleteMany();
  await prisma.product.deleteMany();
  await prisma.pipelineStage.deleteMany();
  await prisma.pipeline.deleteMany();
  await prisma.invitation.deleteMany();
  await prisma.phoneNumber.deleteMany();
  await prisma.automationRule.deleteMany();
  await prisma.user.deleteMany();
  await prisma.agencySettings.deleteMany();
  await prisma.agency.deleteMany();

  console.log('Dados anteriores removidos');

  // ─── WORKSPACE ──────────────────────────────────────────────────────────────
  const agency = await prisma.agency.upsert({
    where: { slug: 'alphascale' },
    update: {},
    create: { name: 'AlphaScale AI', slug: 'alphascale', isActive: true },
  });

  // ─── UTILIZADORES ───────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash('admin123', 10);
  const userHash = await bcrypt.hash('user123', 10);

  const owner = await prisma.user.create({
    data: {
      name: 'Tiago Prado',
      email: 'geral@alphascaleai.com',
      passwordHash: adminHash,
      role: 'AGENCY_OWNER',
      agencyId: agency.id,
      isActive: true,
      onboardingCompleted: true,
    },
  });

  const bdr = await prisma.user.create({
    data: {
      name: 'BDR Demo',
      email: 'bdr@alphascaleai.com',
      passwordHash: userHash,
      role: 'CONSULTANT',
      agencyId: agency.id,
      supervisorId: owner.id,
      isActive: true,
      onboardingCompleted: true,
    },
  });

  // ─── PIPELINES ──────────────────────────────────────────────────────────────
  // Duas linhas de negócio distintas: projetos one-off e avenças recorrentes.
  /**
   * Stages carry their own rules. A stage created without them has no rotting
   * threshold and demands nothing before a deal enters, which is how the
   * pipeline quietly stops enforcing anything.
   *
   * rotDays: how long a deal may sit here before it is flagged as going cold.
   * requiredFields: what a deal must have before it is allowed in.
   */
  type StageDef = {
    name: string;
    probability: number;
    rotDays: number | null;
    requiredFields?: string[];
  };

  const pipelines: { name: string; stages: StageDef[] }[] = [
    {
      name: 'Websites',
      stages: [
        { name: 'Novo',             probability: 10, rotDays: 7 },
        { name: 'Contactado',       probability: 20, rotDays: 5 },
        { name: 'Reunião Marcada',  probability: 40, rotDays: 10 },
        { name: 'Reunião Feita',    probability: 55, rotDays: 5 },
        // A proposal with no value cannot be forecast, and finding that out at
        // the end of the month is too late.
        { name: 'Proposta Enviada', probability: 70, rotDays: 7,
          requiredFields: ['value', 'expectedCloseDate'] },
        { name: 'Negociação',       probability: 85, rotDays: 5,
          requiredFields: ['value', 'nextActivityAt'] },
      ],
    },
    {
      name: 'Avenças / Ads',
      stages: [
        { name: 'Novo',               probability: 10, rotDays: 7 },
        { name: 'Diagnóstico Feito',  probability: 30, rotDays: 14 },
        { name: 'Proposta Enviada',   probability: 60, rotDays: 7,
          requiredFields: ['value', 'expectedCloseDate'] },
        { name: 'Negociação',         probability: 80, rotDays: 5,
          requiredFields: ['value', 'nextActivityAt'] },
        { name: 'Contrato Assinado',  probability: 95, rotDays: null },
      ],
    },
  ];

  for (let index = 0; index < pipelines.length; index++) {
    const def = pipelines[index];
    const pipeline = await prisma.pipeline.create({
      data: {
        name: def.name,
        agencyId: agency.id,
        position: index,
      },
    });

    await prisma.pipelineStage.createMany({
      data: def.stages.map((stage, position) => ({
        pipelineId: pipeline.id,
        agencyId: agency.id,
        name: stage.name,
        position,
        probability: stage.probability,
        rotDays: stage.rotDays,
        requiredFields: stage.requiredFields ?? undefined,
      })),
    });
  }

  // ─── PRODUTOS ───────────────────────────────────────────────────────────────
  // O que a AlphaScale vende hoje, valores sem IVA.
  await prisma.product.createMany({
    data: [
      { agencyId: agency.id, name: 'Website', description: 'Website institucional, entregue e publicado', priceType: 'UNICO', price: 700, position: 0 },
      { agencyId: agency.id, name: 'Ads Setup', description: 'Configuração inicial de campanhas Google e Meta', priceType: 'UNICO', price: 250, position: 1 },
      { agencyId: agency.id, name: 'Gestão de Ads', description: 'Gestão mensal de campanhas e relatório', priceType: 'MENSAL', price: 200, position: 2 },
      { agencyId: agency.id, name: 'Gestão de Redes Sociais', description: 'Planeamento e publicação mensal', priceType: 'MENSAL', price: 200, position: 3 },
      { agencyId: agency.id, name: 'SEO', description: 'Otimização para motores de busca, mensal', priceType: 'MENSAL', price: 200, position: 4 },
    ],
    skipDuplicates: true,
  });

  console.log('Seed concluído.');
  console.log(`   ${owner.email}  | admin123 | AGENCY_OWNER`);
  console.log(`   ${bdr.email}    | user123  | CONSULTANT`);
  console.log(`   ${pipelines.length} pipelines e 5 produtos criados, sem contactos nem negócios.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
