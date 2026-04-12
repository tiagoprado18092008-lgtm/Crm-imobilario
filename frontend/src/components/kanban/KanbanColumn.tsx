import React, { useState } from 'react'
import { Droppable } from '@hello-pangea/dnd'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import type { Opportunity } from '../../types'
import { KanbanCard } from './KanbanCard'
import { formatCurrency } from '../../utils/formatters'
import { STAGE_COLORS } from '../../utils/constants'

interface KanbanColumnProps {
  stage: string
  label: string
  opportunities: Opportunity[]
  onCardClick: (opp: Opportunity) => void
  onAddClick: (stage: string) => void
  onAction?: (opp: Opportunity, action: string, e: React.MouseEvent) => void
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  stage,
  label,
  opportunities,
  onCardClick,
  onAddClick,
  onAction,
}) => {
  const [collapsed, setCollapsed] = useState(false)
  const totalValue = opportunities.reduce((sum, o) => sum + (o.value || 0), 0)
  const accentColor = STAGE_COLORS[stage] || '#94a3b8'

  if (collapsed) {
    return (
      <div
        style={{
          width: 40,
          flexShrink: 0,
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderTop: `3px solid ${accentColor}`,
          borderRadius: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingTop: 10,
          paddingBottom: 10,
          gap: 8,
          cursor: 'pointer',
        }}
        onClick={() => setCollapsed(false)}
        title={`Expandir ${label}`}
      >
        <ChevronRight size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        <p
          style={{
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--text-muted)',
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </p>
        <span
          style={{
            background: 'var(--hover-bg)',
            color: 'var(--text-secondary)',
            fontSize: 10,
            fontWeight: 700,
            borderRadius: 10,
            padding: '2px 5px',
          }}
        >
          {opportunities.length}
        </span>
      </div>
    )
  }

  return (
    <div style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
      {/* Column Header - GHL style */}
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderBottom: 'none',
          borderTop: `3px solid ${accentColor}`,
          borderRadius: '8px 8px 0 0',
          padding: '10px 12px 8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
            }}
          >
            {label}
          </h3>
          <button
            onClick={() => setCollapsed(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 20,
              height: 20,
              borderRadius: 4,
              border: 'none',
              background: 'transparent',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              flexShrink: 0,
            }}
            title="Recolher"
          >
            <ChevronLeft size={13} />
          </button>
        </div>

        {/* Count + total value row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {opportunities.length} Oportunidade{opportunities.length !== 1 ? 's' : ''}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>·</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
            {formatCurrency(totalValue)}
          </span>
          <button
            onClick={() => onAddClick(stage)}
            style={{
              marginLeft: 'auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 20,
              height: 20,
              borderRadius: 4,
              border: '1px solid var(--border-color)',
              background: 'var(--bg-page)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
            title="Adicionar oportunidade"
          >
            <Plus size={11} />
          </button>
        </div>
      </div>

      {/* Droppable area */}
      <Droppable droppableId={stage}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            style={{
              flex: 1,
              minHeight: 120,
              padding: '8px 6px',
              borderRadius: '0 0 8px 8px',
              border: '1px solid var(--border-color)',
              borderTop: 'none',
              background: snapshot.isDraggingOver
                ? 'rgba(99,102,241,0.03)'
                : 'var(--bg-page)',
              maxHeight: 'calc(100vh - 260px)',
              overflowY: 'auto',
              transition: 'background 150ms',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {opportunities.map((opp, index) => (
                <KanbanCard
                  key={opp.id}
                  opportunity={opp}
                  index={index}
                  onClick={onCardClick}
                  onAction={onAction}
                />
              ))}
            </div>
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  )
}
