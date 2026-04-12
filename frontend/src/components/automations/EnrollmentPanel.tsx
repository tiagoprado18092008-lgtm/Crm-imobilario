'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Ban,
  RefreshCw,
  ChevronDown,
} from 'lucide-react'
import { getEnrollments } from '../../api/automations.api'
import type { AutomationEnrollment, EnrollmentStatus } from '../../types/automation'
import { ENROLLMENT_STATUS_LABELS } from '../../types/automation'
import { formatDistanceToNow, format, differenceInHours, differenceInMinutes } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// ─── STATUS CONFIG ───────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<EnrollmentStatus, { color: string; bg: string; icon: React.ElementType }> = {
  ACTIVE:    { color: '#60a5fa', bg: 'rgba(59,130,246,0.12)',  icon: RefreshCw },
  PAUSED:    { color: '#fbbf24', bg: 'rgba(245,158,11,0.12)',  icon: Clock },
  COMPLETED: { color: '#4ade80', bg: 'rgba(34,197,94,0.12)',   icon: CheckCircle2 },
  FAILED:    { color: '#f87171', bg: 'rgba(239,68,68,0.12)',   icon: XCircle },
  CANCELLED: { color: 'rgba(255,255,255,0.3)', bg: 'rgba(255,255,255,0.05)', icon: Ban },
}

const STATUS_FILTERS: { value: EnrollmentStatus | 'ALL'; label: string }[] = [
  { value: 'ALL',       label: 'Todos' },
  { value: 'ACTIVE',    label: 'Ativos' },
  { value: 'PAUSED',    label: 'Pausados' },
  { value: 'COMPLETED', label: 'Concluídos' },
  { value: 'FAILED',    label: 'Falhados' },
  { value: 'CANCELLED', label: 'Cancelados' },
]

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function formatWaitingUntil(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  if (date <= now) return 'A retomar...'

  const hours = differenceInHours(date, now)
  const minutes = differenceInMinutes(date, now) % 60

  if (hours >= 24) {
    const days = Math.floor(hours / 24)
    const remainHours = hours % 24
    return `Retoma em ${days}d ${remainHours}h`
  }
  if (hours > 0) return `Retoma em ${hours}h ${minutes}m`
  return `Retoma em ${minutes}m`
}

function formatRelative(dateStr: string): string {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: ptBR })
  } catch {
    return dateStr
  }
}

// ─── STATUS BADGE ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: EnrollmentStatus }) {
  const cfg = STATUS_CONFIG[status]
  const Icon = cfg.icon
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 8px', borderRadius: 100,
      background: cfg.bg,
      color: cfg.color,
      fontSize: 11, fontWeight: 600,
      whiteSpace: 'nowrap',
    }}>
      <Icon size={10} />
      {ENROLLMENT_STATUS_LABELS[status]}
    </span>
  )
}

// ─── PROPS ───────────────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onClose: () => void
  automationId: string
  automationName: string
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function EnrollmentPanel({ open, onClose, automationId, automationName }: Props) {
  const [enrollments, setEnrollments] = useState<AutomationEnrollment[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<EnrollmentStatus | 'ALL'>('ALL')
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await getEnrollments(automationId)
      setEnrollments(res.data || [])
    } catch (err: any) {
      setError('Erro ao carregar inscrições')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open && automationId) load()
  }, [open, automationId])

  const filtered = filter === 'ALL'
    ? enrollments
    : enrollments.filter(e => e.status === filter)

  // Stats
  const counts = enrollments.reduce((acc, e) => {
    acc[e.status] = (acc[e.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  if (!open) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.8)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        style={{
          width: '100%', maxWidth: 900,
          maxHeight: '90vh',
          background: '#0A0A0F',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 16,
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 40px 80px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={18} style={{ color: '#60a5fa' }} />
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#e2e8f0' }}>
              Leads Inscritos
            </h2>
            <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>{automationName}</p>
          </div>
          <button
            onClick={load}
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '6px 12px', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
          >
            <RefreshCw size={13} /> Atualizar
          </button>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 12, padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {(['ACTIVE', 'PAUSED', 'COMPLETED', 'FAILED'] as EnrollmentStatus[]).map(s => {
            const cfg = STATUS_CONFIG[s]
            return (
              <div key={s} style={{ flex: 1, padding: '10px 14px', background: cfg.bg, border: `1px solid ${cfg.color}30`, borderRadius: 10 }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: cfg.color }}>{counts[s] || 0}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{ENROLLMENT_STATUS_LABELS[s]}</div>
              </div>
            )
          })}
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 4, padding: '12px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {STATUS_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              style={{
                padding: '5px 12px', borderRadius: 8,
                background: filter === f.value ? 'rgba(99,102,241,0.15)' : 'transparent',
                border: `1px solid ${filter === f.value ? '#818cf8' : 'transparent'}`,
                color: filter === f.value ? '#818cf8' : 'rgba(255,255,255,0.4)',
                cursor: 'pointer', fontSize: 12, fontWeight: filter === f.value ? 600 : 400,
              }}
            >
              {f.label}
              {f.value !== 'ALL' && counts[f.value] ? (
                <span style={{ marginLeft: 6, padding: '1px 5px', background: 'rgba(255,255,255,0.1)', borderRadius: 100, fontSize: 10 }}>
                  {counts[f.value]}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {/* Table */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading && (
            <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
              <RefreshCw size={24} style={{ margin: '0 auto 12px', display: 'block', animation: 'spin 1s linear infinite' }} />
              A carregar...
            </div>
          )}

          {error && (
            <div style={{ padding: 20, margin: 24, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, color: '#f87171', fontSize: 13 }}>
              {error}
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div style={{ padding: 60, textAlign: 'center', color: 'rgba(255,255,255,0.25)' }}>
              <Users size={40} style={{ margin: '0 auto 16px', display: 'block', opacity: 0.3 }} />
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Nenhum lead inscrito</div>
              <div style={{ fontSize: 13 }}>
                {filter !== 'ALL' ? `Não há leads com estado "${ENROLLMENT_STATUS_LABELS[filter as EnrollmentStatus]}"` : 'Esta automação ainda não tem leads inscritos'}
              </div>
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Contacto', 'Estado', 'Step Atual', 'A Aguardar', 'Iniciado', ''].map(h => (
                    <th key={h} style={{
                      padding: '10px 16px', textAlign: 'left',
                      fontSize: 11, fontWeight: 600,
                      color: 'rgba(255,255,255,0.35)',
                      textTransform: 'uppercase', letterSpacing: 0.8,
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filtered.map((enrollment, i) => (
                    <motion.tr
                      key={enrollment.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => { (e.currentTarget as any).style.background = 'rgba(255,255,255,0.02)' }}
                      onMouseLeave={e => { (e.currentTarget as any).style.background = 'transparent' }}
                    >
                      {/* Contact */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>
                          {enrollment.contact?.name || enrollment.contactId.slice(0, 8) + '...'}
                        </div>
                        {enrollment.contact?.email && (
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
                            {enrollment.contact.email}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '12px 16px' }}>
                        <StatusBadge status={enrollment.status} />
                      </td>

                      {/* Current step */}
                      <td style={{ padding: '12px 16px' }}>
                        {enrollment.status === 'COMPLETED' ? (
                          <span style={{ fontSize: 12, color: '#4ade80' }}>Concluído</span>
                        ) : enrollment.currentStepId ? (
                          <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.04)', padding: '2px 6px', borderRadius: 4 }}>
                            {enrollment.currentStepId.slice(0, 12)}...
                          </span>
                        ) : (
                          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>—</span>
                        )}
                      </td>

                      {/* Waiting */}
                      <td style={{ padding: '12px 16px' }}>
                        {enrollment.waitingUntil ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Clock size={12} style={{ color: '#fbbf24', flexShrink: 0 }} />
                            <span style={{ fontSize: 12, color: '#fbbf24' }}>
                              {formatWaitingUntil(enrollment.waitingUntil)}
                            </span>
                          </div>
                        ) : enrollment.waitingForEvent ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <AlertCircle size={12} style={{ color: '#60a5fa', flexShrink: 0 }} />
                            <span style={{ fontSize: 12, color: '#60a5fa' }}>
                              À espera: {enrollment.waitingForEvent}
                            </span>
                          </div>
                        ) : (
                          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>—</span>
                        )}
                      </td>

                      {/* Started */}
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                          {formatRelative(enrollment.startedAt)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '12px 16px' }}>
                        {enrollment.status === 'ACTIVE' && (
                          <button
                            style={{
                              padding: '4px 10px', fontSize: 11,
                              background: 'rgba(239,68,68,0.08)',
                              border: '1px solid rgba(239,68,68,0.2)',
                              borderRadius: 6, color: '#f87171',
                              cursor: 'pointer',
                            }}
                          >
                            Cancelar
                          </button>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 24px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
            {filtered.length} resultado(s) de {enrollments.length} total
          </span>
          <button
            onClick={onClose}
            style={{ padding: '7px 18px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: 13 }}
          >
            Fechar
          </button>
        </div>
      </motion.div>
    </div>
  )
}
