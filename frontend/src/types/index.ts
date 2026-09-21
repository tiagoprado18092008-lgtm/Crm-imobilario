export type Role = 'SUPER_ADMIN' | 'AGENCY_OWNER' | 'AGENCY_ADMIN' | 'TEAM_LEADER' | 'CONSULTANT' | 'USER'
export type PermissionMap = Record<string, string[]>
export type ContactType = 'BUYER' | 'OWNER' | 'PARTNER' | 'TENANT'
export type ContactStatus = 'NEW' | 'QUALIFIED' | 'CONTACTED' | 'INACTIVE'
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

export interface Location {
  id: string
  agencyId: string
  name: string
  slug: string
  email?: string
  phone?: string
  address?: string
  logoUrl?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface LocationSettings {
  id: string
  timezone: string
  locale: string
  currency: string
  workingHours: Record<string, any>
  bookingPage: Record<string, any>
}

export interface AgencySettings {
  id: string
  agencyId: string
  whitelabelEnabled: boolean
  primaryColor: string
  defaultPermissions: PermissionMap
  securitySettings: Record<string, any>
}

export interface ActivityLog {
  id: string
  agencyId?: string
  userId?: string
  action: string
  entityType?: string
  entityId?: string
  metadata?: Record<string, any>
  ip?: string
  createdAt: string
  user?: { id: string; name: string; email: string }
}

export interface User {
  id: string
  name: string
  email: string
  role: Role
  phone?: string
  agency?: string
  agencyId?: string
  isActive: boolean
  supervisorId?: string
  supervisor?: User
  subAgents?: User[]
  avatarUrl?: string
  onboardingCompleted?: boolean
  createdAt: string
  location?: Location
  permissions?: PermissionMap
  amiNumber?: string
  googleId?: string
  passwordHash?: string
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
  appointments?: Appointment[]
  tags?: string[]
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

export interface Opportunity {
  id: string
  title: string
  stage: OpportunityStage
  value?: number
  commission?: number
  source?: string
  expectedCloseDate?: string
  lostReason?: string
  notes?: string
  position: number
  contactId: string
  contact?: Contact
  assignedToId: string
  assignedTo?: User
  interactions?: Interaction[]
  tasks?: Task[]
  // Dynamic fields
  selling_also?: boolean
  needs_financing?: boolean
  asking_price?: number
  sale_reason?: string
  buying_also?: boolean
  opp_commission?: number
  createdAt: string
}

export interface Appointment {
  id: string
  title: string
  description?: string
  startAt: string
  endAt: string
  status: string
  type: string
  contactId?: string
  contact?: Contact
  opportunityId?: string
  assignedToId: string
  assignedTo?: User
  notes?: string
  location?: string
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
  channel: 'WHATSAPP' | 'EMAIL' | 'SMS' | 'INSTAGRAM' | 'INTERNAL'
  externalId?: string
  status: 'OPEN' | 'RESOLVED' | 'ARCHIVED'
  isRead: boolean
  isStarred: boolean
  lastMessageText?: string
  contactId?: string
  contact?: Contact
  assignedToId?: string
  assignedTo?: User
  messages?: Message[]
  lastMessageAt: string
  createdAt: string
}

export interface MessageTemplate {
  id: string
  agencyId?: string
  name: string
  channel: 'WHATSAPP' | 'EMAIL' | 'SMS' | 'ALL'
  subject?: string
  body: string
  variables: string[]
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
