import React from 'react'
import { Draggable } from '@hello-pangea/dnd'
import { Phone, MessageSquare, MessageCircle, FileText, CheckSquare, Calendar } from 'lucide-react'
import type { Opportunity } from '../../types'
import { formatCurrency, getInitials } from '../../utils/formatters'

interface KanbanCardProps {
  opportunity: Opportunity
  index: number
  onClick: (opp: Opportunity) => void
  onAction?: (opp: Opportunity, action: string, e: React.MouseEvent) => void
}

export const KanbanCard: React.FC<KanbanCardProps> = ({ opportunity, index, onClick, onAction }) => {
  const handleAction = (action: string) => (e: React.MouseEvent) => {
    e.stopPropagation()
    onAction?.(opportunity, action, e)
  }

  return (
    <Draggable draggableId={opportunity.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onClick(opportunity)}
          style={{
            ...provided.draggableProps.style,
            background: snapshot.isDragging ? '#f0f7ff' : '#fff',
            boxShadow: snapshot.isDragging
              ? '0 8px 24px rgba(59,130,246,0.18)'
              : '0 1px 4px rgba(0,0,0,0.07)',
            border: snapshot.isDragging ? '1.5px solid #93c5fd' : '1px solid #e2e8f0',
            borderRadius: 10,
            padding: '10px 12px',
            cursor: 'pointer',
            userSelect: 'none',
            position: 'relative',
          }}
        >
          {/* Agent avatar top-right */}
          {opportunity.assignedTo && (
            <div
              style={{
                position: 'absolute',
                top: 10,
                right: 10,
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                fontWeight: 700,
                color: '#fff',
                flexShrink: 0,
                boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
              }}
              title={opportunity.assignedTo.name}
            >
              {getInitials(opportunity.assignedTo.name)}
            </div>
          )}

          {/* Title */}
          <p
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#0f172a',
              marginBottom: 8,
              paddingRight: opportunity.assignedTo ? 36 : 0,
              lineHeight: 1.4,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical' as any,
            }}
          >
            {opportunity.title}
          </p>

          {/* Contact name */}
          {opportunity.contact && (
            <p style={{ fontSize: 12, color: '#64748b', marginBottom: 5, fontWeight: 500 }}>
              {opportunity.contact.name}
            </p>
          )}

          {/* Source row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: '#94a3b8' }}>Fonte da oportu...</span>
            <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>
              {opportunity.source || opportunity.contact?.source || '—'}
            </span>
          </div>

          {/* Value row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 10 }}>
            <span style={{ fontSize: 11, color: '#94a3b8' }}>Valor da oportu...</span>
            <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 700 }}>
              {opportunity.value ? formatCurrency(opportunity.value) : '—'}
            </span>
          </div>

          {/* Action icons row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              paddingTop: 8,
              borderTop: '1px solid #f1f5f9',
            }}
          >
            <ActionBtn icon={<Phone size={12} />} label="Ligar" onClick={handleAction('call')} />
            <ActionBtn icon={<MessageSquare size={12} />} label="SMS" onClick={handleAction('sms')} />
            <ActionBtn icon={<MessageCircle size={12} />} label="WhatsApp" onClick={handleAction('whatsapp')} color="#25d366" />
            <ActionBtn icon={<FileText size={12} />} label="Notas" onClick={handleAction('note')} />
            <ActionBtn icon={<CheckSquare size={12} />} label="Tarefa" onClick={handleAction('task')} />
            <ActionBtn icon={<Calendar size={12} />} label="Calendário" onClick={handleAction('calendar')} />
          </div>
        </div>
      )}
    </Draggable>
  )
}

const ActionBtn: React.FC<{
  icon: React.ReactNode
  label: string
  onClick: (e: React.MouseEvent) => void
  color?: string
  count?: number
}> = ({ icon, label, onClick, color = '#64748b', count }) => (
  <button
    onClick={onClick}
    title={label}
    style={{
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 26,
      height: 26,
      borderRadius: 6,
      border: '1px solid #e2e8f0',
      background: '#f8fafc',
      color,
      cursor: 'pointer',
      flexShrink: 0,
      transition: 'background 150ms',
    }}
    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#eff6ff' }}
    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#f8fafc' }}
  >
    {icon}
    {count != null && count > 0 && (
      <span
        style={{
          position: 'absolute',
          top: -5,
          right: -5,
          background: '#3b82f6',
          color: '#fff',
          fontSize: 9,
          fontWeight: 700,
          borderRadius: '50%',
          width: 14,
          height: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          lineHeight: 1,
        }}
      >
        {count}
      </span>
    )}
  </button>
)
