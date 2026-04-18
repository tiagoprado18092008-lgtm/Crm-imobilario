import { z } from 'zod';

// Auth
export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Password obrigatória'),
});

export const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Password deve ter pelo menos 6 caracteres'),
  phone: z.string().optional(),
  agency: z.string().optional(),
  invitationToken: z.string().optional(),
});

// Contacts
export const createContactSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  type: z.enum(['LEAD', 'CLIENT', 'OWNER', 'PARTNER', 'BUYER']).default('LEAD'),
  status: z.enum(['NEW', 'QUALIFIED', 'CONTACTED', 'INACTIVE']).default('NEW'),
  source: z.string().optional(),
  notes: z.string().optional(),
  preferences: z.string().optional(),
  assignedToId: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  budget_min: z.number().optional(),
  budget_max: z.number().optional(),
  interest_type: z.string().optional(),
  timeline: z.string().optional(),
  gdprConsent: z.boolean().optional(),
  gdprConsentOrigin: z.string().optional(),
});

export const updateContactSchema = createContactSchema.partial();

const VALID_STAGES = ['LEAD_IN', 'QUALIFYING', 'VISIT_SCHEDULED', 'VISIT_DONE', 'PROPOSAL_SENT', 'NEGOTIATION', 'CPCV_SIGNED', 'FINANCING', 'ESCRITURA_SCHEDULED', 'CLOSED_WON', 'CLOSED_LOST'] as const;

const optionalDate = z.string().refine(s => !s || !isNaN(Date.parse(s)), { message: 'Data inválida' }).optional();

// Opportunities
export const createOpportunitySchema = z.object({
  title: z.string().min(1, 'Título obrigatório').max(200, 'Título demasiado longo'),
  stage: z.string().default('LEAD_IN'),
  stageId: z.string().optional(),
  pipelineId: z.string().optional(),
  value: z.number().nonnegative('Valor deve ser positivo').optional(),
  source: z.string().max(100).optional(),
  expectedCloseDate: optionalDate,
  lostReason: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
  position: z.number().int().nonnegative().default(0),
  contactId: z.string().min(1, 'Contacto obrigatório'),
  propertyId: z.string().optional(),
  assignedToId: z.string().optional(),
  selling_also: z.boolean().optional(),
  needs_financing: z.boolean().optional(),
  property_address: z.string().optional(),
  asking_price: z.number().nonnegative().optional(),
  sale_reason: z.string().optional(),
  buying_also: z.boolean().optional(),
});

export const updateOpportunitySchema = createOpportunitySchema.partial();

export const moveStageSchema = z.object({
  stage: z.string().min(1, 'Fase obrigatória'),
  stageId: z.string().optional(),
  position: z.number().int().nonnegative().default(0),
});

// Tasks
export const createTaskSchema = z.object({
  title: z.string().min(2, 'Título deve ter pelo menos 2 caracteres').max(200, 'Título demasiado longo'),
  description: z.string().max(2000).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH'], { errorMap: () => ({ message: 'Prioridade inválida. Valores: LOW, MEDIUM, HIGH' }) }).default('MEDIUM'),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'], { errorMap: () => ({ message: 'Estado inválido. Valores: PENDING, IN_PROGRESS, COMPLETED, CANCELLED' }) }).default('PENDING'),
  dueDate: optionalDate,
  contactId: z.string().optional(),
  opportunityId: z.string().optional(),
  assignedToId: z.string().optional(),
});

export const updateTaskSchema = createTaskSchema.partial();

// Properties
export const createPropertySchema = z.object({
  title: z.string().min(1, 'Título obrigatório'),
  type: z.enum(['APARTMENT', 'HOUSE', 'COMMERCIAL', 'LAND', 'GARAGE', 'WAREHOUSE', 'FARM', 'OTHER']).default('APARTMENT'),
  status: z.enum(['AVAILABLE', 'RESERVED', 'SOLD', 'RENTED', 'IN_PROCESS']).default('AVAILABLE'),
  price: z.number().nonnegative().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  zipCode: z.string().optional(),
  area: z.number().nonnegative().optional(),
  bedrooms: z.number().int().nonnegative().optional(),
  bathrooms: z.number().int().nonnegative().optional(),
  parking: z.number().int().nonnegative().optional(),
  reference: z.string().optional(),
  description: z.string().optional(),
  features: z.string().optional(),
  imageUrls: z.string().optional(),
  images: z.string().optional(),
});

export const updatePropertySchema = createPropertySchema.partial();

// Campaigns
export const createCampaignSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  subject: z.string().min(1, 'Assunto obrigatório'),
  body: z.string().min(1, 'Corpo do email obrigatório'),
  type: z.string().default('BROADCAST'),
  targetFilter: z.record(z.any()).optional(),
  scheduledAt: z.string().optional(),
});

// Forms
export const createFormSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  description: z.string().optional(),
  submitAction: z.string().default('CREATE_CONTACT'),
  thankYouMessage: z.string().optional(),
  fields: z.any(),
  assignedToId: z.string().optional(),
});

// Automations
export const createAutomationSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  trigger: z.string().min(1, 'Trigger obrigatório'),
  action: z.string().min(1, 'Ação obrigatória'),
  config: z.record(z.any()).optional(),
  isActive: z.boolean().default(true),
});

// Invitations
export const createInvitationSchema = z.object({
  email: z.string().email('Email inválido'),
  role: z.string().default('CONSULTANT'),
});

const validDateTimeString = (label: string) =>
  z.string().min(1, `${label} obrigatória`).refine(s => !isNaN(Date.parse(s)), { message: `${label} inválida` });

// Appointments
export const createAppointmentSchema = z.object({
  title: z.string().min(1, 'Título obrigatório').max(200, 'Título demasiado longo'),
  type: z.enum(['VISIT', 'CALL', 'MEETING', 'OTHER', 'ANGARIACAO_MEETING', 'CPCV', 'ESCRITURA', 'GENERAL_MEETING'], { errorMap: () => ({ message: 'Tipo inválido' }) }).default('VISIT'),
  startAt: validDateTimeString('Data de início'),
  endAt: validDateTimeString('Data de fim'),
  description: z.string().max(2000).optional(),
  notes: z.string().max(2000).optional(),
  location: z.string().max(500).optional(),
  contactId: z.string().optional(),
  propertyId: z.string().optional(),
  opportunityId: z.string().optional(),
  assignedToId: z.string().optional(),
  status: z.enum(['SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'], { errorMap: () => ({ message: 'Estado inválido' }) }).default('SCHEDULED'),
}).refine(
  data => !data.startAt || !data.endAt || new Date(data.endAt) > new Date(data.startAt),
  { message: 'Data de fim deve ser posterior ao início', path: ['endAt'] }
);

export const updateAppointmentSchema = z.object({
  title: z.string().min(1, 'Título obrigatório').max(200).optional(),
  type: z.enum(['VISIT', 'CALL', 'MEETING', 'OTHER', 'ANGARIACAO_MEETING', 'CPCV', 'ESCRITURA', 'GENERAL_MEETING'], { errorMap: () => ({ message: 'Tipo inválido' }) }).optional(),
  startAt: validDateTimeString('Data de início').optional(),
  endAt: validDateTimeString('Data de fim').optional(),
  description: z.string().max(2000).optional(),
  notes: z.string().max(2000).optional(),
  location: z.string().max(500).optional(),
  contactId: z.string().optional(),
  propertyId: z.string().optional(),
  opportunityId: z.string().optional(),
  assignedToId: z.string().optional(),
  status: z.enum(['SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'], { errorMap: () => ({ message: 'Estado inválido' }) }).optional(),
}).refine(
  data => !data.startAt || !data.endAt || new Date(data.endAt) > new Date(data.startAt),
  { message: 'Data de fim deve ser posterior ao início', path: ['endAt'] }
);

// Interactions
export const createInteractionSchema = z.object({
  type: z.string().min(1, 'Tipo obrigatório'),
  notes: z.string().optional(),
  contactId: z.string().min(1, 'Contacto obrigatório'),
  opportunityId: z.string().optional(),
});

// Phone numbers
export const phoneNumberE164 = z.string().regex(/^\+[1-9]\d{1,14}$/, 'Número deve estar no formato E.164 (ex: +351912345678)');

// Messages
export const sendMessageSchema = z.object({
  channel: z.string().min(1, 'Canal obrigatório'),
  content: z.string().min(1, 'Conteúdo obrigatório'),
  subject: z.string().optional(),
});
