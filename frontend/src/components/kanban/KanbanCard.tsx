import React from 'react'
import ReactDOM from 'react-dom'
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
      {(provided, snapshot) => {
        const card = (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            onClick={() => onClick(opportunity)}
            style={{
              ...provided.draggableProps.style,
              background: snapshot.isDragging ? 'var(--accent-soft)' : 'var(--surface)',
              boxShadow: snapshot.isDragging
                ? '0 8px 24px rgba(46,107,230,0.18)'
                : '0 1px 3px rgba(0,0,0,0.06)',
              border: snapshot.isDragging
                ? '1.5px solid var(--accent)'
                : '1px solid var(--border)',
              borderRadius: 8,
              padding: '10px 12px',
              cursor: 'pointer',
              userSelect: 'none',
              position: snapshot.isDragging
                ? (provided.draggableProps.style as any)?.position
                : 'relative',
            }}
          >
            {/* Title row + avatar */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
              <p
                style={{
                  flex: 1,
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  lineHeight: 1.4,
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical' as any,
                  margin: 0,
                }}
              >
                {opportunity.title}
              </p>
              {opportunity.assignedTo && (
                <div
                  title={opportunity.assignedTo.name}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: 'var(--accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    fontWeight: 700,
                    color: '#fff',
                    flexShrink: 0,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                  }}
                >
                  {getInitials(opportunity.assignedTo.name)}
                </div>
              )}
            </div>

            {/* Source row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                marginBottom: 4,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  flexShrink: 0,
                  minWidth: 100,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                Fonte da oportu...
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: 'var(--text-secondary)',
                  fontWeight: 500,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {opportunity.source || opportunity.contact?.source || '—'}
              </span>
            </div>

            {/* Value row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                marginBottom: 10,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  flexShrink: 0,
                  minWidth: 100,
                }}
              >
                Valor da oportu...
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: opportunity.value ? '#16a34a' : 'var(--text-secondary)',
                  fontWeight: opportunity.value ? 700 : 400,
                }}
              >
                {opportunity.value ? formatCurrency(opportunity.value) : '€0.00'}
              </span>
            </div>

            {/* Contact name badge */}
            {opportunity.contact?.name && (
              <div style={{ marginBottom: 8 }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    fontSize: 10,
                    fontWeight: 600,
                    color: 'var(--accent)',
                    background: 'var(--accent-soft)',
                    padding: '2px 7px',
                    borderRadius: 20,
                    maxWidth: '100%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {opportunity.contact.name}
                </span>
              </div>
            )}

            {/* Action icons */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                paddingTop: 8,
                borderTop: '1px solid var(--border-subtle)',
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
        )

        return snapshot.isDragging
          ? ReactDOM.createPortal(card, document.body)
          : card
      }}
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
      border: '1px solid var(--border-color)',
      background: 'var(--bg-page)',
      color,
      cursor: 'pointer',
      flexShrink: 0,
      transition: 'background 150ms',
    }}
    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--accent-soft)' }}
    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-page)' }}
  >
    {icon}
    {count != null && count > 0 && (
      <span
        style={{
          position: 'absolute',
          top: -5,
          right: -5,
          background: 'var(--accent)',
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
