export const STAGE_LABELS: Record<string, string> = {
  LEAD_IN:              'Lead Novo',
  QUALIFYING:           'Primeiro Contacto',
  MEETING_SCHEDULED:    'Reunião Marcada',
  MEETING_DONE:         'Reunião Feita',
  PROPOSAL_SENT:        'Proposta Enviada',
  NEGOTIATION:          'Negociação',
  CLOSED_WON:           'Ganho',
  CLOSED_LOST:          'Perdido',
}

export const STAGE_ORDER = [
  'LEAD_IN',
  'QUALIFYING',
  'MEETING_SCHEDULED',
  'MEETING_DONE',
  'PROPOSAL_SENT',
  'NEGOTIATION',
  'CLOSED_WON',
  'CLOSED_LOST',
]

export const STAGE_COLORS: Record<string, string> = {
  LEAD_IN:              '#6366f1',
  QUALIFYING:           '#8b5cf6',
  MEETING_SCHEDULED:    '#f59e0b',
  MEETING_DONE:         '#10b981',
  PROPOSAL_SENT:        '#3b82f6',
  NEGOTIATION:          '#f97316',
  CLOSED_WON:           '#22c55e',
  CLOSED_LOST:          '#ef4444',
}

export const STAGE_HEADER_COLORS: Record<string, string> = {
  LEAD_IN:              'border-t-indigo-400',
  QUALIFYING:           'border-t-violet-400',
  MEETING_SCHEDULED:    'border-t-yellow-400',
  MEETING_DONE:         'border-t-emerald-400',
  PROPOSAL_SENT:        'border-t-blue-400',
  NEGOTIATION:          'border-t-orange-400',
  CLOSED_WON:           'border-t-green-500',
  CLOSED_LOST:          'border-t-red-400',
}

export const PIPELINE_STAGES: { value: string; label: string; color: string }[] = [
  { value: 'LEAD_IN',             label: 'Lead Novo',          color: '#6366f1' },
  { value: 'QUALIFYING',          label: 'Primeiro Contacto',  color: '#8b5cf6' },
  { value: 'MEETING_SCHEDULED',   label: 'Reunião Marcada',    color: '#f59e0b' },
  { value: 'MEETING_DONE',        label: 'Reunião Feita',      color: '#10b981' },
  { value: 'PROPOSAL_SENT',       label: 'Proposta Enviada',   color: '#3b82f6' },
  { value: 'NEGOTIATION',         label: 'Negociação',         color: '#f97316' },
  { value: 'CLOSED_WON',          label: 'Ganho',              color: '#22c55e' },
  { value: 'CLOSED_LOST',         label: 'Perdido',            color: '#ef4444' },
]

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Administrador',
  AGENCY_OWNER: 'Administrador',
  AGENCY_DIRECTOR: 'Administrador',
  AGENCY_ADMIN: 'Administrador',
  TEAM_LEADER: 'Líder de Equipa',
  PRINCIPAL_CONSULTANT: 'Comercial Sénior',
  CONSULTANT: 'Comercial',
  SUB_AGENT: 'BDR',
  SUB_CONSULTANT: 'BDR',
  VIEWER: 'Visualizador',
}

export const AGENCY_DIRECTOR_ROLES = ['AGENCY_OWNER', 'AGENCY_DIRECTOR', 'AGENCY_ADMIN'] as const

export const SOURCE_OPTIONS = [
  'Cold call',
  'Website',
  'E-mail',
  'Presencial',
  'Indicação',
  'Telefone/WhatsApp',
]

export const CONTACT_STATUS_LABELS: Record<string, string> = {
  NEW: 'Novo',
  QUALIFIED: 'Qualificado',
  CONTACTED: 'Contactado',
  INACTIVE: 'Inativo',
}

export const CONTACT_TYPE_LABELS: Record<string, string> = {
  LEAD: 'Lead',
  PROSPECT: 'Prospeto',
  CLIENT: 'Cliente',
  PARTNER: 'Parceiro',
}

export const APPOINTMENT_TYPE_LABELS: Record<string, string> = {
  DISCOVERY:          'Reunião de diagnóstico',
  PROPOSAL_MEETING:   'Apresentação de proposta',
  ONBOARDING:         'Onboarding de cliente',
  FOLLOW_UP:          'Follow-up',
  GENERAL_MEETING:    'Reunião geral',
}

export const SALE_REASON_OPTIONS = [
  'Mudança de residência',
  'Separação / Divórcio',
  'Herança',
  'Dificuldades financeiras',
  'Upgrade / Downgrade',
  'Investimento',
  'Outro',
]

export const INTERACTION_TYPE_LABELS: Record<string, string> = {
  EMAIL: 'Email',
  WHATSAPP: 'WhatsApp',
  CALL: 'Chamada',
  MEETING: 'Reunião',
  NOTE: 'Nota',
}

export const TASK_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente',
  IN_PROGRESS: 'Em Progresso',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
}

export const TASK_PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
}
