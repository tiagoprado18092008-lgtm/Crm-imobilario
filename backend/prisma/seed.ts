import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('A iniciar seed...');

  // PROTEÇÃO: não apagar dados se já existirem utilizadores reais (não demo)
  const existingUsers = await prisma.user.count();
  if (existingUsers > 0 && process.env.FORCE_SEED !== 'true') {
    console.log(`Seed cancelado: já existem ${existingUsers} utilizador(es) na base de dados.`);
    console.log('Para forçar o seed e apagar tudo, usa: FORCE_SEED=true npm run db:seed');
    return;
  }

  // Limpar dados existentes
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
  await prisma.property.deleteMany();
  await prisma.invitation.deleteMany();
  await prisma.phoneNumber.deleteMany();
  await prisma.automationRule.deleteMany();
  await prisma.user.deleteMany();
  await prisma.locationSettings.deleteMany();
  await prisma.agencySettings.deleteMany();
  await prisma.location.deleteMany();
  await prisma.agency.deleteMany();

  console.log('Dados anteriores removidos');

  // ─── AGÊNCIA + LOCATION ───────────────────────────────────────────────────────
  const agency = await prisma.agency.upsert({
    where: { slug: 'imocrm-demo' },
    update: {},
    create: { name: 'ImoCRM Demo', slug: 'imocrm-demo', isActive: true },
  });

  const defaultLocation = await prisma.location.upsert({
    where: { agencyId_slug: { agencyId: agency.id, slug: 'principal' } },
    update: {},
    create: {
      agencyId: agency.id,
      name: 'Escritório Principal',
      slug: 'principal',
      email: 'geral@imocrm.pt',
      isActive: true,
    },
  });

  await prisma.locationSettings.upsert({
    where: { locationId: defaultLocation.id },
    update: {},
    create: {
      locationId: defaultLocation.id,
      timezone: 'Europe/Lisbon', locale: 'pt-PT', currency: 'EUR',
      workingHours: {
        mon: { active: true, start: '09:00', end: '18:00' },
        tue: { active: true, start: '09:00', end: '18:00' },
        wed: { active: true, start: '09:00', end: '18:00' },
        thu: { active: true, start: '09:00', end: '18:00' },
        fri: { active: true, start: '09:00', end: '18:00' },
        sat: { active: false, start: '09:00', end: '13:00' },
        sun: { active: false, start: '09:00', end: '13:00' },
      },
      bookingPage: { enabled: false, slug: 'principal' },
    },
  });

  await prisma.agencySettings.upsert({
    where: { agencyId: agency.id },
    update: {},
    create: {
      agencyId: agency.id,
      whitelabelEnabled: false,
      primaryColor: '#0f2553',
      defaultPermissions: {
        contacts: ['view', 'create', 'edit'],
        opportunities: ['view', 'create', 'edit'],
        properties: ['view'],
        tasks: ['view', 'create', 'edit'],
        appointments: ['view', 'create', 'edit'],
        conversations: ['view', 'create'],
        campaigns: ['view'], forms: ['view'],
        automations: [], reports: [], settings: [], users: [],
      },
      securitySettings: { sessionDuration: '8h', require2FA: false },
    },
  });

  console.log('✓ Agência, Escritório Principal e definições criados');

  // ─── UTILIZADORES ─────────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash('admin123', 12);
  const userHash = await bcrypt.hash('admin123', 12);

  const admin = await prisma.user.create({
    data: {
      name: 'Carlos Administrador',
      email: 'admin@crm.pt',
      passwordHash: adminHash,
      role: 'AGENCY_OWNER',
      phone: '+351910000001',
      agencyId: agency.id,
      locationId: defaultLocation.id,
      isActive: true,
      onboardingCompleted: true,
    },
  });

  const joao = await prisma.user.create({
    data: {
      name: 'João Silva',
      email: 'joao@crm.pt',
      passwordHash: userHash,
      role: 'TEAM_LEADER',
      phone: '+351910000002',
      agencyId: agency.id,
      locationId: defaultLocation.id,
      isActive: true,
      onboardingCompleted: true,
    },
  });

  const ana = await prisma.user.create({
    data: {
      name: 'Ana Costa',
      email: 'ana@crm.pt',
      passwordHash: userHash,
      role: 'CONSULTANT',
      phone: '+351910000003',
      supervisorId: joao.id,
      agencyId: agency.id,
      locationId: defaultLocation.id,
      isActive: true,
      onboardingCompleted: true,
    },
  });

  const pedro = await prisma.user.create({
    data: {
      name: 'Pedro Santos',
      email: 'pedro@crm.pt',
      passwordHash: userHash,
      role: 'CONSULTANT',
      phone: '+351910000004',
      supervisorId: joao.id,
      agencyId: agency.id,
      locationId: defaultLocation.id,
      isActive: true,
      onboardingCompleted: true,
    },
  });

  // Utilizadores de teste com novos roles
  await prisma.user.create({
    data: {
      name: 'Admin Escritório',
      email: 'location-admin@crm.pt',
      passwordHash: userHash,
      role: 'LOCATION_ADMIN',
      agencyId: agency.id,
      locationId: defaultLocation.id,
      isActive: true,
      onboardingCompleted: true,
    },
  });

  await prisma.user.create({
    data: {
      name: 'Consultor Limitado',
      email: 'user@crm.pt',
      passwordHash: userHash,
      role: 'USER',
      agencyId: agency.id,
      locationId: defaultLocation.id,
      isActive: true,
      onboardingCompleted: true,
      permissions: {
        contacts: ['view', 'create'],
        opportunities: ['view'],
        properties: ['view'],
        tasks: ['view', 'create'],
        appointments: ['view'],
        conversations: [], campaigns: [], forms: [],
        automations: [], reports: [], settings: [], users: [],
      },
    },
  });

  console.log('✓ 6 utilizadores criados');

  // ─── IMÓVEIS (20) ─────────────────────────────────────────────────────────────
  const properties = await Promise.all([
    prisma.property.create({ data: {
      title: 'T3 Apartamento Cascais Vista Mar',
      description: 'Magnífico apartamento T3 com vista mar panorâmica em Cascais. Totalmente remodelado em 2023. Cozinha equipada com ilha, dois lugares de garagem e arrecadação. Terraço privativo de 25m². Perto do centro e acessos à A5.',
      type: 'APARTMENT', purpose: 'SALE', status: 'AVAILABLE',
      price: 485000, address: 'Rua das Flores, 45, 2750-123 Cascais', district: 'Lisboa',
      lat: 38.6979, lng: -9.4209,
      area: 115, bedrooms: 3, bathrooms: 2, parking: 2,
      reference: 'CAS-APT-001', energyCertificate: 'B',
      yearBuilt: 2008, condition: 'EXCELLENT',
      features: JSON.stringify(['Piscina', 'Vista Mar', 'Garagem', 'Terraço', 'Cozinha Equipada', 'Ar Condicionado']),
      tags: JSON.stringify(['Vista Mar', 'Remodelado', 'Premium']),
      commission: 2.5, createdById: joao.id,
    }}),
    prisma.property.create({ data: {
      title: 'Moradia V4 Sintra com Piscina',
      description: 'Deslumbrante moradia V4 em zona residencial tranquila de Sintra. Jardim com piscina aquecida, garagem para 3 carros. Lareira na sala, escritório e suite principal com closet. Próximo das escolas internacionais.',
      type: 'HOUSE', purpose: 'SALE', status: 'AVAILABLE',
      price: 720000, address: 'Avenida da Serra, 12, 2710-456 Sintra', district: 'Lisboa',
      lat: 38.7997, lng: -9.3877,
      area: 310, bedrooms: 4, bathrooms: 3, parking: 3,
      reference: 'SIN-MOR-001', energyCertificate: 'C',
      yearBuilt: 2005, condition: 'EXCELLENT',
      features: JSON.stringify(['Piscina', 'Jardim', 'Lareira', 'Garagem', 'Escritório', 'Suite', 'Closet']),
      tags: JSON.stringify(['Piscina', 'Luxo', 'Sintra']),
      commission: 3.0, createdById: joao.id,
    }}),
    prisma.property.create({ data: {
      title: 'T2 Remodelado Lisboa Centro - Bairro Alto',
      description: 'Apartamento T2 totalmente remodelado no coração do Bairro Alto. Tetos altos, soalho de madeira original restaurado, kitchenette em open space. Edifício com elevador. Ideal para habitação própria ou investimento (turismo).',
      type: 'APARTMENT', purpose: 'SALE', status: 'RESERVED',
      price: 345000, address: 'Rua do Diário de Notícias, 78, 1200-146 Lisboa', district: 'Lisboa',
      lat: 38.7139, lng: -9.1439,
      area: 78, bedrooms: 2, bathrooms: 1, parking: 0,
      reference: 'LIS-APT-001', energyCertificate: 'D',
      yearBuilt: 1920, condition: 'EXCELLENT',
      features: JSON.stringify(['Elevador', 'Soalho Madeira', 'Tetos Altos', 'Open Space']),
      tags: JSON.stringify(['Investimento', 'AL', 'Centro Lisboa']),
      commission: 2.5, createdById: ana.id,
    }}),
    prisma.property.create({ data: {
      title: 'Moradia V3 Oeiras — Linha de Cascais',
      description: 'Moradia V3 em banda em Oeiras, a 5 minutos da linha de Cascais. Terraço de 40m², jardim privativo e garagem. Cozinha nova equipada. Pronto a habitar. Próximo do Taguspark e de centros comerciais.',
      type: 'HOUSE', purpose: 'SALE', status: 'AVAILABLE',
      price: 545000, address: 'Rua dos Navegadores, 33, 2780-222 Oeiras', district: 'Lisboa',
      lat: 38.6963, lng: -9.3129,
      area: 195, bedrooms: 3, bathrooms: 2, parking: 1,
      reference: 'OEI-MOR-001', energyCertificate: 'B',
      yearBuilt: 2010, condition: 'EXCELLENT',
      features: JSON.stringify(['Terraço', 'Jardim', 'Garagem', 'Cozinha Equipada']),
      tags: JSON.stringify(['Oeiras', 'Pronto a Habitar']),
      commission: 2.5, createdById: pedro.id,
    }}),
    prisma.property.create({ data: {
      title: 'T1 Estúdio Moderno — Parque das Nações',
      description: 'Estúdio T1 moderno e luminoso no Parque das Nações. Vistas para o rio Tejo. Condomínio fechado com piscina, ginásio e segurança 24h. Ideal para jovem profissional ou investimento de arrendamento.',
      type: 'APARTMENT', purpose: 'SALE', status: 'AVAILABLE',
      price: 198000, address: 'Avenida da Boa Esperança, 7, 1990-095 Lisboa', district: 'Lisboa',
      lat: 38.7643, lng: -9.0989,
      area: 45, bedrooms: 1, bathrooms: 1, parking: 1,
      reference: 'LIS-APT-002', energyCertificate: 'A',
      yearBuilt: 2015, condition: 'EXCELLENT',
      features: JSON.stringify(['Piscina', 'Ginásio', 'Segurança 24h', 'Vista Rio', 'Condomínio Fechado']),
      tags: JSON.stringify(['Parque das Nações', 'Investimento', 'Vista Rio']),
      commission: 3.0, createdById: ana.id,
    }}),
    prisma.property.create({ data: {
      title: 'Loja Comercial Premium — Centro Cascais',
      description: 'Espaço comercial em zona de grande afluência no centro histórico de Cascais. Montra dupla, wc, armazém traseiro. Ideal para restauração, clínica, ou comércio especializado. Arrendamento possível.',
      type: 'COMMERCIAL', purpose: 'SALE', status: 'AVAILABLE',
      price: 295000, address: 'Largo da Misericórdia, 5, 2750-099 Cascais', district: 'Lisboa',
      lat: 38.6966, lng: -9.4214,
      area: 98, bedrooms: 0, bathrooms: 1, parking: 0,
      reference: 'CAS-COM-001', energyCertificate: 'E',
      yearBuilt: 1985, condition: 'GOOD',
      features: JSON.stringify(['Montra Dupla', 'Armazém', 'Zona Pedonal']),
      tags: JSON.stringify(['Comercial', 'Centro', 'Cascais']),
      commission: 3.0, createdById: joao.id,
    }}),
    prisma.property.create({ data: {
      title: 'T4 Duplex Luxo — Restelo Lisboa',
      description: 'Excepcional apartamento T4 duplex no prestigiado bairro do Restelo. Dois pisos com 280m², sala de estar e jantar separadas, 4 suites, escritório, garagem dupla. Varandas orientadas a sul. Portaria 24h.',
      type: 'APARTMENT', purpose: 'SALE', status: 'AVAILABLE',
      price: 1150000, address: 'Rua Duarte Pacheco Pereira, 15, 1400-138 Lisboa', district: 'Lisboa',
      lat: 38.7072, lng: -9.1943,
      area: 280, bedrooms: 4, bathrooms: 4, parking: 2,
      reference: 'LIS-APT-003', energyCertificate: 'B',
      yearBuilt: 2018, condition: 'EXCELLENT',
      features: JSON.stringify(['Suite', 'Portaria 24h', 'Garagem Dupla', 'Varanda', 'Escritório', 'Duplex']),
      tags: JSON.stringify(['Luxo', 'Restelo', 'Duplex', 'Premium']),
      commission: 2.5, createdById: joao.id,
    }}),
    prisma.property.create({ data: {
      title: 'Terreno Urbano — Sintra 800m²',
      description: 'Terreno urbano com 800m² em zona residencial de Sintra. Projeto aprovado para construção de moradia V4 com piscina. Documentação completa e atualizada. Vistas para a Serra de Sintra.',
      type: 'LAND', purpose: 'SALE', status: 'AVAILABLE',
      price: 185000, address: 'Estrada das Murtas, s/n, 2710-651 Sintra', district: 'Lisboa',
      lat: 38.8045, lng: -9.3768,
      area: 800, bedrooms: 0, bathrooms: 0, parking: 0,
      reference: 'SIN-TER-001', energyCertificate: undefined,
      yearBuilt: undefined, condition: 'NEW',
      features: JSON.stringify(['Projeto Aprovado', 'Vista Serra', 'Documentação Completa']),
      tags: JSON.stringify(['Terreno', 'Construção', 'Sintra']),
      commission: 3.0, createdById: pedro.id,
    }}),
    prisma.property.create({ data: {
      title: 'T2 Arrendamento — Almada Pragal',
      description: 'Apartamento T2 pronto para arrendar no Pragal, Almada. Vista para o rio Tejo e Ponte 25 de Abril. Completamente mobilado e equipado. Ligação rápida ao centro de Lisboa pelo Cacilheiro.',
      type: 'APARTMENT', purpose: 'RENT', status: 'AVAILABLE',
      price: 1100, address: 'Rua do Alentejo, 9, 2800-001 Almada', district: 'Setúbal',
      lat: 38.6808, lng: -9.1579,
      area: 72, bedrooms: 2, bathrooms: 1, parking: 0,
      reference: 'ALM-APT-001', energyCertificate: 'C',
      yearBuilt: 2002, condition: 'GOOD',
      features: JSON.stringify(['Mobilado', 'Equipado', 'Vista Rio', 'Aquecimento Central']),
      tags: JSON.stringify(['Arrendamento', 'Mobilado', 'Vista Rio']),
      commission: 1.0, createdById: ana.id,
    }}),
    prisma.property.create({ data: {
      title: 'Quinta com Vinha — Palmela 5ha',
      description: 'Magnífica quinta com 5 hectares em Palmela, na região do Vinho de Setúbal. Casa principal T5 totalmente restaurada, 2 anexos, piscina, lagar e vinha. Potencial turismo rural ou exploração agrícola.',
      type: 'FARM', purpose: 'SALE', status: 'AVAILABLE',
      price: 895000, address: 'Estrada Nacional 252, km 12, 2950-000 Palmela', district: 'Setúbal',
      lat: 38.5692, lng: -8.9022,
      area: 50000, bedrooms: 5, bathrooms: 3, parking: 5,
      reference: 'PAL-QUI-001', energyCertificate: 'F',
      yearBuilt: 1950, condition: 'EXCELLENT',
      features: JSON.stringify(['Piscina', 'Vinha', 'Lagar', 'Anexos', 'Turismo Rural']),
      tags: JSON.stringify(['Quinta', 'Vinha', 'Turismo Rural', 'Palmela']),
      commission: 3.0, createdById: joao.id,
    }}),
    prisma.property.create({ data: {
      title: 'T3 Novo — Amadora Venteira',
      description: 'Apartamento T3 novo nunca habitado na Venteira, Amadora. Empreendimento moderno com acabamentos de qualidade. Garagem, arrecadação, condomínio com jardins. Próximo do Hospital Prof. Doutor Fernando Fonseca.',
      type: 'APARTMENT', purpose: 'SALE', status: 'AVAILABLE',
      price: 265000, address: 'Rua da República, 120, 2700-391 Amadora', district: 'Lisboa',
      lat: 38.7521, lng: -9.2302,
      area: 105, bedrooms: 3, bathrooms: 2, parking: 1,
      reference: 'AMA-APT-001', energyCertificate: 'A+',
      yearBuilt: 2024, condition: 'NEW',
      features: JSON.stringify(['Novo', 'Garagem', 'Arrecadação', 'Condomínio', 'Jardins']),
      tags: JSON.stringify(['Novo', 'Amadora', 'Oportunidade']),
      commission: 2.5, createdById: pedro.id,
    }}),
    prisma.property.create({ data: {
      title: 'T4 Moradia Geminada — Setúbal',
      description: 'Moradia geminada T4 em Setúbal, zona residencial tranquila. Jardim frontal e tardoz, garagem, varandas em todos os quartos. Excelente estado de conservação.',
      type: 'HOUSE', purpose: 'SALE', status: 'AVAILABLE',
      price: 320000, address: 'Rua dos Girassóis, 44, 2900-111 Setúbal', district: 'Setúbal',
      lat: 38.5239, lng: -8.8915,
      area: 175, bedrooms: 4, bathrooms: 2, parking: 1,
      reference: 'SET-MOR-001', energyCertificate: 'C',
      yearBuilt: 1998, condition: 'GOOD',
      features: JSON.stringify(['Jardim', 'Garagem', 'Varandas', 'Geminada']),
      tags: JSON.stringify(['Setúbal', 'Família']),
      commission: 3.0, createdById: pedro.id,
    }}),
    prisma.property.create({ data: {
      title: 'T2 Alto dos Moinhos — Lisboa',
      description: 'Excelente T2 no Alto dos Moinhos, Lisboa. Zona premium, junto ao metro. Apartamento luminoso, arrecadação, garagem e portaria. Condomínio bem cuidado.',
      type: 'APARTMENT', purpose: 'SALE', status: 'SOLD',
      price: 390000, address: 'Rua Prof. Reinaldo dos Santos, 8, 1500-490 Lisboa', district: 'Lisboa',
      lat: 38.7298, lng: -9.1751,
      area: 80, bedrooms: 2, bathrooms: 1, parking: 1,
      reference: 'LIS-APT-004', energyCertificate: 'C',
      yearBuilt: 1995, condition: 'GOOD',
      features: JSON.stringify(['Metro', 'Garagem', 'Arrecadação', 'Portaria']),
      tags: JSON.stringify(['Alto dos Moinhos', 'Vendido']),
      commission: 2.5, createdById: ana.id,
    }}),
    prisma.property.create({ data: {
      title: 'Escritório Open Space — Marquês de Pombal',
      description: 'Espaço de escritório em open space no coração de Lisboa, junto ao Marquês de Pombal. Piso 8, vista cidade, receção partilhada, estacionamento disponível. Ideal para empresa ou advogados.',
      type: 'COMMERCIAL', purpose: 'RENT', status: 'AVAILABLE',
      price: 3500, address: 'Avenida da Liberdade, 200, 1250-001 Lisboa', district: 'Lisboa',
      lat: 38.7194, lng: -9.1477,
      area: 145, bedrooms: 0, bathrooms: 2, parking: 2,
      reference: 'LIS-ESC-001', energyCertificate: 'B',
      yearBuilt: 2000, condition: 'EXCELLENT',
      features: JSON.stringify(['Open Space', 'Vista Cidade', 'Recepção', 'AC Central', 'Estacionamento']),
      tags: JSON.stringify(['Escritório', 'Marquês de Pombal', 'Arrendamento']),
      commission: 1.0, createdById: joao.id,
    }}),
    prisma.property.create({ data: {
      title: 'T1 Chiado — Lisboa Histórica',
      description: 'Encantador T1 no Chiado, Lisboa. Edifício pombalino reabilitado. Tetos com estuque original, janelas de sacada, soalho flutuante. Aprovado para AL. Vista para a Igreja dos Mártires.',
      type: 'APARTMENT', purpose: 'SALE', status: 'AVAILABLE',
      price: 425000, address: 'Rua Garrett, 56, 1200-205 Lisboa', district: 'Lisboa',
      lat: 38.7095, lng: -9.1425,
      area: 55, bedrooms: 1, bathrooms: 1, parking: 0,
      reference: 'LIS-APT-005', energyCertificate: 'E',
      yearBuilt: 1755, condition: 'EXCELLENT',
      features: JSON.stringify(['Edifício Histórico', 'Tetos Estuque', 'Vista Igreja', 'AL Aprovado']),
      tags: JSON.stringify(['Chiado', 'Histórico', 'AL', 'Investimento']),
      commission: 2.5, createdById: ana.id,
    }}),
    prisma.property.create({ data: {
      title: 'Armazém Industrial — Palmela 800m²',
      description: 'Armazém industrial com 800m² em Palmela, zona industrial. Pé-direito 7m, 2 portões de acesso, escritório 50m², WC, 3 vagas de estacionamento. Ideal para logística ou produção.',
      type: 'WAREHOUSE', purpose: 'RENT', status: 'AVAILABLE',
      price: 2800, address: 'Rua Industrial do Pinhal Novo, 15, 2955-000 Palmela', district: 'Setúbal',
      lat: 38.6371, lng: -8.9062,
      area: 800, bedrooms: 0, bathrooms: 1, parking: 3,
      reference: 'PAL-ARM-001', energyCertificate: 'G',
      yearBuilt: 1992, condition: 'GOOD',
      features: JSON.stringify(['Portão Industrial', 'Pé-Direito 7m', 'Escritório', 'Logística']),
      tags: JSON.stringify(['Industrial', 'Armazém', 'Palmela']),
      commission: 1.5, createdById: pedro.id,
    }}),
    prisma.property.create({ data: {
      title: 'Garagem Box — Cascais Centro',
      description: 'Box de garagem individual em Cascais, com acesso direto do exterior. Espaço para 1 viatura grande + mota. Boa altura. Portão automático. Perto do centro e do mercado.',
      type: 'GARAGE', purpose: 'SALE', status: 'AVAILABLE',
      price: 35000, address: 'Rua Afonso Sanches, 10, 2750-015 Cascais', district: 'Lisboa',
      lat: 38.6977, lng: -9.4198,
      area: 22, bedrooms: 0, bathrooms: 0, parking: 1,
      reference: 'CAS-GAR-001', energyCertificate: undefined,
      yearBuilt: 1990, condition: 'GOOD',
      features: JSON.stringify(['Portão Automático', 'Box Individual']),
      tags: JSON.stringify(['Garagem', 'Cascais']),
      commission: 5.0, createdById: ana.id,
    }}),
    prisma.property.create({ data: {
      title: 'T3 Oeiras — Próximo da Praia',
      description: 'Apartamento T3 em Oeiras a 5 minutos a pé da Praia de Santo Amaro. Varanda com vista mar parcial. Garagem dupla, arrecadação. Edifício com piscina e campo de ténis. Condomínio com portaria.',
      type: 'APARTMENT', purpose: 'SALE', status: 'AVAILABLE',
      price: 520000, address: 'Rua da Praia de Santo Amaro, 22, 2780-361 Oeiras', district: 'Lisboa',
      lat: 38.6921, lng: -9.3236,
      area: 120, bedrooms: 3, bathrooms: 2, parking: 2,
      reference: 'OEI-APT-001', energyCertificate: 'B',
      yearBuilt: 2001, condition: 'GOOD',
      features: JSON.stringify(['Piscina', 'Campo de Ténis', 'Portaria', 'Vista Mar', 'Garagem Dupla']),
      tags: JSON.stringify(['Oeiras', 'Praia', 'Condomínio']),
      commission: 2.5, createdById: joao.id,
    }}),
    prisma.property.create({ data: {
      title: 'T2+1 Setúbal — Zona Ribeirinha',
      description: 'Encantador T2+1 na zona ribeirinha de Setúbal. Apartamento reabilitado com vista para o rio Sado. Arrecadação, sem garagem. Próximo de restaurantes e transportes.',
      type: 'APARTMENT', purpose: 'SALE', status: 'AVAILABLE',
      price: 178000, address: 'Avenida Luísa Todi, 155, 2900-452 Setúbal', district: 'Setúbal',
      lat: 38.5236, lng: -8.8917,
      area: 88, bedrooms: 2, bathrooms: 1, parking: 0,
      reference: 'SET-APT-001', energyCertificate: 'D',
      yearBuilt: 1970, condition: 'GOOD',
      features: JSON.stringify(['Vista Rio', 'Reabilitado', 'Ribeirinho']),
      tags: JSON.stringify(['Setúbal', 'Vista Rio', 'Acessível']),
      commission: 3.0, createdById: pedro.id,
    }}),
    prisma.property.create({ data: {
      title: 'Moradia V5 Luxo — Estoril',
      description: 'Moradia de luxo V5 no Estoril, a 2 minutos do Casino. Piscina aquecida interior e exterior, jardim tropical, spa, garagem para 4 carros. Sala de cinema, adega climatizada. Domótica completa.',
      type: 'HOUSE', purpose: 'SALE', status: 'AVAILABLE',
      price: 2800000, address: 'Avenida de Nice, 45, 2765-200 Cascais', district: 'Lisboa',
      lat: 38.7053, lng: -9.3976,
      area: 650, bedrooms: 5, bathrooms: 6, parking: 4,
      reference: 'EST-MOR-001', energyCertificate: 'A',
      yearBuilt: 2019, condition: 'EXCELLENT',
      features: JSON.stringify(['Piscina Aquecida', 'Spa', 'Jardim Tropical', 'Garagem Quádrupla', 'Cinema', 'Adega', 'Domótica']),
      tags: JSON.stringify(['Ultra Luxo', 'Estoril', 'Premium', 'Villa']),
      commission: 2.0, createdById: joao.id,
    }}),
  ]);

  console.log(`Criados ${properties.length} imóveis`);

  // ─── CONTACTOS (50) ────────────────────────────────────────────────────────────
  const contactData = [
    // LEADS com budget e RGPD
    { name: 'Maria Fernanda Oliveira', email: 'maria.oliveira@email.pt', phone: '+351961111001', whatsapp: '+351961111001', type: 'LEAD', status: 'NEW', source: 'Portal Imobiliário', city: 'Lisboa', postalCode: '1100-001', notes: 'Procura T2 ou T3 em Lisboa. Orçamento até 350k.', budget_min: 250000, budget_max: 350000, interest_type: 'APARTMENT', timeline: 'IMMEDIATE', score: 85, gdprConsent: true, gdprConsentOrigin: 'PORTAL', assignedToId: ana.id },
    { name: 'António Rodrigues', email: 'antonio.rodrigues@gmail.com', phone: '+351961111002', whatsapp: '+351961111002', type: 'CLIENT', status: 'QUALIFIED', source: 'Indicação', city: 'Sintra', postalCode: '2710-001', notes: 'Comprou T2 em 2022. Procura moradia para família.', budget_min: 500000, budget_max: 750000, interest_type: 'HOUSE', timeline: '1_3_MONTHS', score: 92, gdprConsent: true, gdprConsentOrigin: 'IN_PERSON', assignedToId: ana.id },
    { name: 'Sofia Carvalho', email: 'sofia.carvalho@hotmail.com', phone: '+351961111003', type: 'LEAD', status: 'CONTACTED', source: 'Redes Sociais', city: 'Almada', postalCode: '2800-001', notes: 'Jovem profissional. Primeiro imóvel. Procura T1/T2.', budget_min: 150000, budget_max: 220000, interest_type: 'APARTMENT', timeline: '3_6_MONTHS', score: 60, gdprConsent: true, gdprConsentOrigin: 'FORM', assignedToId: ana.id },
    { name: 'Manuel Teixeira', email: 'manuel.teixeira@empresa.pt', phone: '+351961111004', whatsapp: '+351961111004', type: 'CLIENT', status: 'QUALIFIED', source: 'Walk-in', city: 'Cascais', postalCode: '2750-001', notes: 'Empresário. Procura espaço comercial em Cascais.', budget_min: 200000, budget_max: 400000, interest_type: 'COMMERCIAL', timeline: 'IMMEDIATE', score: 78, gdprConsent: true, gdprConsentOrigin: 'IN_PERSON', assignedToId: ana.id },
    { name: 'Catarina Mendes', email: 'catarina.mendes@sapo.pt', phone: '+351962222001', whatsapp: '+351962222001', type: 'LEAD', status: 'NEW', source: 'Portal Imobiliário', city: 'Sintra', postalCode: '2710-456', notes: 'Família com 2 filhos. Procura moradia em Sintra/Oeiras.', budget_min: 600000, budget_max: 750000, interest_type: 'HOUSE', timeline: '1_3_MONTHS', score: 88, gdprConsent: true, gdprConsentOrigin: 'PORTAL', assignedToId: pedro.id },
    { name: 'Rui Pereira', email: 'rui.pereira@gmail.com', phone: '+351962222002', type: 'LEAD', status: 'QUALIFIED', source: 'Email', city: 'Lisboa', postalCode: '1200-001', notes: 'Investidor. Interessa-se por apartamentos para arrendamento.', budget_min: 150000, budget_max: 300000, interest_type: 'APARTMENT', timeline: '3_6_MONTHS', score: 72, gdprConsent: false, assignedToId: pedro.id },
    { name: 'Isabel Gonçalves', email: 'isabel.goncalves@outlook.pt', phone: '+351962222003', whatsapp: '+351962222003', type: 'CLIENT', status: 'QUALIFIED', source: 'Indicação', city: 'Cascais', postalCode: '2750-100', notes: 'Reformada. Procura T2 perto de serviços.', budget_min: 350000, budget_max: 500000, interest_type: 'APARTMENT', timeline: 'IMMEDIATE', score: 95, gdprConsent: true, gdprConsentOrigin: 'PHONE', assignedToId: pedro.id },
    { name: 'Nuno Ferreira', email: 'nuno.ferreira@empresa.com', phone: '+351962222004', type: 'LEAD', status: 'CONTACTED', source: 'Redes Sociais', city: 'Oeiras', postalCode: '2780-001', notes: 'Casal jovem. Primeira casa. Budget ~300k.', budget_min: 250000, budget_max: 320000, interest_type: 'APARTMENT', timeline: '3_6_MONTHS', score: 55, gdprConsent: true, gdprConsentOrigin: 'FORM', assignedToId: pedro.id },
    { name: 'Luísa Monteiro', email: 'luisa.monteiro@gmail.com', phone: '+351963333001', whatsapp: '+351963333001', type: 'CLIENT', status: 'QUALIFIED', source: 'Portal Imobiliário', city: 'Cascais', postalCode: '2750-200', notes: 'Cliente VIP. Procura imóvel de luxo em Cascais. Budget >500k.', budget_min: 500000, budget_max: 1500000, interest_type: 'HOUSE', timeline: 'IMMEDIATE', score: 98, gdprConsent: true, gdprConsentOrigin: 'IN_PERSON', assignedToId: joao.id },
    { name: 'Diogo Azevedo', email: 'diogo.azevedo@sapo.pt', phone: '+351963333002', type: 'LEAD', status: 'NEW', source: 'Walk-in', city: 'Sintra', postalCode: '2710-651', notes: 'Interessado em terreno para construção em Sintra.', budget_min: 100000, budget_max: 250000, interest_type: 'LAND', timeline: '6_PLUS_MONTHS', score: 40, gdprConsent: true, gdprConsentOrigin: 'IN_PERSON', assignedToId: joao.id },
    { name: 'Carla Nascimento', email: 'carla.nascimento@gmail.com', phone: '+351964444001', type: 'LEAD', status: 'NEW', source: 'Instagram', city: 'Lisboa', postalCode: '1050-001', notes: 'Procura T3 ou T4 em zona premium Lisboa.', budget_min: 700000, budget_max: 1200000, interest_type: 'APARTMENT', timeline: '1_3_MONTHS', score: 76, gdprConsent: true, gdprConsentOrigin: 'FORM', assignedToId: joao.id },
    { name: 'Francisco Pinto', email: 'francisco.pinto@empresa.pt', phone: '+351964444002', whatsapp: '+351964444002', type: 'LEAD', status: 'CONTACTED', source: 'Google', city: 'Oeiras', postalCode: '2780-500', notes: 'Muda de emprego para Lisboa. Procura T2 para arrendar.', budget_min: 900, budget_max: 1400, interest_type: 'APARTMENT', timeline: 'IMMEDIATE', score: 65, gdprConsent: true, gdprConsentOrigin: 'FORM', assignedToId: ana.id },
    { name: 'Beatriz Lopes', email: 'beatriz.lopes@hotmail.com', phone: '+351965555001', type: 'LEAD', status: 'NEW', source: 'Idealista', city: 'Almada', postalCode: '2800-200', notes: 'Procura T2 em Almada ou Setúbal. Primeiro imóvel.', budget_min: 140000, budget_max: 200000, interest_type: 'APARTMENT', timeline: '3_6_MONTHS', score: 48, gdprConsent: true, gdprConsentOrigin: 'PORTAL', assignedToId: pedro.id },
    { name: 'Ricardo Sousa', email: 'ricardo.sousa@gmail.com', phone: '+351965555002', whatsapp: '+351965555002', type: 'OWNER', status: 'QUALIFIED', source: 'Indicação', city: 'Setúbal', postalCode: '2900-300', notes: 'Proprietário que quer vender moradia em Setúbal. Urgente.', budget_min: 0, budget_max: 0, interest_type: 'HOUSE', timeline: 'IMMEDIATE', score: 80, gdprConsent: true, gdprConsentOrigin: 'PHONE', assignedToId: pedro.id },
    { name: 'Margarida Fonseca', email: 'margarida.fonseca@outlook.pt', phone: '+351966666001', type: 'CLIENT', status: 'QUALIFIED', source: 'Feirão Imobiliário', city: 'Lisboa', postalCode: '1600-001', notes: 'Reformada, viúva. Quer vender moradia e comprar T2 menor.', budget_min: 280000, budget_max: 380000, interest_type: 'APARTMENT', timeline: '3_6_MONTHS', score: 70, gdprConsent: true, gdprConsentOrigin: 'IN_PERSON', assignedToId: joao.id },
    { name: 'Tiago Oliveira', email: 'tiago.oliveira@sapo.pt', phone: '+351966666002', type: 'LEAD', status: 'NEW', source: 'Facebook', city: 'Amadora', postalCode: '2700-100', notes: 'Jovem casal. Procura T2/T3 novo para comprar.', budget_min: 200000, budget_max: 300000, interest_type: 'APARTMENT', timeline: '3_6_MONTHS', score: 55, gdprConsent: false, assignedToId: ana.id },
    { name: 'Vera Santos', email: 'vera.santos@gmail.com', phone: '+351967777001', whatsapp: '+351967777001', type: 'LEAD', status: 'CONTACTED', source: 'Site da Agência', city: 'Cascais', postalCode: '2750-400', notes: 'Emigrante a regressar. Procura moradia em Cascais ou Estoril.', budget_min: 600000, budget_max: 900000, interest_type: 'HOUSE', timeline: '6_PLUS_MONTHS', score: 66, gdprConsent: true, gdprConsentOrigin: 'FORM', assignedToId: joao.id },
    { name: 'Hugo Correia', email: 'hugo.correia@empresa.com', phone: '+351967777002', type: 'PARTNER', status: 'QUALIFIED', source: 'Indicação', city: 'Lisboa', postalCode: '1250-100', notes: 'Mediador independente. Parceria em imóveis de luxo Lisboa.', score: 75, gdprConsent: true, gdprConsentOrigin: 'IN_PERSON', assignedToId: joao.id },
    { name: 'Paula Ribeiro', email: 'paula.ribeiro@hotmail.com', phone: '+351968888001', type: 'LEAD', status: 'NEW', source: 'Imovirtual', city: 'Oeiras', postalCode: '2780-600', notes: 'Procura T3 em Oeiras próximo do Taguspark. Trabalha lá.', budget_min: 350000, budget_max: 450000, interest_type: 'APARTMENT', timeline: '1_3_MONTHS', score: 72, gdprConsent: true, gdprConsentOrigin: 'PORTAL', assignedToId: pedro.id },
    { name: 'André Lima', email: 'andre.lima@gmail.com', phone: '+351968888002', whatsapp: '+351968888002', type: 'LEAD', status: 'CONTACTED', source: 'WhatsApp', city: 'Almada', postalCode: '2800-500', notes: 'Contactou por WhatsApp a pedir informação sobre T2 vista rio.', budget_min: 170000, budget_max: 230000, interest_type: 'APARTMENT', timeline: '3_6_MONTHS', score: 58, gdprConsent: true, gdprConsentOrigin: 'PHONE', assignedToId: ana.id },
    { name: 'Susana Morais', email: 'susana.morais@sapo.pt', phone: '+351969999001', type: 'CLIENT', status: 'QUALIFIED', source: 'Indicação', city: 'Sintra', postalCode: '2710-200', notes: 'Vendeu house em 2024 por nós. Agora quer comprar de novo.', budget_min: 500000, budget_max: 700000, interest_type: 'HOUSE', timeline: 'IMMEDIATE', score: 90, gdprConsent: true, gdprConsentOrigin: 'IN_PERSON', assignedToId: joao.id },
    { name: 'Carlos Pereira', email: 'carlos.pereira@outlook.pt', phone: '+351960001111', type: 'LEAD', status: 'NEW', source: 'OLX', city: 'Setúbal', postalCode: '2900-001', notes: 'Interessado em casa de praia na região de Setúbal.', budget_min: 120000, budget_max: 200000, interest_type: 'HOUSE', timeline: '6_PLUS_MONTHS', score: 35, gdprConsent: false, assignedToId: pedro.id },
    { name: 'Filipa Gomes', email: 'filipa.gomes@gmail.com', phone: '+351960002222', whatsapp: '+351960002222', type: 'LEAD', status: 'CONTACTED', source: 'Portal Imobiliário', city: 'Lisboa', postalCode: '1900-001', notes: 'Família numerosa. T4 ou moradia pequena em Lisboa.', budget_min: 450000, budget_max: 600000, interest_type: 'APARTMENT', timeline: '1_3_MONTHS', score: 74, gdprConsent: true, gdprConsentOrigin: 'PORTAL', assignedToId: ana.id },
    { name: 'Gonçalo Torres', email: 'goncalo.torres@empresa.pt', phone: '+351960003333', type: 'OWNER', status: 'QUALIFIED', source: 'Walk-in', city: 'Lisboa', postalCode: '1400-001', notes: 'Proprietário de 3 apartamentos no Restelo. Quer vender 1.', score: 82, gdprConsent: true, gdprConsentOrigin: 'IN_PERSON', assignedToId: joao.id },
    { name: 'Inês Rodrigues', email: 'ines.rodrigues@hotmail.com', phone: '+351960004444', type: 'LEAD', status: 'NEW', source: 'Google', city: 'Cascais', postalCode: '2750-300', notes: 'Procura T1 ou T2 para investimento arrendamento em Cascais.', budget_min: 180000, budget_max: 280000, interest_type: 'APARTMENT', timeline: '3_6_MONTHS', score: 62, gdprConsent: true, gdprConsentOrigin: 'FORM', assignedToId: pedro.id },
    { name: 'Paulo Marques', email: 'paulo.marques@gmail.com', phone: '+351960005555', whatsapp: '+351960005555', type: 'CLIENT', status: 'NEW', source: 'Indicação', city: 'Oeiras', postalCode: '2780-700', notes: 'Novo cliente referenciado pelo António Rodrigues.', budget_min: 350000, budget_max: 500000, interest_type: 'APARTMENT', timeline: 'IMMEDIATE', score: 70, gdprConsent: true, gdprConsentOrigin: 'PHONE', assignedToId: ana.id },
    // Mais 25 contactos variados
    { name: 'Marta Baptista', email: 'marta.baptista@sapo.pt', phone: '+351960006666', type: 'LEAD', status: 'NEW', source: 'Instagram', city: 'Lisboa', postalCode: '1300-001', notes: 'Procura T2 Belém ou Alcântara.', budget_min: 280000, budget_max: 380000, interest_type: 'APARTMENT', timeline: '3_6_MONTHS', score: 55, gdprConsent: true, gdprConsentOrigin: 'FORM', assignedToId: ana.id },
    { name: 'Joaquim Fernandes', email: 'joaquim.fernandes@outlook.pt', phone: '+351960007777', type: 'LEAD', status: 'CONTACTED', source: 'Telefone', city: 'Amadora', postalCode: '2700-200', notes: 'Ligou a pedir info sobre T3 novos.', budget_min: 220000, budget_max: 280000, interest_type: 'APARTMENT', timeline: '1_3_MONTHS', score: 60, gdprConsent: false, assignedToId: pedro.id },
    { name: 'Raquel Pinheiro', email: 'raquel.pinheiro@gmail.com', phone: '+351960008888', whatsapp: '+351960008888', type: 'CLIENT', status: 'QUALIFIED', source: 'Feirão Imobiliário', city: 'Cascais', postalCode: '2750-500', notes: 'Comprou T2 connosco em 2023. Recomenda amigos.', score: 88, gdprConsent: true, gdprConsentOrigin: 'IN_PERSON', assignedToId: joao.id },
    { name: 'Miguel Araújo', email: 'miguel.araujo@empresa.pt', phone: '+351960009999', type: 'LEAD', status: 'NEW', source: 'Casa Sapo', city: 'Setúbal', postalCode: '2900-400', notes: 'Procura moradia V3 em Setúbal até 330k.', budget_min: 250000, budget_max: 330000, interest_type: 'HOUSE', timeline: '3_6_MONTHS', score: 50, gdprConsent: true, gdprConsentOrigin: 'PORTAL', assignedToId: pedro.id },
    { name: 'Cristina Barbosa', email: 'cristina.barbosa@hotmail.com', phone: '+351961100001', type: 'LEAD', status: 'CONTACTED', source: 'Facebook', city: 'Lisboa', postalCode: '1700-001', notes: 'Segue nas redes sociais. Mostrou interesse em T3 Lisboa.', budget_min: 300000, budget_max: 420000, interest_type: 'APARTMENT', timeline: '6_PLUS_MONTHS', score: 45, gdprConsent: true, gdprConsentOrigin: 'FORM', assignedToId: ana.id },
    { name: 'Alexandre Costa', email: 'alexandre.costa@gmail.com', phone: '+351961200001', type: 'OWNER', status: 'NEW', source: 'Walk-in', city: 'Oeiras', postalCode: '2780-800', notes: 'Quer arrendar apartamento T2 que tem em Oeiras.', score: 65, gdprConsent: true, gdprConsentOrigin: 'IN_PERSON', assignedToId: pedro.id },
    { name: 'Leonor Vieira', email: 'leonor.vieira@sapo.pt', phone: '+351961300001', whatsapp: '+351961300001', type: 'LEAD', status: 'NEW', source: 'Idealista', city: 'Sintra', postalCode: '2710-300', notes: 'Procura moradia V4 Sintra. Crédito pré-aprovado 650k.', budget_min: 550000, budget_max: 680000, interest_type: 'HOUSE', timeline: 'IMMEDIATE', score: 91, gdprConsent: true, gdprConsentOrigin: 'PORTAL', assignedToId: joao.id },
    { name: 'Bernardo Macedo', email: 'bernardo.macedo@empresa.com', phone: '+351961400001', type: 'PARTNER', status: 'QUALIFIED', source: 'Indicação', city: 'Lisboa', postalCode: '1050-001', notes: 'Advogado especialista em imobiliário. Parceiro frequente.', score: 95, gdprConsent: true, gdprConsentOrigin: 'IN_PERSON', assignedToId: joao.id },
    { name: 'Natália Simões', email: 'natalia.simoes@gmail.com', phone: '+351961500001', type: 'LEAD', status: 'CONTACTED', source: 'Site da Agência', city: 'Lisboa', postalCode: '1600-200', notes: 'Procura T4 Jardins de Lisboa para família grande.', budget_min: 600000, budget_max: 900000, interest_type: 'APARTMENT', timeline: '1_3_MONTHS', score: 77, gdprConsent: true, gdprConsentOrigin: 'FORM', assignedToId: joao.id },
    { name: 'Bruno Alves', email: 'bruno.alves@outlook.pt', phone: '+351961600001', type: 'LEAD', status: 'NEW', source: 'Google', city: 'Almada', postalCode: '2800-300', notes: 'Jovem solteiro. Primeiro apartamento. T1 Almada.', budget_min: 130000, budget_max: 180000, interest_type: 'APARTMENT', timeline: '3_6_MONTHS', score: 42, gdprConsent: false, assignedToId: pedro.id },
    { name: 'Cláudia Nogueira', email: 'claudia.nogueira@hotmail.com', phone: '+351961700001', whatsapp: '+351961700001', type: 'CLIENT', status: 'QUALIFIED', source: 'Indicação', city: 'Cascais', postalCode: '2750-600', notes: 'Compradora recorrente. 3ª compra connosco.', score: 99, gdprConsent: true, gdprConsentOrigin: 'IN_PERSON', assignedToId: joao.id },
    { name: 'Sérgio Cardoso', email: 'sergio.cardoso@empresa.pt', phone: '+351961800001', type: 'LEAD', status: 'CONTACTED', source: 'WhatsApp', city: 'Lisboa', postalCode: '1900-200', notes: 'Procura escritório para a sua empresa. 100-150m².', budget_min: 250000, budget_max: 400000, interest_type: 'COMMERCIAL', timeline: 'IMMEDIATE', score: 68, gdprConsent: true, gdprConsentOrigin: 'PHONE', assignedToId: ana.id },
    { name: 'Joana Ferreira', email: 'joana.ferreira@sapo.pt', phone: '+351961900001', type: 'LEAD', status: 'NEW', source: 'OLX', city: 'Setúbal', postalCode: '2900-500', notes: 'Casal jovem. Procura T3 Setúbal até 300k.', budget_min: 200000, budget_max: 300000, interest_type: 'APARTMENT', timeline: '3_6_MONTHS', score: 52, gdprConsent: true, gdprConsentOrigin: 'PORTAL', assignedToId: pedro.id },
    { name: 'Vasco Rocha', email: 'vasco.rocha@gmail.com', phone: '+351962000001', whatsapp: '+351962000001', type: 'OWNER', status: 'NEW', source: 'Telefone', city: 'Oeiras', postalCode: '2780-900', notes: 'Tem moradia V3 Oeiras para vender. Herdeiro.', score: 70, gdprConsent: true, gdprConsentOrigin: 'PHONE', assignedToId: ana.id },
    { name: 'Sara Esteves', email: 'sara.esteves@empresa.com', phone: '+351962100001', type: 'LEAD', status: 'CONTACTED', source: 'Portal Imobiliário', city: 'Lisboa', postalCode: '1500-001', notes: 'Enfermeira. Procura T2 perto do Hospital de S. Francisco Xavier.', budget_min: 220000, budget_max: 300000, interest_type: 'APARTMENT', timeline: '1_3_MONTHS', score: 64, gdprConsent: true, gdprConsentOrigin: 'PORTAL', assignedToId: joao.id },
    { name: 'Rodrigo Mendonça', email: 'rodrigo.mendonca@hotmail.com', phone: '+351962200001', type: 'LEAD', status: 'NEW', source: 'Instagram', city: 'Sintra', postalCode: '2710-400', notes: 'Jovem advogado. Procura moradia V3/V4 Sintra como 2ª habitação.', budget_min: 350000, budget_max: 500000, interest_type: 'HOUSE', timeline: '6_PLUS_MONTHS', score: 58, gdprConsent: true, gdprConsentOrigin: 'FORM', assignedToId: pedro.id },
    { name: 'Ângela Borges', email: 'angela.borges@sapo.pt', phone: '+351962300001', whatsapp: '+351962300001', type: 'CLIENT', status: 'QUALIFIED', source: 'Feirão Imobiliário', city: 'Amadora', postalCode: '2700-300', notes: 'Subsídio habitação aprovado. T3 Amadora ou Sintra.', budget_min: 240000, budget_max: 320000, interest_type: 'APARTMENT', timeline: 'IMMEDIATE', score: 83, gdprConsent: true, gdprConsentOrigin: 'IN_PERSON', assignedToId: ana.id },
    { name: 'Eduardo Matos', email: 'eduardo.matos@gmail.com', phone: '+351962400001', type: 'LEAD', status: 'NEW', source: 'Google', city: 'Cascais', postalCode: '2750-700', notes: 'Expat britânico em Portugal. Procura villa Cascais/Estoril.', budget_min: 800000, budget_max: 2000000, interest_type: 'HOUSE', timeline: '3_6_MONTHS', score: 80, gdprConsent: true, gdprConsentOrigin: 'FORM', assignedToId: joao.id },
    { name: 'Teresa Cunha', email: 'teresa.cunha@empresa.pt', phone: '+351962500001', type: 'LEAD', status: 'CONTACTED', source: 'Indicação', city: 'Lisboa', postalCode: '1200-001', notes: 'Procura T2 para arrendar no Chiado ou Bairro Alto.', budget_min: 1200, budget_max: 1800, interest_type: 'APARTMENT', timeline: 'IMMEDIATE', score: 73, gdprConsent: true, gdprConsentOrigin: 'PHONE', assignedToId: ana.id },
    { name: 'Hélder Antunes', email: 'helder.antunes@outlook.pt', phone: '+351962600001', type: 'PARTNER', status: 'QUALIFIED', source: 'Indicação', city: 'Lisboa', postalCode: '1100-001', notes: 'Gestor de crédito no BPI. Envia clientes com crédito aprovado.', score: 90, gdprConsent: true, gdprConsentOrigin: 'IN_PERSON', assignedToId: joao.id },
    { name: 'Daniela Soares', email: 'daniela.soares@gmail.com', phone: '+351962700001', whatsapp: '+351962700001', type: 'LEAD', status: 'NEW', source: 'Casa Sapo', city: 'Almada', postalCode: '2800-600', notes: 'Solteira, 32 anos. T1 ou T2 Almada, vista rio preferência.', budget_min: 150000, budget_max: 210000, interest_type: 'APARTMENT', timeline: '3_6_MONTHS', score: 50, gdprConsent: true, gdprConsentOrigin: 'PORTAL', assignedToId: pedro.id },
    { name: 'Renato Dias', email: 'renato.dias@hotmail.com', phone: '+351962800001', type: 'LEAD', status: 'CONTACTED', source: 'Facebook', city: 'Setúbal', postalCode: '2900-600', notes: 'Professor. Procura moradia V3 em Setúbal até 350k.', budget_min: 280000, budget_max: 350000, interest_type: 'HOUSE', timeline: '6_PLUS_MONTHS', score: 47, gdprConsent: false, assignedToId: pedro.id },
    { name: 'Helena Tavares', email: 'helena.tavares@sapo.pt', phone: '+351962900001', whatsapp: '+351962900001', type: 'CLIENT', status: 'QUALIFIED', source: 'Indicação', city: 'Lisboa', postalCode: '1400-001', notes: 'Reformada. Quer vender moradia grande e comprar 2 apartamentos.', score: 87, gdprConsent: true, gdprConsentOrigin: 'IN_PERSON', assignedToId: joao.id },
    { name: 'Fábio Lemos', email: 'fabio.lemos@empresa.pt', phone: '+351963000001', type: 'LEAD', status: 'NEW', source: 'Imovirtual', city: 'Sintra', postalCode: '2710-500', notes: 'Procura terreno com projecto aprovado Sintra.', budget_min: 80000, budget_max: 200000, interest_type: 'LAND', timeline: '6_PLUS_MONTHS', score: 38, gdprConsent: true, gdprConsentOrigin: 'PORTAL', assignedToId: ana.id },
    { name: 'Liliana Mota', email: 'liliana.mota@gmail.com', phone: '+351963100001', type: 'LEAD', status: 'CONTACTED', source: 'Site da Agência', city: 'Oeiras', postalCode: '2780-100', notes: 'Precisa de T3 com garagem em Oeiras até 500k. Urgente.', budget_min: 350000, budget_max: 500000, interest_type: 'APARTMENT', timeline: 'IMMEDIATE', score: 85, gdprConsent: true, gdprConsentOrigin: 'FORM', assignedToId: pedro.id },
  ];

  const contacts = await Promise.all(
    contactData.map((c) => prisma.contact.create({ data: c }))
  );

  console.log(`Criados ${contacts.length} contactos`);

  // ─── OPORTUNIDADES (12 estágios PT) ───────────────────────────────────────────
  const now = new Date();
  const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);

  const opportunities = await Promise.all([
    prisma.opportunity.create({ data: { title: 'Maria Oliveira — T3 Cascais', stage: 'LEAD_IN', value: 485000, commission: 12125, probability: 15, expectedCloseDate: addDays(now, 90), notes: 'Primeiro contacto via Idealista. Enviado brochura.', position: 0, contactId: contacts[0].id, propertyId: properties[0].id, assignedToId: ana.id } }),
    prisma.opportunity.create({ data: { title: 'António Rodrigues — Moradia Sintra', stage: 'QUALIFYING', value: 720000, commission: 21600, probability: 30, expectedCloseDate: addDays(now, 60), notes: 'Reunião de qualificação agendada. Crédito pré-aprovado em curso.', position: 0, contactId: contacts[1].id, propertyId: properties[1].id, assignedToId: ana.id } }),
    prisma.opportunity.create({ data: { title: 'Catarina Mendes — Moradia Sintra', stage: 'VISIT_SCHEDULED', value: 680000, commission: 20400, probability: 40, expectedCloseDate: addDays(now, 45), notes: 'Visita agendada para sábado 10h.', position: 0, contactId: contacts[4].id, propertyId: properties[1].id, assignedToId: pedro.id } }),
    prisma.opportunity.create({ data: { title: 'Luísa Monteiro — Moradia Oeiras', stage: 'VISIT_DONE', value: 545000, commission: 13625, probability: 55, expectedCloseDate: addDays(now, 35), notes: 'Visita correu muito bem. Cliente muito interessada. A ponderar.', position: 0, contactId: contacts[8].id, propertyId: properties[3].id, assignedToId: joao.id } }),
    prisma.opportunity.create({ data: { title: 'Manuel Teixeira — Loja Cascais', stage: 'PROPOSAL_SENT', value: 295000, commission: 8850, probability: 60, expectedCloseDate: addDays(now, 25), notes: 'Proposta enviada a 20 de março. Aguarda resposta até sexta.', position: 0, contactId: contacts[3].id, propertyId: properties[5].id, assignedToId: ana.id } }),
    prisma.opportunity.create({ data: { title: 'Leonor Vieira — Moradia Sintra V4', stage: 'NEGOTIATION', value: 700000, commission: 21000, probability: 70, expectedCloseDate: addDays(now, 20), notes: 'Pediu redução de 20k. A negociar com proprietário.', position: 0, contactId: contacts[32].id, propertyId: properties[1].id, assignedToId: joao.id } }),
    prisma.opportunity.create({ data: { title: 'Susana Morais — T3 Oeiras Praia', stage: 'CPCV_SIGNED', value: 520000, commission: 13000, probability: 85, expectedCloseDate: addDays(now, 30), notes: 'CPCV assinado a 28/03/2026. Sinal de 20k pago.', position: 0, contactId: contacts[20].id, propertyId: properties[17].id, assignedToId: joao.id } }),
    prisma.opportunity.create({ data: { title: 'Nuno Ferreira — T3 Amadora Novo', stage: 'FINANCING', value: 265000, commission: 6625, probability: 80, expectedCloseDate: addDays(now, 45), notes: 'Banco CGD em análise. Previsão aprovação: 2 semanas.', position: 0, contactId: contacts[7].id, propertyId: properties[10].id, assignedToId: pedro.id } }),
    prisma.opportunity.create({ data: { title: 'Isabel Gonçalves — T3 Cascais Vista Mar', stage: 'ESCRITURA_SCHEDULED', value: 485000, commission: 12125, probability: 95, expectedCloseDate: addDays(now, 7), notes: 'Escritura marcada para 07/04/2026 no Cartório Notarial de Cascais.', position: 0, contactId: contacts[6].id, propertyId: properties[0].id, assignedToId: pedro.id } }),
    prisma.opportunity.create({ data: { title: 'Cláudia Nogueira — Moradia Estoril Luxo', stage: 'CLOSED_WON', value: 2800000, commission: 56000, probability: 100, expectedCloseDate: addDays(now, -10), notes: 'Escritura realizada a 21/03/2026. Comissão total recebida.', position: 0, contactId: contacts[36].id, propertyId: properties[19].id, assignedToId: joao.id } }),
    prisma.opportunity.create({ data: { title: 'Rui Pereira — T2 Lisboa Centro', stage: 'CLOSED_LOST', value: 345000, lostReason: 'Cliente optou por imóvel de outra agência a preço inferior.', probability: 0, expectedCloseDate: addDays(now, -15), notes: 'Manter contacto para futuras oportunidades.', position: 0, contactId: contacts[5].id, propertyId: properties[2].id, assignedToId: pedro.id } }),
    prisma.opportunity.create({ data: { title: 'Paula Ribeiro — T3 Oeiras Taguspark', stage: 'QUALIFYING', value: 520000, commission: 13000, probability: 35, expectedCloseDate: addDays(now, 70), notes: 'Segunda reunião agendada. Crédito habitação em análise.', position: 1, contactId: contacts[18].id, propertyId: properties[17].id, assignedToId: pedro.id } }),
  ]);

  console.log(`Criadas ${opportunities.length} oportunidades`);

  // ─── INTERAÇÕES ───────────────────────────────────────────────────────────────
  const interactions = [
    { type: 'EMAIL', subject: 'Apresentação — T3 Cascais Vista Mar', body: 'Boa tarde Maria, conforme combinado envio em anexo a brochura do apartamento T3 em Cascais com vista mar. Estou disponível para qualquer questão.', direction: 'OUTBOUND', contactId: contacts[0].id, opportunityId: opportunities[0].id, createdById: ana.id },
    { type: 'CALL', subject: 'Primeiro contacto telefónico', body: 'Contactei a Maria pelo telefone. Mostrou grande interesse no T3 de Cascais. Combinámos visita para próxima semana. Budget confirmado 350-500k.', direction: 'OUTBOUND', contactId: contacts[0].id, opportunityId: opportunities[0].id, createdById: ana.id },
    { type: 'MEETING', subject: 'Reunião de qualificação — António Rodrigues', body: 'Reunião no escritório. O António confirmou crédito pré-aprovado de 750k. Muito motivado para a compra de moradia em Sintra. Visita agendada para semana seguinte.', direction: 'INBOUND', contactId: contacts[1].id, opportunityId: opportunities[1].id, createdById: ana.id },
    { type: 'WHATSAPP', subject: 'Confirmação de visita — Moradia Sintra', body: 'Olá Catarina! A confirmar a visita à moradia V4 em Sintra para sábado às 10h. Qualquer questão estou disponível. Até sábado!', direction: 'OUTBOUND', contactId: contacts[4].id, opportunityId: opportunities[2].id, createdById: pedro.id },
    { type: 'EMAIL', subject: 'Proposta Comercial — Loja Cascais', body: 'Exmo. Sr. Manuel Teixeira, em anexo a proposta comercial para a Loja em Cascais com condições especiais de pagamento. Prazo de resposta: 5 dias úteis.', direction: 'OUTBOUND', contactId: contacts[3].id, opportunityId: opportunities[4].id, createdById: ana.id },
    { type: 'CALL', subject: 'Negociação — Leonor Vieira', body: 'A Leonor ligou com contraproposta de 680k (pediu redução de 20k). Vou contactar o proprietário para avaliar margem. Ela está muito interessada.', direction: 'INBOUND', contactId: contacts[32].id, opportunityId: opportunities[5].id, createdById: joao.id },
    { type: 'WHATSAPP', subject: 'CPCV assinado — Susana Morais', body: 'Susana, muito obrigado pela confiança! O CPCV foi assinado com sucesso. Aguardamos agora a aprovação do crédito para marcar a escritura. Estamos sempre disponíveis!', direction: 'OUTBOUND', contactId: contacts[20].id, opportunityId: opportunities[6].id, createdById: joao.id },
    { type: 'EMAIL', subject: 'Escritura Marcada — Isabel Gonçalves', body: 'Cara Isabel, confirmo que a escritura está marcada para dia 7 de Abril, pelas 14h, no Cartório Notarial de Cascais. Documentação completa. Parabéns!', direction: 'OUTBOUND', contactId: contacts[6].id, opportunityId: opportunities[8].id, createdById: pedro.id },
    { type: 'WHATSAPP', subject: 'Parabéns — Negócio Fechado Cláudia!', body: 'Cláudia! Foi um prazer enorme trabalhar consigo nesta aquisição. A Villa no Estoril vai ser espetacular para a sua família! Obrigado pela confiança.', direction: 'OUTBOUND', contactId: contacts[36].id, opportunityId: opportunities[9].id, createdById: joao.id },
    { type: 'NOTE', subject: 'Nota — Negócio perdido Rui Pereira', body: 'O Rui confirmou que fechou com outra agência. Mantive relação amigável — disse que me recomenda a amigos. Ficou o sinal de um futuro negócio de investimento.', direction: 'OUTBOUND', contactId: contacts[5].id, opportunityId: opportunities[10].id, createdById: pedro.id },
    { type: 'MEETING', subject: 'Visita realizada — T3 Oeiras', body: 'Luísa visitou o T3 perto da praia em Oeiras. Adorou a piscina do condomínio e a garagem dupla. Diz que vai falar com o marido. Muito positivo.', direction: 'INBOUND', contactId: contacts[8].id, opportunityId: opportunities[3].id, createdById: joao.id },
    { type: 'EMAIL', subject: 'Novos imóveis — Paula Ribeiro', body: 'Cara Paula, tenho um T3 junto ao Taguspark que pode ser perfeito para si. Piscina, ginásio, portaria. Posso agendar visita esta semana?', direction: 'OUTBOUND', contactId: contacts[18].id, opportunityId: opportunities[11].id, createdById: pedro.id },
    { type: 'CALL', subject: 'Financiamento banco — Nuno Ferreira', body: 'CGD disse que o processo está em análise final. Previsão: 10-14 dias. O Nuno está tranquilo. O T3 novo na Amadora está reservado.', direction: 'OUTBOUND', contactId: contacts[7].id, opportunityId: opportunities[7].id, createdById: pedro.id },
    { type: 'WHATSAPP', subject: 'Follow-up — Sofia Carvalho', body: 'Olá Sofia! Tenho um T2 renovado em Almada com vista rio que pode interessar-lhe. Quer que marque visita este fim de semana?', direction: 'OUTBOUND', contactId: contacts[2].id, createdById: ana.id },
    { type: 'NOTE', subject: 'Preferências confirmadas — António', body: 'António: moradia com garagem para 2 carros + jardim. Não quer apartamento. Budget 700k confirmado com carta do banco.', direction: 'OUTBOUND', contactId: contacts[1].id, opportunityId: opportunities[1].id, createdById: ana.id },
  ];

  for (const i of interactions) {
    await prisma.interaction.create({ data: i });
  }
  console.log(`Criadas ${interactions.length} interações`);

  // ─── TAREFAS ──────────────────────────────────────────────────────────────────
  const tasks = [
    { title: 'Ligar para Maria Oliveira — agendar visita T3 Cascais', description: 'Disponibilidade fins de semana. Confirmar budget e documentação financeira.', status: 'PENDING', priority: 'HIGH', dueDate: addDays(now, 2), contactId: contacts[0].id, opportunityId: opportunities[0].id, assignedToId: ana.id },
    { title: 'Confirmar crédito — António Rodrigues', description: 'Solicitar carta de crédito aprovado ao banco para avançar com CPCV.', status: 'IN_PROGRESS', priority: 'HIGH', dueDate: addDays(now, 1), contactId: contacts[1].id, opportunityId: opportunities[1].id, assignedToId: ana.id },
    { title: 'Visita Moradia Sintra — Catarina Mendes', description: 'Levar dossier completo. Preparar comparativo de preços da zona.', status: 'PENDING', priority: 'HIGH', dueDate: addDays(now, 3), contactId: contacts[4].id, opportunityId: opportunities[2].id, assignedToId: pedro.id },
    { title: 'Follow-up proposta Loja Cascais — Manuel Teixeira', description: 'Contactar o Manuel para saber decisão sobre proposta enviada.', status: 'PENDING', priority: 'MEDIUM', dueDate: addDays(now, -1), contactId: contacts[3].id, opportunityId: opportunities[4].id, assignedToId: ana.id },
    { title: 'Negociar redução com proprietário Sintra — Leonor', description: 'Apresentar contraproposta 700k ao proprietário. Margem negocial estimada: 15-20k.', status: 'IN_PROGRESS', priority: 'HIGH', dueDate: addDays(now, 0), contactId: contacts[32].id, opportunityId: opportunities[5].id, assignedToId: joao.id },
    { title: 'Preparar documentação escritura — Isabel Gonçalves', description: 'Certidão permanente, caderneta predial, licença habitabilidade. Enviar para advogado.', status: 'COMPLETED', priority: 'HIGH', dueDate: addDays(now, -5), completedAt: addDays(now, -6), contactId: contacts[6].id, opportunityId: opportunities[8].id, assignedToId: pedro.id },
    { title: 'Acompanhar aprovação crédito — Nuno Ferreira', description: 'Seguimento semanal com CGD. Confirmar estado da análise.', status: 'PENDING', priority: 'MEDIUM', dueDate: addDays(now, 5), contactId: contacts[7].id, opportunityId: opportunities[7].id, assignedToId: pedro.id },
    { title: 'Sessão fotográfica — Moradia V5 Estoril (novo imóvel)', description: 'Contratar fotógrafo profissional. Imagens + vídeo drone para portais.', status: 'PENDING', priority: 'MEDIUM', dueDate: addDays(now, 7), assignedToId: admin.id },
    { title: 'Reunião semanal equipa — revisão pipeline', description: 'Revisão do pipeline, prioridades da semana, partilha de boas práticas.', status: 'COMPLETED', priority: 'MEDIUM', dueDate: addDays(now, -3), completedAt: addDays(now, -3), assignedToId: joao.id },
    { title: 'Atualizar ficha — Quinta Palmela (novo imóvel)', description: 'Adicionar fotos, melhorar descrição PT e EN, publicar no Idealista e Imovirtual.', status: 'PENDING', priority: 'LOW', dueDate: addDays(now, 14), assignedToId: admin.id },
    { title: 'Enviar lista imóveis investimento — Rui Pereira', description: 'Preparar seleção de T2 Lisboa com yield >4%. Enviar por email com análise financeira.', status: 'PENDING', priority: 'LOW', dueDate: addDays(now, 7), contactId: contacts[5].id, assignedToId: pedro.id },
    { title: 'Qualificação Leonor Vieira — crédito pré-aprovado', description: 'Confirmar carta de crédito 650k. Agendar 2ª visita com o marido.', status: 'IN_PROGRESS', priority: 'HIGH', dueDate: addDays(now, 2), contactId: contacts[32].id, opportunityId: opportunities[5].id, assignedToId: joao.id },
  ];

  for (const t of tasks) {
    await prisma.task.create({ data: t });
  }
  console.log(`Criadas ${tasks.length} tarefas`);

  // ─── AGENDAMENTOS ─────────────────────────────────────────────────────────────
  await prisma.appointment.createMany({ data: [
    { title: 'Visita T3 Cascais — Catarina Mendes', startAt: addDays(now, 4), endAt: new Date(addDays(now, 4).getTime() + 60*60000), status: 'SCHEDULED', type: 'VISIT', contactId: contacts[4].id, opportunityId: opportunities[2].id, assignedToId: pedro.id, location: 'Rua das Flores, 45, Cascais', notes: 'Levar dossier. Cliente vem com o marido.' },
    { title: 'Reunião qualificação — António Rodrigues', startAt: addDays(now, 2), endAt: new Date(addDays(now, 2).getTime() + 90*60000), status: 'CONFIRMED', type: 'MEETING', contactId: contacts[1].id, opportunityId: opportunities[1].id, assignedToId: ana.id, location: 'Escritório CasaFlow, Av. da Liberdade', notes: 'Trazer carta crédito. Apresentar 3 opções moradias Sintra.' },
    { title: 'Escritura — Isabel Gonçalves T3 Cascais', startAt: addDays(now, 7), endAt: new Date(addDays(now, 7).getTime() + 120*60000), status: 'CONFIRMED', type: 'OTHER', contactId: contacts[6].id, opportunityId: opportunities[8].id, assignedToId: pedro.id, location: 'Cartório Notarial de Cascais, Rua Padre Moisés da Silva, 1', notes: 'Escritura marcada 07/04 às 14h.' },
    { title: 'Visita 2ª — Luísa Monteiro, Moradia Oeiras', startAt: addDays(now, 5), endAt: new Date(addDays(now, 5).getTime() + 75*60000), status: 'SCHEDULED', type: 'VISIT', contactId: contacts[8].id, opportunityId: opportunities[3].id, assignedToId: joao.id, location: 'Rua dos Navegadores, 33, Oeiras', notes: 'Visita com o marido desta vez.' },
    { title: 'Chamada follow-up — Leonor Vieira', startAt: addDays(now, 1), endAt: new Date(addDays(now, 1).getTime() + 30*60000), status: 'SCHEDULED', type: 'CALL', contactId: contacts[32].id, opportunityId: opportunities[5].id, assignedToId: joao.id, notes: 'Apresentar resposta do proprietário sobre redução de preço.' },
  ]});
  console.log(`Criados 5 agendamentos`);

  // ─── AUTOMAÇÕES ───────────────────────────────────────────────────────────────
  const automationRules = [
    { name: 'Speed to Lead — WhatsApp imediato (0 min)', trigger: 'NEW_LEAD', isActive: true, actions: JSON.stringify([{ type: 'SEND_WHATSAPP', delay: 0, message: 'Olá {{nome}}! Sou {{consultor}} da CasaFlow. Vi o seu interesse e estou aqui para ajudar a encontrar o imóvel ideal. Que tipo de imóvel procura?' }]) },
    { name: 'Chamada Perdida — SMS automático (2 min)', trigger: 'MISSED_CALL', isActive: true, actions: JSON.stringify([{ type: 'SEND_SMS', delay: 2, message: 'Olá {{nome}}! Sou {{consultor}}. Vi que me ligou. Estou numa visita mas respondo assim que possível!' }]) },
    { name: 'Visita Confirmada — WhatsApp confirmação', trigger: 'VISIT_SCHEDULED', isActive: true, actions: JSON.stringify([{ type: 'SEND_WHATSAPP', delay: 0, message: 'Olá {{nome}}! A sua visita está confirmada. Estarei à sua espera. Caso precise de alterar, contacte-me!' }]) },
    { name: 'Lead Qualificado — Email apresentação imóveis', trigger: 'LEAD_QUALIFIED', isActive: true, actions: JSON.stringify([{ type: 'SEND_EMAIL', delay: 30, subject: 'Imóveis selecionados para si — CasaFlow', message: 'Olá {{nome}},\n\nSelecionei imóveis que correspondem ao seu perfil. Entrarei em contacto brevemente.\n\nCom os melhores cumprimentos,\n{{consultor}}' }]) },
    { name: 'Proposta Enviada — Follow-up 48h', trigger: 'PROPOSAL_SENT', isActive: true, actions: JSON.stringify([{ type: 'CREATE_TASK', delay: 2880, message: 'Follow-up proposta enviada para {{nome}}' }, { type: 'SEND_WHATSAPP', delay: 2880, message: 'Olá {{nome}}! Teve oportunidade de analisar a proposta? Estou disponível para esclarecer qualquer dúvida!' }]) },
    { name: 'Lead Frio — Reativação 7 dias', trigger: 'NO_RESPONSE_2H', isActive: false, actions: JSON.stringify([{ type: 'SEND_EMAIL', delay: 10080, subject: 'Ainda a procurar imóvel?', message: 'Olá {{nome}}, vi que ainda não respondeu. Tenho novidades que podem interessar-lhe! Podemos falar?' }, { type: 'SEND_WHATSAPP', delay: 10080, message: 'Olá {{nome}}! Tenho 2 imóveis novos que podem ser exatamente o que procura. Posso enviar informação?' }]) },
  ];

  for (const rule of automationRules) {
    await prisma.automationRule.create({ data: rule });
  }
  console.log(`Criadas ${automationRules.length} automações`);

  // ─── CAMPANHAS EMAIL ──────────────────────────────────────────────────────────
  await prisma.emailCampaign.create({ data: {
    name: 'Newsletter Março 2026 — Novos Imóveis',
    subject: 'Novidades CasaFlow — Imóveis exclusivos este mês',
    body: '<h2>Novos imóveis disponíveis!</h2><p>Caro cliente, temos novidades especiais para si este mês...</p>',
    status: 'DRAFT', type: 'BROADCAST',
    targetFilter: JSON.stringify({ type: 'CLIENT' }),
    createdById: admin.id,
  }});

  await prisma.emailCampaign.create({ data: {
    name: 'Leads Frios — Reativação Primavera',
    subject: 'Ainda a pensar em casa nova? Temos a solução!',
    body: '<p>Olá! A primavera chegou e com ela novos imóveis incríveis. Veja as nossas sugestões...</p>',
    status: 'SENT', type: 'BROADCAST',
    sentAt: addDays(now, -7), sentCount: 45, openCount: 18, clickCount: 7,
    targetFilter: JSON.stringify({ status: 'NEW' }),
    createdById: admin.id,
  }});
  console.log(`Criadas 2 campanhas email`);

  // ─── BACKFILL locationId em todos os registos ────────────────────────────────
  const lid = defaultLocation.id;
  await Promise.all([
    prisma.property.updateMany({ where: { locationId: null }, data: { locationId: lid } }),
    prisma.contact.updateMany({ where: { locationId: null }, data: { locationId: lid } }),
    prisma.opportunity.updateMany({ where: { locationId: null }, data: { locationId: lid } }),
    prisma.task.updateMany({ where: { locationId: null }, data: { locationId: lid } }),
    prisma.appointment.updateMany({ where: { locationId: null }, data: { locationId: lid } }),
    prisma.conversation.updateMany({ where: { locationId: null }, data: { locationId: lid } }),
  ]);
  console.log('✓ Backfill locationId concluído');

  // ─── TEMPLATES DE MENSAGEM ────────────────────────────────────────────────────
  await prisma.messageTemplate.deleteMany({ where: { locationId: lid } });
  await prisma.messageTemplate.createMany({
    data: [
      {
        locationId: lid,
        name: 'Confirmação de visita',
        channel: 'ALL',
        body: 'Olá {{nome}}! A sua visita ao imóvel {{imovel}} está confirmada para {{data}} às {{hora}}. Qualquer dúvida estamos disponíveis. Até breve, {{consultor}}',
        variables: ['nome', 'imovel', 'data', 'hora', 'consultor'],
      },
      {
        locationId: lid,
        name: 'Follow-up pós-visita',
        channel: 'ALL',
        body: 'Olá {{nome}}, obrigado pela visita de hoje! Ficou com alguma questão sobre o imóvel? Estamos ao dispor. Com os melhores cumprimentos, {{consultor}}',
        variables: ['nome', 'consultor'],
      },
      {
        locationId: lid,
        name: 'Proposta enviada',
        channel: 'EMAIL',
        subject: 'A sua proposta — {{imovel}}',
        body: 'Olá {{nome}},\n\nAcabámos de enviar a proposta para o imóvel {{imovel}} para o seu email. Por favor confirme a recepção e não hesite em contactar-nos.\n\nCom os melhores cumprimentos,\n{{consultor}}',
        variables: ['nome', 'imovel', 'consultor'],
      },
    ],
  });
  console.log('✓ Templates de mensagem criados');

  console.log('\nSeed concluído com sucesso!');
  console.log('\nCredenciais de acesso:');
  console.log('   admin@crm.pt           | admin123 | AGENCY_OWNER');
  console.log('   joao@crm.pt            | admin123 | TEAM_LEADER');
  console.log('   ana@crm.pt             | admin123 | CONSULTANT');
  console.log('   pedro@crm.pt           | admin123 | CONSULTANT');
  console.log('   location-admin@crm.pt  | admin123 | LOCATION_ADMIN');
  console.log('   user@crm.pt            | admin123 | USER (permissões limitadas)');
  console.log('\nDados criados:');
  console.log('   6 utilizadores | 20 imóveis | 50 contactos | 12 oportunidades');
  console.log('   15 interações  | 12 tarefas | 5 agendamentos | 6 automações');
}

main()
  .catch((e) => {
    console.error('Seed falhou:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
