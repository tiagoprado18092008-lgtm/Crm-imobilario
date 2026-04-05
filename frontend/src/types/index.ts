export type Role = 'ADMIN' | 'PRINCIPAL_CONSULTANT' | 'CONSULTANT' | 'SUB_AGENT' | 'VIEWER'
export type ContactType = 'LEAD' | 'CLIENT' | 'OWNER' | 'PARTNER'
export type ContactStatus = 'NEW' | 'QUALIFIED' | 'CONTACTED' | 'INACTIVE'
export type PropertyType = 'APARTMENT' | 'HOUSE' | 'COMMERCIAL' | 'LAND' | 'GARAGE' | 'WAREHOUSE' | 'FARM' | 'OTHER'
export type PropertyPurpose = 'SALE' | 'RENT' | 'TRESPASSE'
export type PropertyStatus = 'AVAILABLE' | 'RESERVED' | 'SOLD' | 'RENTED' | 'IN_PROCESS'
export type OpportunityStage =
  | 'LEAD_IN'
  | 'QUALIFYING'
  | 'VISIT_SCHEDULED'
  | 'VISIT_DONE'
  | 'PROPOSAL_SENT'
  | 'NEGOTIATION'
  | 'CPCV_SIGNED'
  | 'FINANCING'
  | 'ESCRITURA_SCHEDULED'
  | 'CLOSED_WON'
  | 'CLOSED_LOST'
export type InteractionType = 'EMAIL' | 'WHATSAPP' | 'CALL' | 'MEETING' | 'NOTE'
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  phone?: string
  agency?: string
  isActive: boolean
  supervisorId?: string
  supervisor?: User
  subAgents?: User[]
  avatarUrl?: string
  onboardingCompleted?: boolean
  createdAt: string
}

export interface Contact {
  id: string
  name: string
  email?: string
  phone?: string
  whatsapp?: string
  type: ContactType
  status: ContactStatus
  source?: string
  notes?: string
  preferences?: string
  city?: string
  postalCode?: string
  nif?: string
  birthday?: string
  budget_min?: number
  budget_max?: number
  interest_type?: string
  interest_zones?: string
  timeline?: string
  score?: number
  gdprConsent?: boolean
  gdprConsentDate?: string
  gdprConsentOrigin?: string
  lastContactedAt?: string
  assignedToId: string
  assignedTo?: User
  opportunities?: Opportunity[]
  interactions?: Interaction[]
  tasks?: Task[]
  createdAt: string
}

export interface AutomationRule {
  id: string
  name: string
  trigger: string
  condition?: string
  actions: AutomationAction[]
  isActive: boolean
  createdAt: string
}

export interface AutomationAction {
  type: 'SEND_WHATSAPP' | 'SEND_EMAIL' | 'CREATE_TASK' | 'MOVE_STAGE' | 'SEND_SMS'
  delay?: number
  template?: string
  value?: string
}

export interface Snapshot {
  id: string
  name: string
  description?: string
  category: 'BUYERS' | 'SELLERS' | 'RENTAL'
  rules: AutomationRule[]
  createdAt: string
}

export interface Property {
  id: string
  title: string
  description?: string
  type: PropertyType
  purpose?: PropertyPurpose
  status: PropertyStatus
  price: number
  address: string
  district?: string
  lat?: number
  lng?: number
  area?: number
  bedrooms?: number
  bathrooms?: number
  parking?: number
  reference?: string
  energyCertificate?: string
  yearBuilt?: number
  condition?: string
  features?: string
  virtualTourUrl?: string
  tags?: string
  portalsPublished?: string
  commission?: number
  contractStart?: string
  contractEnd?: string
  viewCount?: number
  imageUrls: string
  createdById?: string
  createdAt: string
  updatedAt?: string
}

export interface Opportunity {
  id: string
  title: string
  stage: OpportunityStage
  value?: number
  source?: string
  expectedCloseDate?: string
  lostReason?: string
  notes?: string
  position: number
  contactId: string
  contact?: Contact
  propertyId?: string
  property?: Property
  assignedToId: string
  assignedTo?: User
  interactions?: Interaction[]
  tasks?: Task[]
  createdAt: string
}

export interface Interaction {
  id: string
  type: InteractionType
  subject?: string
  body: string
  direction: string
  contactId: string
  contact?: Contact
  opportunityId?: string
  opportunity?: Opportunity
  createdById: string
  createdBy?: User
  createdAt: string
}

export interface Task {
  id: string
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  dueDate?: string
  completedAt?: string
  contactId?: string
  contact?: Contact
  opportunityId?: string
  opportunity?: Opportunity
  assignedToId: string
  assignedTo?: User
  createdAt: string
}

export interface ReportSummary {
  totalContacts: number
  totalLeads: number
  totalClients: number
  openOpportunities: number
  pipelineValue: number
  tasksDueToday: number
  closedWonThisMonth: number
}

export interface PipelineStage {
  stage: string
  count: number
  totalValue: number
}

export interface AgentPerformance {
  agent: User
  contacts: number
  openOpportunities: number
  closedWon: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface Conversation {
  id: string
  channel: 'WHATSAPP' | 'EMAIL' | 'INSTAGRAM' | 'INTERNAL'
  externalId?: string
  status: 'OPEN' | 'RESOLVED' | 'ARCHIVED'
  contactId?: string
  contact?: Contact
  assignedToId?: string
  assignedTo?: User
  messages?: Message[]
  lastMessageAt: string
  createdAt: string
}

export interface Message {
  id: string
  conversationId: string
  direction: 'INBOUND' | 'OUTBOUND'
  channel: string
  content: string
  subject?: string
  status: string
  sentById?: string
  sentBy?: User
  createdAt: string
}

export interface ConversationStats {
  total: number
  open: number
  resolved: number
  byChannel: { channel: string; count: number }[]
}
