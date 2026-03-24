export const STAGE_LABELS: Record<string, string> = {
  LEAD_IN: 'Contactar',
  QUALIFYING: 'Follow Up',
  VISIT_SCHEDULED: 'Quente (1 Mês)',
  PROPOSAL_SENT: 'Morno (3 Meses)',
  NEGOTIATION: 'Frio (+6 Meses)',
  CLOSED_WON: 'CPCV / Escritura',
  CLOSED_LOST: 'Perdido'
}

export const STAGE_ORDER = [
  'LEAD_IN',
  'QUALIFYING',
  'VISIT_SCHEDULED',
  'PROPOSAL_SENT',
  'NEGOTIATION',
  'CLOSED_WON',
  'CLOSED_LOST'
]

export const STAGE_COLORS: Record<string, string> = {
  LEAD_IN: '#6366f1',
  QUALIFYING: '#3b82f6',
  VISIT_SCHEDULED: '#f59e0b',
  PROPOSAL_SENT: '#10b981',
  NEGOTIATION: '#64748b',
  CLOSED_WON: '#22c55e',
  CLOSED_LOST: '#ef4444'
}

export const STAGE_HEADER_COLORS: Record<string, string> = {
  LEAD_IN: 'border-t-gray-400',
  QUALIFYING: 'border-t-blue-400',
  VISIT_SCHEDULED: 'border-t-yellow-400',
  PROPOSAL_SENT: 'border-t-orange-400',
  NEGOTIATION: 'border-t-purple-400',
  CLOSED_WON: 'border-t-green-500',
  CLOSED_LOST: 'border-t-red-400'
}

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  PRINCIPAL_CONSULTANT: 'Consultor Principal',
  CONSULTANT: 'Consultor',
  SUB_CONSULTANT: 'Sub-Consultor',
  VIEWER: 'Visualizador'
}

export const SOURCE_OPTIONS = [
  'Idealista',
  'Imovirtual',
  'Casa Sapo',
  'OLX',
  'BPI Expresso Imobiliário',
  'Indicação',
  'Redes Sociais',
  'Instagram',
  'Facebook Ads',
  'Google Ads',
  'Walk-in',
  'Email',
  'Chamada Direta',
  'Outro'
]

export const PROPERTY_TYPE_LABELS: Record<string, string> = {
  APARTMENT: 'Apartamento',
  HOUSE: 'Moradia',
  COMMERCIAL: 'Comercial',
  LAND: 'Terreno',
  OTHER: 'Outro'
}

export const PROPERTY_STATUS_LABELS: Record<string, string> = {
  AVAILABLE: 'Disponível',
  RESERVED: 'Reservado',
  SOLD: 'Vendido',
  RENTED: 'Arrendado'
}

export const CONTACT_STATUS_LABELS: Record<string, string> = {
  NEW: 'Novo',
  QUALIFIED: 'Qualificado',
  CONTACTED: 'Contactado',
  INACTIVE: 'Inativo'
}

export const CONTACT_TYPE_LABELS: Record<string, string> = {
  LEAD: 'Lead',
  CLIENT: 'Cliente'
}

export const INTERACTION_TYPE_LABELS: Record<string, string> = {
  EMAIL: 'Email',
  WHATSAPP: 'WhatsApp',
  CALL: 'Chamada',
  MEETING: 'Reunião',
  NOTE: 'Nota'
}

export const TASK_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente',
  IN_PROGRESS: 'Em Progresso',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado'
}

export const TASK_PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta'
}
