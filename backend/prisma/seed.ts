import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Clean existing data in order
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
  await prisma.property.deleteMany();
  await prisma.invitation.deleteMany();
  await prisma.phoneNumber.deleteMany();
  await prisma.user.deleteMany();

  console.log('🗑️  Cleared existing data');

  // ─── USERS ───────────────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash('Admin123!', 12);
  const userHash = await bcrypt.hash('Pass123!', 12);

  const admin = await prisma.user.create({
    data: {
      name: 'Carlos Admin',
      email: 'admin@crm.pt',
      passwordHash: adminHash,
      role: 'ADMIN',
      phone: '+351910000001',
      isActive: true,
    },
  });

  const joao = await prisma.user.create({
    data: {
      name: 'João Silva',
      email: 'joao@crm.pt',
      passwordHash: userHash,
      role: 'PRINCIPAL_CONSULTANT',
      phone: '+351910000002',
      isActive: true,
    },
  });

  const ana = await prisma.user.create({
    data: {
      name: 'Ana Costa',
      email: 'ana@crm.pt',
      passwordHash: userHash,
      role: 'SUB_AGENT',
      phone: '+351910000003',
      supervisorId: joao.id,
      isActive: true,
    },
  });

  const pedro = await prisma.user.create({
    data: {
      name: 'Pedro Santos',
      email: 'pedro@crm.pt',
      passwordHash: userHash,
      role: 'SUB_AGENT',
      phone: '+351910000004',
      supervisorId: joao.id,
      isActive: true,
    },
  });

  console.log(`✅ Created ${4} users`);

  // ─── PROPERTIES ──────────────────────────────────────────────────────────────
  const prop1 = await prisma.property.create({
    data: {
      title: 'T3 Apartamento Cascais',
      description: 'Excelente apartamento T3 com vista mar em Cascais. Cozinha equipada, dois lugares de garagem e arrecadação.',
      type: 'APARTMENT',
      status: 'AVAILABLE',
      price: 450000,
      address: 'Rua das Flores, 45, 2750-123 Cascais',
      area: 115,
      bedrooms: 3,
      bathrooms: 2,
      parking: 2,
      reference: 'CAS-APT-001',
      imageUrls: '[]',
    },
  });

  const prop2 = await prisma.property.create({
    data: {
      title: 'Moradia V4 Sintra',
      description: 'Deslumbrante moradia V4 em zona residencial tranquila de Sintra. Jardim com piscina, garagem para 3 carros.',
      type: 'HOUSE',
      status: 'AVAILABLE',
      price: 680000,
      address: 'Avenida da Serra, 12, 2710-456 Sintra',
      area: 280,
      bedrooms: 4,
      bathrooms: 3,
      parking: 3,
      reference: 'SIN-MOR-001',
      imageUrls: '[]',
    },
  });

  const prop3 = await prisma.property.create({
    data: {
      title: 'T2 Apartamento Lisboa Centro',
      description: 'Apartamento T2 totalmente remodelado no coração de Lisboa. Próximo do metro e comércio local.',
      type: 'APARTMENT',
      status: 'RESERVED',
      price: 320000,
      address: 'Rua Augusta, 78, 1100-053 Lisboa',
      area: 75,
      bedrooms: 2,
      bathrooms: 1,
      parking: 0,
      reference: 'LIS-APT-002',
      imageUrls: '[]',
    },
  });

  const prop4 = await prisma.property.create({
    data: {
      title: 'Moradia V3 Oeiras',
      description: 'Moradia V3 em banda em Oeiras, a 5 minutos da linha de Cascais. Terraço, jardim privativo e garagem.',
      type: 'HOUSE',
      status: 'AVAILABLE',
      price: 520000,
      address: 'Rua dos Navegadores, 33, 2780-222 Oeiras',
      area: 190,
      bedrooms: 3,
      bathrooms: 2,
      parking: 1,
      reference: 'OEI-MOR-001',
      imageUrls: '[]',
    },
  });

  const prop5 = await prisma.property.create({
    data: {
      title: 'Loja Comercial Cascais',
      description: 'Espaço comercial em zona de grande afluência no centro de Cascais. Ideal para restauração ou comércio.',
      type: 'COMMERCIAL',
      status: 'AVAILABLE',
      price: 280000,
      address: 'Largo da Misericórdia, 5, 2750-099 Cascais',
      area: 95,
      bedrooms: 0,
      bathrooms: 1,
      parking: 0,
      reference: 'CAS-COM-001',
      imageUrls: '[]',
    },
  });

  const prop6 = await prisma.property.create({
    data: {
      title: 'T1 Apartamento Almada',
      description: 'Apartamento T1 moderno em Almada com vista para o rio Tejo. Vendido.',
      type: 'APARTMENT',
      status: 'SOLD',
      price: 185000,
      address: 'Rua do Alentejo, 9, 2800-001 Almada',
      area: 48,
      bedrooms: 1,
      bathrooms: 1,
      parking: 0,
      reference: 'ALM-APT-001',
      imageUrls: '[]',
    },
  });

  console.log(`✅ Created ${6} properties`);

  // ─── CONTACTS ────────────────────────────────────────────────────────────────
  // 4 assigned to ana
  const contact1 = await prisma.contact.create({
    data: {
      name: 'Maria Fernanda Oliveira',
      email: 'maria.oliveira@email.pt',
      phone: '+351961111001',
      whatsapp: '+351961111001',
      type: 'LEAD',
      status: 'NEW',
      source: 'Portal Imobiliário',
      notes: 'Procura apartamento T2 ou T3 na zona de Lisboa. Orçamento até 350k.',
      assignedToId: ana.id,
    },
  });

  const contact2 = await prisma.contact.create({
    data: {
      name: 'António Rodrigues',
      email: 'antonio.rodrigues@gmail.com',
      phone: '+351961111002',
      whatsapp: '+351961111002',
      type: 'CLIENT',
      status: 'QUALIFIED',
      source: 'Indicação',
      notes: 'Cliente antigo. Comprou T2 em 2022. Agora procura moradia para família.',
      assignedToId: ana.id,
    },
  });

  const contact3 = await prisma.contact.create({
    data: {
      name: 'Sofia Carvalho',
      email: 'sofia.carvalho@hotmail.com',
      phone: '+351961111003',
      type: 'LEAD',
      status: 'CONTACTED',
      source: 'Redes Sociais',
      notes: 'Jovem profissional. Primeiro imóvel. Procura T1 ou T2 em Lisboa ou Almada.',
      assignedToId: ana.id,
    },
  });

  const contact4 = await prisma.contact.create({
    data: {
      name: 'Manuel Teixeira',
      email: 'manuel.teixeira@empresa.pt',
      phone: '+351961111004',
      whatsapp: '+351961111004',
      type: 'CLIENT',
      status: 'QUALIFIED',
      source: 'Walk-in',
      notes: 'Empresário. Procura espaço comercial em Cascais ou Sintra.',
      assignedToId: ana.id,
    },
  });

  // 4 assigned to pedro
  const contact5 = await prisma.contact.create({
    data: {
      name: 'Catarina Mendes',
      email: 'catarina.mendes@sapo.pt',
      phone: '+351962222001',
      whatsapp: '+351962222001',
      type: 'LEAD',
      status: 'NEW',
      source: 'Portal Imobiliário',
      notes: 'Família com 2 filhos. Procura moradia em Sintra ou Oeiras. Orçamento 600-700k.',
      assignedToId: pedro.id,
    },
  });

  const contact6 = await prisma.contact.create({
    data: {
      name: 'Rui Pereira',
      email: 'rui.pereira@gmail.com',
      phone: '+351962222002',
      type: 'LEAD',
      status: 'QUALIFIED',
      source: 'Email',
      notes: 'Investidor imobiliário. Interessa-se por apartamentos para arrendamento.',
      assignedToId: pedro.id,
    },
  });

  const contact7 = await prisma.contact.create({
    data: {
      name: 'Isabel Gonçalves',
      email: 'isabel.goncalves@outlook.pt',
      phone: '+351962222003',
      whatsapp: '+351962222003',
      type: 'CLIENT',
      status: 'QUALIFIED',
      source: 'Indicação',
      notes: 'Reformada. Procura apartamento T2 perto de serviços. Zona Cascais ou Oeiras.',
      assignedToId: pedro.id,
    },
  });

  const contact8 = await prisma.contact.create({
    data: {
      name: 'Nuno Ferreira',
      email: 'nuno.ferreira@empresa.com',
      phone: '+351962222004',
      type: 'LEAD',
      status: 'CONTACTED',
      source: 'Redes Sociais',
      notes: 'Casal jovem. Primeira casa. Budget aproximado 300k.',
      assignedToId: pedro.id,
    },
  });

  // 2 assigned to joao
  const contact9 = await prisma.contact.create({
    data: {
      name: 'Luísa Monteiro',
      email: 'luisa.monteiro@gmail.com',
      phone: '+351963333001',
      whatsapp: '+351963333001',
      type: 'CLIENT',
      status: 'QUALIFIED',
      source: 'Portal Imobiliário',
      notes: 'Cliente VIP. Procura imóvel de luxo na região de Cascais. Budget >500k.',
      assignedToId: joao.id,
    },
  });

  const contact10 = await prisma.contact.create({
    data: {
      name: 'Diogo Azevedo',
      email: 'diogo.azevedo@sapo.pt',
      phone: '+351963333002',
      type: 'LEAD',
      status: 'NEW',
      source: 'Walk-in',
      notes: 'Interessado em moradia ou terreno para construção em Sintra.',
      assignedToId: joao.id,
    },
  });

  console.log(`✅ Created ${10} contacts`);

  // ─── OPPORTUNITIES ────────────────────────────────────────────────────────────
  // Spread across all 7 stages
  const opp1 = await prisma.opportunity.create({
    data: {
      title: 'Maria Oliveira - T3 Cascais',
      stage: 'LEAD_IN',
      value: 450000,
      expectedCloseDate: new Date('2026-05-30'),
      notes: 'Primeira abordagem. Enviado brochura por email.',
      position: 0,
      contactId: contact1.id,
      propertyId: prop1.id,
      assignedToId: ana.id,
    },
  });

  const opp2 = await prisma.opportunity.create({
    data: {
      title: 'António Rodrigues - Moradia Sintra',
      stage: 'QUALIFYING',
      value: 680000,
      expectedCloseDate: new Date('2026-06-15'),
      notes: 'Reunião de qualificação agendada. Confirmar capacidade financeira.',
      position: 0,
      contactId: contact2.id,
      propertyId: prop2.id,
      assignedToId: ana.id,
    },
  });

  const opp3 = await prisma.opportunity.create({
    data: {
      title: 'Sofia Carvalho - T1 Almada',
      stage: 'VISIT_SCHEDULED',
      value: 185000,
      expectedCloseDate: new Date('2026-04-20'),
      notes: 'Visita agendada para sábado pelas 10h.',
      position: 0,
      contactId: contact3.id,
      propertyId: prop6.id,
      assignedToId: ana.id,
    },
  });

  const opp4 = await prisma.opportunity.create({
    data: {
      title: 'Manuel Teixeira - Loja Cascais',
      stage: 'PROPOSAL_SENT',
      value: 280000,
      expectedCloseDate: new Date('2026-04-30'),
      notes: 'Proposta enviada a 15 de março. Aguarda resposta.',
      position: 0,
      contactId: contact4.id,
      propertyId: prop5.id,
      assignedToId: ana.id,
    },
  });

  const opp5 = await prisma.opportunity.create({
    data: {
      title: 'Catarina Mendes - Moradia Sintra',
      stage: 'NEGOTIATION',
      value: 650000,
      expectedCloseDate: new Date('2026-04-10'),
      notes: 'Em negociação. Cliente quer redução de 30k. Avaliar com vendedor.',
      position: 0,
      contactId: contact5.id,
      propertyId: prop2.id,
      assignedToId: pedro.id,
    },
  });

  const opp6 = await prisma.opportunity.create({
    data: {
      title: 'Isabel Gonçalves - T3 Cascais',
      stage: 'CLOSED_WON',
      value: 440000,
      expectedCloseDate: new Date('2026-03-10'),
      notes: 'Negócio fechado com sucesso! Escritura marcada para 10 de março.',
      position: 0,
      contactId: contact7.id,
      propertyId: prop1.id,
      assignedToId: pedro.id,
    },
  });

  const opp7 = await prisma.opportunity.create({
    data: {
      title: 'Rui Pereira - T2 Lisboa',
      stage: 'CLOSED_LOST',
      value: 320000,
      expectedCloseDate: new Date('2026-02-28'),
      lostReason: 'Cliente optou por imóvel de outra agência com preço inferior.',
      notes: 'Manter contacto para futuras oportunidades.',
      position: 0,
      contactId: contact6.id,
      propertyId: prop3.id,
      assignedToId: pedro.id,
    },
  });

  const opp8 = await prisma.opportunity.create({
    data: {
      title: 'Luísa Monteiro - Moradia Oeiras',
      stage: 'QUALIFYING',
      value: 520000,
      expectedCloseDate: new Date('2026-07-01'),
      notes: 'Cliente VIP. Processo de qualificação em curso.',
      position: 1,
      contactId: contact9.id,
      propertyId: prop4.id,
      assignedToId: joao.id,
    },
  });

  console.log(`✅ Created ${8} opportunities`);

  // ─── INTERACTIONS ─────────────────────────────────────────────────────────────
  await prisma.interaction.create({
    data: {
      type: 'EMAIL',
      subject: 'Apresentação - T3 Cascais',
      body: 'Boa tarde Maria, conforme combinado envio em anexo a brochura do apartamento T3 em Cascais. Estou à sua disposição para qualquer questão.',
      direction: 'OUTBOUND',
      contactId: contact1.id,
      opportunityId: opp1.id,
      createdById: ana.id,
    },
  });

  await prisma.interaction.create({
    data: {
      type: 'CALL',
      subject: 'Primeiro contacto telefónico',
      body: 'Contactei a Maria pelo telefone. Mostrou interesse no T3 de Cascais. Combinámos visita para próxima semana.',
      direction: 'OUTBOUND',
      contactId: contact1.id,
      opportunityId: opp1.id,
      createdById: ana.id,
    },
  });

  await prisma.interaction.create({
    data: {
      type: 'MEETING',
      subject: 'Reunião de qualificação - António Rodrigues',
      body: 'Reunião realizada no escritório. O António confirmou capacidade financeira através de crédito pré-aprovado de 700k. Muito motivado para a compra.',
      direction: 'INBOUND',
      contactId: contact2.id,
      opportunityId: opp2.id,
      createdById: ana.id,
    },
  });

  await prisma.interaction.create({
    data: {
      type: 'WHATSAPP',
      subject: 'Confirmação de visita',
      body: 'Olá Sofia! A confirmar a visita ao T1 em Almada para sábado às 10h. Qualquer questão estou disponível. Até sábado!',
      direction: 'OUTBOUND',
      contactId: contact3.id,
      opportunityId: opp3.id,
      createdById: ana.id,
    },
  });

  await prisma.interaction.create({
    data: {
      type: 'EMAIL',
      subject: 'Proposta Comercial - Loja Cascais',
      body: 'Exmo. Sr. Manuel Teixeira, em anexo a proposta comercial para a Loja Comercial em Cascais. A proposta inclui condições especiais de pagamento.',
      direction: 'OUTBOUND',
      contactId: contact4.id,
      opportunityId: opp4.id,
      createdById: ana.id,
    },
  });

  await prisma.interaction.create({
    data: {
      type: 'CALL',
      subject: 'Negociação - Catarina Mendes',
      body: 'Conversa telefónica sobre a moradia em Sintra. A Catarina pediu redução de 30.000€. Vou contactar o vendedor para verificar margem.',
      direction: 'INBOUND',
      contactId: contact5.id,
      opportunityId: opp5.id,
      createdById: pedro.id,
    },
  });

  await prisma.interaction.create({
    data: {
      type: 'WHATSAPP',
      subject: 'Parabéns pela aquisição!',
      body: 'Parabéns Isabel! 🎉 Foi um prazer enorme trabalhar consigo nesta aquisição. O T3 de Cascais vai ser uma excelente escolha para si.',
      direction: 'OUTBOUND',
      contactId: contact7.id,
      opportunityId: opp6.id,
      createdById: pedro.id,
    },
  });

  await prisma.interaction.create({
    data: {
      type: 'NOTE',
      subject: 'Nota interna',
      body: 'O Rui confirmou que fechou negócio com outra agência. Mantive relação amigável. Prometeu indicar-me outros contactos.',
      direction: 'OUTBOUND',
      contactId: contact6.id,
      opportunityId: opp7.id,
      createdById: pedro.id,
    },
  });

  await prisma.interaction.create({
    data: {
      type: 'MEETING',
      subject: 'Reunião VIP - Luísa Monteiro',
      body: 'Reunião presencial com a Luísa. Apresentadas 3 opções de moradias. Maior interesse na moradia de Oeiras. Agendaremos visita.',
      direction: 'INBOUND',
      contactId: contact9.id,
      opportunityId: opp8.id,
      createdById: joao.id,
    },
  });

  await prisma.interaction.create({
    data: {
      type: 'EMAIL',
      subject: 'Bem-vindo ao nosso CRM',
      body: 'Olá Diogo, obrigado pela visita à nossa agência. Conforme conversámos, estamos a preparar uma seleção de terrenos e moradias em Sintra. Entraremos em contacto brevemente.',
      direction: 'OUTBOUND',
      contactId: contact10.id,
      createdById: joao.id,
    },
  });

  await prisma.interaction.create({
    data: {
      type: 'CALL',
      subject: 'Follow-up Nuno Ferreira',
      body: 'Ligei ao Nuno para follow-up. Ainda a avaliar opções. Vai falar com o banco sobre pré-aprovação de crédito.',
      direction: 'OUTBOUND',
      contactId: contact8.id,
      createdById: pedro.id,
    },
  });

  await prisma.interaction.create({
    data: {
      type: 'WHATSAPP',
      subject: 'Novos imóveis disponíveis',
      body: 'Olá Rui! Acabaram de entrar em carteira 2 apartamentos T2 em Lisboa com excelente rendimento de arrendamento. Posso enviar informação?',
      direction: 'OUTBOUND',
      contactId: contact6.id,
      createdById: pedro.id,
    },
  });

  await prisma.interaction.create({
    data: {
      type: 'NOTE',
      subject: 'Preferências do cliente',
      body: 'António prefere moradia com garagem para pelo menos 2 carros e jardim. Não quer apartamento. Budget confirmado 700k.',
      direction: 'OUTBOUND',
      contactId: contact2.id,
      opportunityId: opp2.id,
      createdById: ana.id,
    },
  });

  await prisma.interaction.create({
    data: {
      type: 'CALL',
      subject: 'Qualificação inicial - Isabel',
      body: 'Chamada inicial com a Isabel. Reformada, procura apartamento T2 perto de farmácia e centro de saúde. Zona Cascais de preferência.',
      direction: 'INBOUND',
      contactId: contact7.id,
      createdById: pedro.id,
    },
  });

  await prisma.interaction.create({
    data: {
      type: 'EMAIL',
      subject: 'Documentação solicitada',
      body: 'Exma. Sra. Catarina Mendes, conforme combinado, solicito o envio dos seguintes documentos para avançar com a proposta: BI/CC, comprovativo de rendimentos dos últimos 3 meses e declaração de IRS.',
      direction: 'OUTBOUND',
      contactId: contact5.id,
      opportunityId: opp5.id,
      createdById: pedro.id,
    },
  });

  console.log(`✅ Created ${15} interactions`);

  // ─── TASKS ───────────────────────────────────────────────────────────────────
  const now = new Date();

  await prisma.task.create({
    data: {
      title: 'Agendar visita ao T3 Cascais com Maria Oliveira',
      description: 'Contactar a Maria para agendar visita ao apartamento T3 em Cascais. Disponibilidade: fins de semana.',
      status: 'PENDING',
      priority: 'HIGH',
      dueDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      contactId: contact1.id,
      opportunityId: opp1.id,
      assignedToId: ana.id,
    },
  });

  await prisma.task.create({
    data: {
      title: 'Verificar pré-aprovação crédito - António Rodrigues',
      description: 'Solicitar documentação bancária que confirme pré-aprovação de crédito para moradia em Sintra.',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      dueDate: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000), // tomorrow
      contactId: contact2.id,
      opportunityId: opp2.id,
      assignedToId: ana.id,
    },
  });

  await prisma.task.create({
    data: {
      title: 'Visita ao T1 Almada - Sofia Carvalho',
      description: 'Acompanhar Sofia na visita ao T1 em Almada. Levar dossier completo do imóvel.',
      status: 'PENDING',
      priority: 'HIGH',
      dueDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 days
      contactId: contact3.id,
      opportunityId: opp3.id,
      assignedToId: ana.id,
    },
  });

  await prisma.task.create({
    data: {
      title: 'Follow-up proposta comercial - Manuel Teixeira',
      description: 'Contactar o Manuel para saber se analisou a proposta. Clarificar condições de pagamento se necessário.',
      status: 'PENDING',
      priority: 'MEDIUM',
      dueDate: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // yesterday (overdue)
      contactId: contact4.id,
      opportunityId: opp4.id,
      assignedToId: ana.id,
    },
  });

  await prisma.task.create({
    data: {
      title: 'Contactar vendedor sobre redução - Moradia Sintra',
      description: 'Negociar com o proprietário da moradia em Sintra a redução de 30.000€ pedida pela Catarina.',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      dueDate: new Date(now.getTime() + 0.5 * 24 * 60 * 60 * 1000), // today
      contactId: contact5.id,
      opportunityId: opp5.id,
      assignedToId: pedro.id,
    },
  });

  await prisma.task.create({
    data: {
      title: 'Preparar documentação escritura - Isabel Gonçalves',
      description: 'Organizar toda a documentação necessária para a escritura do T3 Cascais. Verificar certidões e caderneta predial.',
      status: 'COMPLETED',
      priority: 'HIGH',
      dueDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      completedAt: new Date(now.getTime() - 11 * 24 * 60 * 60 * 1000),
      contactId: contact7.id,
      opportunityId: opp6.id,
      assignedToId: pedro.id,
    },
  });

  await prisma.task.create({
    data: {
      title: 'Enviar novas opções ao Rui Pereira',
      description: 'Preparar lista de apartamentos T2 em Lisboa adequados para investimento e arrendamento.',
      status: 'PENDING',
      priority: 'LOW',
      dueDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 1 week
      contactId: contact6.id,
      assignedToId: pedro.id,
    },
  });

  await prisma.task.create({
    data: {
      title: 'Agendar visita moradia Oeiras - Luísa Monteiro',
      description: 'Marcar visita à moradia V3 em Oeiras para a Luísa. Coordenar com proprietário.',
      status: 'PENDING',
      priority: 'HIGH',
      dueDate: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000), // 4 days
      contactId: contact9.id,
      opportunityId: opp8.id,
      assignedToId: joao.id,
    },
  });

  await prisma.task.create({
    data: {
      title: 'Reunião equipa - revisão pipeline mensal',
      description: 'Reunião semanal com Ana e Pedro para revisão do pipeline e definição de prioridades.',
      status: 'COMPLETED',
      priority: 'MEDIUM',
      dueDate: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      completedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      assignedToId: joao.id,
    },
  });

  await prisma.task.create({
    data: {
      title: 'Actualizar fotos imóvel - Moradia Oeiras',
      description: 'Agendar sessão fotográfica profissional para a moradia V3 em Oeiras. Imagens actuais estão desactualizadas.',
      status: 'PENDING',
      priority: 'LOW',
      dueDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000), // 2 weeks
      assignedToId: admin.id,
    },
  });

  console.log(`✅ Created ${10} tasks`);

  // ─── AUTOMATION RULES ────────────────────────────────────────────────────────
  await prisma.automationRule.deleteMany();

  const automationRules = [
    {
      name: 'Speed to Lead — WhatsApp imediato',
      trigger: 'NEW_LEAD',
      isActive: true,
      actions: JSON.stringify([
        {
          type: 'SEND_WHATSAPP',
          delay: 0,
          message:
            'Olá {{nome}}! 👋 Sou {{consultor}}, consultor imobiliário. Vi o seu interesse e estou aqui para ajudar a encontrar o imóvel ideal para si. Que tipo de imóvel procura?',
        },
        {
          type: 'CREATE_TASK',
          delay: 60,
          message: 'Ligar para novo lead: {{nome}} — seguimento Speed to Lead',
        },
      ]),
    },
    {
      name: 'Missed Call — SMS automático',
      trigger: 'MISSED_CALL',
      isActive: true,
      actions: JSON.stringify([
        {
          type: 'SEND_SMS',
          delay: 0,
          message:
            'Olá {{nome}}! Sou {{consultor}}. Vi que me ligou mas não consegui atender. Deixe-me saber o que procura e responderei brevemente! 🏠',
        },
      ]),
    },
    {
      name: 'Visita Confirmada — WhatsApp de confirmação',
      trigger: 'VISIT_SCHEDULED',
      isActive: true,
      actions: JSON.stringify([
        {
          type: 'SEND_WHATSAPP',
          delay: 0,
          message:
            'Olá {{nome}}! ✅ A sua visita está confirmada. Estarei à sua espera no local acordado. Caso precise de alterar, contacte-me! Até breve! 🏡',
        },
      ]),
    },
    {
      name: 'Lead Qualificado — Email de apresentação',
      trigger: 'LEAD_QUALIFIED',
      isActive: true,
      actions: JSON.stringify([
        {
          type: 'SEND_EMAIL',
          delay: 30,
          subject: 'Imóveis selecionados para si — {{data}}',
          message:
            'Olá {{nome}},\n\nCom base no nosso contacto, selecionei alguns imóveis que correspondem perfeitamente ao seu perfil.\n\nEntrarei em contacto brevemente para agendar visitas.\n\nCom os melhores cumprimentos,\n{{consultor}}',
        },
      ]),
    },
    {
      name: 'Proposta Enviada — Follow-up 48h',
      trigger: 'PROPOSAL_SENT',
      isActive: true,
      actions: JSON.stringify([
        {
          type: 'CREATE_TASK',
          delay: 2880,
          message: 'Follow-up proposta enviada para {{nome}} — confirmar interesse',
        },
        {
          type: 'SEND_WHATSAPP',
          delay: 2880,
          message:
            'Olá {{nome}}! 😊 Queria saber se teve oportunidade de analisar a proposta. Estou disponível para esclarecer qualquer dúvida!',
        },
      ]),
    },
  ];

  for (const rule of automationRules) {
    await prisma.automationRule.create({ data: rule });
  }

  console.log(`✅ Created ${automationRules.length} automation rules`);

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📋 Login credentials:');
  console.log('   admin@crm.pt     | Admin123! | ADMIN');
  console.log('   joao@crm.pt      | Pass123!  | PRINCIPAL_CONSULTANT');
  console.log('   ana@crm.pt       | Pass123!  | SUB_AGENT');
  console.log('   pedro@crm.pt     | Pass123!  | SUB_AGENT');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
