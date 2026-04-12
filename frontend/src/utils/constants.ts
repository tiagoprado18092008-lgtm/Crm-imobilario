export const STAGE_LABELS: Record<string, string> = {
  LEAD_IN:              'Lead Novo',
  QUALIFYING:           'Primeiro Contacto',
  VISIT_SCHEDULED:      'Visita Agendada',
  VISIT_DONE:           'Visita Realizada',
  PROPOSAL_SENT:        'Proposta Enviada',
  NEGOTIATION:          'Negociação',
  CPCV_SIGNED:          'CPCV Assinado',
  FINANCING:            'Financiamento',
  ESCRITURA_SCHEDULED:  'Escritura Marcada',
  CLOSED_WON:           'Negócio Fechado',
  CLOSED_LOST:          'Perdido',
}

export const STAGE_ORDER = [
  'LEAD_IN',
  'QUALIFYING',
  'VISIT_SCHEDULED',
  'VISIT_DONE',
  'PROPOSAL_SENT',
  'NEGOTIATION',
  'CPCV_SIGNED',
  'FINANCING',
  'ESCRITURA_SCHEDULED',
  'CLOSED_WON',
  'CLOSED_LOST',
]

export const STAGE_COLORS: Record<string, string> = {
  LEAD_IN:              '#6366f1',
  QUALIFYING:           '#8b5cf6',
  VISIT_SCHEDULED:      '#f59e0b',
  VISIT_DONE:           '#10b981',
  PROPOSAL_SENT:        '#3b82f6',
  NEGOTIATION:          '#f97316',
  CPCV_SIGNED:          '#c9a84c',
  FINANCING:            '#06b6d4',
  ESCRITURA_SCHEDULED:  '#1a2e4a',
  CLOSED_WON:           '#22c55e',
  CLOSED_LOST:          '#ef4444',
}

export const STAGE_HEADER_COLORS: Record<string, string> = {
  LEAD_IN:              'border-t-indigo-400',
  QUALIFYING:           'border-t-violet-400',
  VISIT_SCHEDULED:      'border-t-yellow-400',
  VISIT_DONE:           'border-t-emerald-400',
  PROPOSAL_SENT:        'border-t-blue-400',
  NEGOTIATION:          'border-t-orange-400',
  CPCV_SIGNED:          'border-t-yellow-600',
  FINANCING:            'border-t-cyan-400',
  ESCRITURA_SCHEDULED:  'border-t-slate-600',
  CLOSED_WON:           'border-t-green-500',
  CLOSED_LOST:          'border-t-red-400',
}

export const PIPELINE_STAGES: { value: string; label: string; color: string }[] = [
  { value: 'LEAD_IN',             label: 'Lead Novo',          color: '#6366f1' },
  { value: 'QUALIFYING',          label: 'Primeiro Contacto',  color: '#8b5cf6' },
  { value: 'VISIT_SCHEDULED',     label: 'Visita Agendada',    color: '#f59e0b' },
  { value: 'VISIT_DONE',          label: 'Visita Realizada',   color: '#10b981' },
  { value: 'PROPOSAL_SENT',       label: 'Proposta Enviada',   color: '#3b82f6' },
  { value: 'NEGOTIATION',         label: 'Negociação',         color: '#f97316' },
  { value: 'CPCV_SIGNED',         label: 'CPCV Assinado',      color: '#c9a84c' },
  { value: 'FINANCING',           label: 'Financiamento',      color: '#06b6d4' },
  { value: 'ESCRITURA_SCHEDULED', label: 'Escritura Marcada',  color: '#1a2e4a' },
  { value: 'CLOSED_WON',          label: 'Negócio Fechado',    color: '#22c55e' },
  { value: 'CLOSED_LOST',         label: 'Perdido',            color: '#ef4444' },
]

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  AGENCY_OWNER: 'Diretor de Agência',
  AGENCY_DIRECTOR: 'Diretor de Agência',
  AGENCY_ADMIN: 'Admin de Agência',
  TEAM_LEADER: 'Líder de Equipa',
  PRINCIPAL_CONSULTANT: 'Consultor Principal',
  CONSULTANT: 'Consultor',
  SUB_AGENT: 'Sub-Agente',
  SUB_CONSULTANT: 'Sub-Consultor',
  VIEWER: 'Visualizador',
}

export const AGENCY_DIRECTOR_ROLES = ['AGENCY_OWNER', 'AGENCY_DIRECTOR', 'AGENCY_ADMIN'] as const

export const SOURCE_OPTIONS = [
  'Website',
  'E-mail',
  'Presencial',
  'Portal imobiliário',
  'Indicação',
  'Telefone/WhatsApp',
]

export const PROPERTY_TYPE_LABELS: Record<string, string> = {
  APARTMENT: 'Apartamento',
  HOUSE: 'Moradia',
  COMMERCIAL: 'Comercial',
  LAND: 'Terreno',
  GARAGE: 'Garagem',
  WAREHOUSE: 'Armazém',
  FARM: 'Quinta',
  OTHER: 'Outro',
}

export const PROPERTY_PURPOSE_LABELS: Record<string, string> = {
  SALE: 'Venda',
  RENT: 'Arrendamento',
  TRESPASSE: 'Trespasse',
}

export const PROPERTY_STATUS_LABELS: Record<string, string> = {
  AVAILABLE: 'Disponível',
  RESERVED: 'Reservado',
  SOLD: 'Vendido/Escriturado',
  RENTED: 'Arrendado',
  IN_PROCESS: 'Em Processo',
}

export const ENERGY_CERTIFICATES = ['A+', 'A', 'B', 'B-', 'C', 'D', 'E', 'F', 'G']

export const PROPERTY_CONDITIONS: Record<string, string> = {
  NEW: 'Novo',
  EXCELLENT: 'Excelente',
  GOOD: 'Bom',
  NEEDS_RENOVATION: 'Para Renovar',
}

export const CONTACT_STATUS_LABELS: Record<string, string> = {
  NEW: 'Novo',
  QUALIFIED: 'Qualificado',
  CONTACTED: 'Contactado',
  INACTIVE: 'Inativo',
}

export const CONTACT_TYPE_LABELS: Record<string, string> = {
  BUYER: 'Comprador',
  OWNER: 'Proprietário',
  PARTNER: 'Parceiro',
}

export const APPOINTMENT_TYPE_LABELS: Record<string, string> = {
  VISIT:              'Visita',
  ANGARIACAO_MEETING: 'Reunião de angariação',
  CPCV:               'CPCV',
  ESCRITURA:          'Escritura',
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

export const TIMELINE_OPTIONS: Record<string, string> = {
  IMMEDIATE: 'Imediato',
  '1_3_MONTHS': '1 a 3 meses',
  '3_6_MONTHS': '3 a 6 meses',
  '6_PLUS_MONTHS': 'Mais de 6 meses',
}

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
