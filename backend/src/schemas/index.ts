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
  name: z.string().min(1, 'Nome obrigatório'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  type: z.enum(['LEAD', 'CLIENT']).default('LEAD'),
  status: z.enum(['NEW', 'QUALIFIED', 'CONTACTED', 'INACTIVE']).default('NEW'),
  source: z.string().optional(),
  notes: z.string().optional(),
  assignedToId: z.string().optional(),
});

export const updateContactSchema = createContactSchema.partial();

// Opportunities
export const createOpportunitySchema = z.object({
  title: z.string().min(1, 'Título obrigatório'),
  stage: z.string().default('LEAD_IN'),
  value: z.number().nonnegative().optional(),
  source: z.string().optional(),
  expectedCloseDate: z.string().optional(),
  lostReason: z.string().optional(),
  notes: z.string().optional(),
  position: z.number().default(0),
  contactId: z.string().min(1, 'Contacto obrigatório'),
  propertyId: z.string().optional(),
  assignedToId: z.string().optional(),
});

export const updateOpportunitySchema = createOpportunitySchema.partial();

export const moveStageSchema = z.object({
  stage: z.string().min(1, 'Stage obrigatório'),
  position: z.number().default(0),
});

// Tasks
export const createTaskSchema = z.object({
  title: z.string().min(1, 'Título obrigatório'),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).default('PENDING'),
  dueDate: z.string().optional(),
  contactId: z.string().optional(),
  opportunityId: z.string().optional(),
  assignedToId: z.string().optional(),
});

export const updateTaskSchema = createTaskSchema.partial();

// Properties
export const createPropertySchema = z.object({
  title: z.string().min(1, 'Título obrigatório'),
  type: z.enum(['APARTMENT', 'HOUSE', 'COMMERCIAL', 'LAND', 'OTHER']).default('APARTMENT'),
  status: z.enum(['AVAILABLE', 'RESERVED', 'SOLD', 'RENTED']).default('AVAILABLE'),
  price: z.number().nonnegative().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  zipCode: z.string().optional(),
  area: z.number().nonnegative().optional(),
  bedrooms: z.number().int().nonnegative().optional(),
  bathrooms: z.number().int().nonnegative().optional(),
  description: z.string().optional(),
  features: z.string().optional(),
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

// Appointments
export const createAppointmentSchema = z.object({
  title: z.string().min(1, 'Título obrigatório'),
  type: z.string().default('VISIT'),
  startAt: z.string().min(1, 'Data de início obrigatória'),
  endAt: z.string().optional(),
  notes: z.string().optional(),
  contactId: z.string().optional(),
  propertyId: z.string().optional(),
  opportunityId: z.string().optional(),
  status: z.string().default('SCHEDULED'),
});

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
