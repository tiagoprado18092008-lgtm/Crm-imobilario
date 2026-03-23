import React, { useState } from 'react'
import { Droppable } from '@hello-pangea/dnd'
import { ChevronLeft, Plus } from 'lucide-react'
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
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingTop: 12,
          paddingBottom: 12,
          gap: 8,
          cursor: 'pointer',
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        }}
        onClick={() => setCollapsed(false)}
        title={`Expandir ${label}`}
      >
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: accentColor,
            flexShrink: 0,
          }}
        />
        <p
          style={{
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
            fontSize: 11,
            fontWeight: 600,
            color: '#475569',
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </p>
        <span
          style={{
            background: '#f1f5f9',
            color: '#64748b',
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
    <div style={{ width: 272, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
      {/* Column Header */}
      <div
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderBottom: 'none',
          borderRadius: '10px 10px 0 0',
          borderTop: `3px solid ${accentColor}`,
          padding: '10px 12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: accentColor,
                color: '#fff',
                fontSize: 10,
                fontWeight: 700,
                borderRadius: 10,
                padding: '1px 7px',
                flexShrink: 0,
              }}
            >
              {opportunities.length}
            </span>
            <h3
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: '#1e293b',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {label}
            </h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <button
              onClick={() => onAddClick(stage)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 22,
                height: 22,
                borderRadius: 5,
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
                color: '#64748b',
                cursor: 'pointer',
              }}
              title="Adicionar oportunidade"
            >
              <Plus size={12} />
            </button>
            <button
              onClick={() => setCollapsed(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 22,
                height: 22,
                borderRadius: 5,
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
                color: '#94a3b8',
                cursor: 'pointer',
              }}
              title="Recolher"
            >
              <ChevronLeft size={12} />
            </button>
          </div>
        </div>
        {totalValue > 0 && (
          <p style={{ fontSize: 11, color: '#64748b', marginTop: 3, fontWeight: 600 }}>
            {formatCurrency(totalValue)}
          </p>
        )}
      </div>

      {/* Droppable area */}
      <Droppable droppableId={stage}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            style={{
              flex: 1,
              minHeight: 80,
              padding: 8,
              borderRadius: '0 0 10px 10px',
              border: '1px solid #e2e8f0',
              borderTop: 'none',
              background: snapshot.isDraggingOver ? '#eff6ff' : '#f8fafc',
              overflowY: 'auto',
              maxHeight: 'calc(100vh - 300px)',
              transition: 'background 150ms',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
