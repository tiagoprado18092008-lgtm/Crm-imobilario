export type Role = 'ADMIN' | 'PRINCIPAL_CONSULTANT' | 'SUB_AGENT'
export type ContactType = 'LEAD' | 'CLIENT'
export type ContactStatus = 'NEW' | 'QUALIFIED' | 'CONTACTED' | 'INACTIVE'
export type PropertyType = 'APARTMENT' | 'HOUSE' | 'COMMERCIAL' | 'LAND' | 'OTHER'
export type PropertyStatus = 'AVAILABLE' | 'RESERVED' | 'SOLD' | 'RENTED'
export type OpportunityStage = 'LEAD_IN' | 'QUALIFYING' | 'VISIT_SCHEDULED' | 'PROPOSAL_SENT' | 'NEGOTIATION' | 'CLOSED_WON' | 'CLOSED_LOST'
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
  leadScore?: number
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
  status: PropertyStatus
  price: number
  address: string
  area?: number
  bedrooms?: number
  bathrooms?: number
  parking?: number
  reference?: string
  imageUrls: string
  createdAt: string
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
