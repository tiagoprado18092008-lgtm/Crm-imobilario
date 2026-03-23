import React from 'react'

interface Props {
  score: number
  size?: 'sm' | 'md'
}

export const LeadScoreBadge: React.FC<Props> = ({ score, size = 'md' }) => {
  const getColor = () => {
    if (score >= 75) return { bg: '#dcfce7', text: '#16a34a', bar: '#22c55e', label: 'Quente' }
    if (score >= 50) return { bg: '#fef9c3', text: '#ca8a04', bar: '#eab308', label: 'Morno' }
    if (score >= 25) return { bg: '#ffedd5', text: '#c2410c', bar: '#f97316', label: 'Frio' }
    return { bg: '#f1f5f9', text: '#64748b', bar: '#cbd5e1', label: 'Novo' }
  }

  const c = getColor()
  const isSmall = size === 'sm'

  return (
    <div className="flex items-center gap-2">
      <div
        className="flex items-center gap-1.5 rounded-full font-semibold"
        style={{
          background: c.bg,
          color: c.text,
          padding: isSmall ? '2px 8px' : '3px 10px',
          fontSize: isSmall ? 11 : 12,
        }}
      >
        <span style={{ fontSize: isSmall ? 10 : 11 }}>●</span>
        {score}/100
        {!isSmall && <span className="font-normal opacity-70">· {c.label}</span>}
      </div>
      {!isSmall && (
        <div className="w-16 h-1.5 rounded-full" style={{ background: '#e2e8f0' }}>
          <div className="h-full rounded-full" style={{ width: `${score}%`, background: c.bar, transition: 'width 0.5s' }} />
        </div>
      )}
    </div>
  )
}

// Calcula o score de um contacto baseado nas suas interações e oportunidades
export const calcLeadScore = (contact: {
  interactions?: { type: string }[]
  opportunities?: { stage: string }[]
  tasks?: { status: string }[]
  status?: string
}): number => {
  let score = 10 // base

  // +pontos por interações
  const interactions = contact.interactions || []
  score += Math.min(interactions.length * 8, 40)

  // +pontos por tipo de interação
  if (interactions.some(i => i.type === 'CALL' || i.type === 'MEETING')) score += 15
  if (interactions.some(i => i.type === 'WHATSAPP')) score += 10

  // +pontos por stage da oportunidade
  const stages: Record<string, number> = {
    LEAD_IN: 5, QUALIFYING: 10, VISIT_SCHEDULED: 20,
    PROPOSAL_SENT: 30, NEGOTIATION: 40,
    CLOSED_WON: 100, CLOSED_LOST: 0,
  }
  const opp = contact.opportunities?.[0]
  if (opp) score += stages[opp.stage] || 0

  // status
  if (contact.status === 'QUALIFIED') score += 10
  if (contact.status === 'CONTACTED') score += 5

  return Math.min(score, 100)
}
