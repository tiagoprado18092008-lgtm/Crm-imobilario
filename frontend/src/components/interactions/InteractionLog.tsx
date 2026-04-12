import React from 'react'
import { Mail, MessageCircle, Phone, Users, FileText, ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import type { Interaction } from '../../types'
import { formatDateTime, formatDate } from '../../utils/formatters'
import { INTERACTION_TYPE_LABELS } from '../../utils/constants'

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; bg: string; color: string }> = {
  EMAIL:    { icon: <Mail    style={{ width: 13, height: 13 }} />, bg: '#eff6ff', color: '#2563eb' },
  WHATSAPP: { icon: <MessageCircle style={{ width: 13, height: 13 }} />, bg: '#f0fdf4', color: '#16a34a' },
  CALL:     { icon: <Phone   style={{ width: 13, height: 13 }} />, bg: '#fff7ed', color: '#ea580c' },
  MEETING:  { icon: <Users   style={{ width: 13, height: 13 }} />, bg: '#fdf4ff', color: '#9333ea' },
  NOTE:     { icon: <FileText style={{ width: 13, height: 13 }} />, bg: 'var(--hover-bg)', color: 'var(--text-muted)' },
}

interface InteractionLogProps {
  interactions: Interaction[]
}

function groupByDate(interactions: Interaction[]): [string, Interaction[]][] {
  const map = new Map<string, Interaction[]>()
  for (const i of interactions) {
    const date = formatDate(i.createdAt)
    if (!map.has(date)) map.set(date, [])
    map.get(date)!.push(i)
  }
  return Array.from(map.entries())
}

export const InteractionLog: React.FC<InteractionLogProps> = ({ interactions }) => {
  if (interactions.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 0', fontSize: 13, color: 'var(--text-muted)' }}>
        Sem interações registadas
      </div>
    )
  }

  const sorted = [...interactions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
  const groups = groupByDate(sorted)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {groups.map(([date, items]) => (
        <div key={date}>
          {/* Date separator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ height: 1, flex: 1, background: 'var(--border-subtle)' }} />
            <span style={{
              fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
              padding: '2px 10px', borderRadius: 20,
              background: 'var(--hover-bg)', border: '1px solid var(--border-subtle)',
            }}>
              {date}
            </span>
            <div style={{ height: 1, flex: 1, background: 'var(--border-subtle)' }} />
          </div>

          {/* Timeline items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingLeft: 8 }}>
            {items.map((interaction, idx) => {
              const cfg = TYPE_CONFIG[interaction.type] ?? TYPE_CONFIG.NOTE
              const isLast = idx === items.length - 1
              return (
                <div key={interaction.id} style={{ display: 'flex', gap: 12 }}>
                  {/* Left: dot + line */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: cfg.bg, color: cfg.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: '1.5px solid var(--border-subtle)',
                      flexShrink: 0,
                    }}>
                      {cfg.icon}
                    </div>
                    {!isLast && (
                      <div style={{
                        width: 1, flex: 1, minHeight: 8,
                        background: 'var(--border-subtle)',
                        margin: '2px 0',
                      }} />
                    )}
                  </div>

                  {/* Right: content */}
                  <div style={{
                    flex: 1, minWidth: 0,
                    padding: '6px 10px 10px',
                    borderRadius: 8,
                    background: 'var(--hover-bg)',
                    border: '1px solid var(--border-subtle)',
                    marginBottom: isLast ? 0 : 4,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                      <span style={{
                        fontSize: 11, fontWeight: 600, color: cfg.color,
                        background: cfg.bg, padding: '1px 7px', borderRadius: 10,
                      }}>
                        {INTERACTION_TYPE_LABELS[interaction.type]}
                      </span>
                      {interaction.subject && (
                        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {interaction.subject}
                        </span>
                      )}
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto', flexShrink: 0 }}>
                        {formatDateTime(interaction.createdAt)}
                      </span>
                    </div>

                    {interaction.body && (
                      <p style={{ fontSize: 13, color: 'var(--text-primary)', whiteSpace: 'pre-line', margin: 0, lineHeight: 1.5 }}>
                        {interaction.body}
                      </p>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
                      {interaction.createdBy && (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          por {interaction.createdBy.name}
                        </span>
                      )}
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--text-muted)' }}>
                        {interaction.direction === 'IN' ? (
                          <><ArrowDownLeft style={{ width: 11, height: 11, color: '#16a34a' }} /> Recebido</>
                        ) : (
                          <><ArrowUpRight style={{ width: 11, height: 11, color: '#2563eb' }} /> Enviado</>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
