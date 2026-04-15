import React, { useEffect, useState } from 'react'
import { Activity, User, Home, Phone, Mail, FileText, Calendar, MapPin, Briefcase, RefreshCw, Clock } from 'lucide-react'
import { getActivity } from '../../api/activity.api'
import { getUsers } from '../../api/users.api'
import { PageSpinner } from '../../components/ui/Spinner'
import { formatDate } from '../../utils/formatters'

interface ActivityLog {
  id: string
  action: string
  entityType?: string
  entityId?: string
  userId?: string
  agencyId?: string
  locationId?: string
  metadata?: any
  createdAt: string
}

// Map action prefix → display config
const ACTION_CONFIG: Record<string, { label: string; color: string; bg: string; Icon: any }> = {
  'contact':     { label: 'Contacto',    color: '#22c55e', bg: 'rgba(34,197,94,0.1)',    Icon: User },
  'property':    { label: 'Propriedade', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',   Icon: Home },
  'opportunity': { label: 'Oportunidade',color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',   Icon: Briefcase },
  'task':        { label: 'Tarefa',      color: '#10b981', bg: 'rgba(16,185,129,0.1)',   Icon: FileText },
  'call':        { label: 'Chamada',     color: '#6366f1', bg: 'rgba(99,102,241,0.1)',   Icon: Phone },
  'email':       { label: 'Email',       color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)',   Icon: Mail },
  'appointment': { label: 'Agendamento', color: '#ec4899', bg: 'rgba(236,72,153,0.1)',   Icon: Calendar },
  'location':    { label: 'Escritório',  color: '#14b8a6', bg: 'rgba(20,184,166,0.1)',   Icon: MapPin },
  'default':     { label: 'Actividade',  color: '#6b7a99', bg: 'rgba(107,114,153,0.1)', Icon: Activity },
}

const ACTION_VERBS: Record<string, string> = {
  'create': 'criou', 'created': 'criou',
  'update': 'atualizou', 'updated': 'atualizou',
  'delete': 'eliminou', 'deleted': 'eliminou',
  'archive': 'arquivou', 'complete': 'completou', 'completed': 'completou',
  'assign': 'atribuiu', 'invite': 'convidou',
}

const ENTITY_LABELS: Record<string, string> = {
  'Contact': 'um contacto', 'Property': 'uma propriedade', 'Opportunity': 'uma oportunidade',
  'Task': 'uma tarefa', 'Location': 'um escritório', 'Appointment': 'um agendamento',
}

const FILTERS = [
  { label: 'Todos', key: '' },
  { label: 'Contactos', key: 'contact' },
  { label: 'Propriedades', key: 'property' },
  { label: 'Oportunidades', key: 'opportunity' },
  { label: 'Tarefas', key: 'task' },
  { label: 'Escritórios', key: 'location' },
]

const getConfig = (action: string) => {
  const prefix = action?.split('.')?.[0]?.toLowerCase() || ''
  return ACTION_CONFIG[prefix] || ACTION_CONFIG['default']
}

const getDescription = (item: ActivityLog, userName?: string) => {
  const parts = item.action?.split('.') || []
  const prefix = parts[0] || ''
  const verb = ACTION_VERBS[parts[1]] || parts[1] || 'registou'
  const entity = ENTITY_LABELS[item.entityType || ''] || prefix
  const who = userName ? `${userName} ` : ''
  const name = item.metadata?.name ? ` "${item.metadata.name}"` : ''
  return `${who}${verb} ${entity}${name}`
}

export const ActivityPage: React.FC = () => {
  const [items, setItems] = useState<ActivityLog[]>([])
  const [usersMap, setUsersMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [page, setPage] = useState(1)
  const PER_PAGE = 20

  const load = async () => {
    setLoading(true)
    try {
      const [actRes, usersRes] = await Promise.all([
        getActivity({ limit: 200 }),
        getUsers(),
      ])
      const data = actRes.data
      setItems(Array.isArray(data) ? data : data?.data ?? [])

      // Build userId → name map
      const users = Array.isArray(usersRes.data) ? usersRes.data : []
      const map: Record<string, string> = {}
      users.forEach((u: any) => { map[u.id] = u.name })
      setUsersMap(map)
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = items.filter(item => {
    if (!filter) return true
    return item.action?.toLowerCase().startsWith(filter)
  })

  const paginated = filtered.slice(0, page * PER_PAGE)

  return (
    <div style={{ padding: '28px 32px', maxWidth: 860, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Activity size={20} style={{ color: '#6366f1' }} />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0f2553', margin: 0, letterSpacing: '-0.02em' }}>Actividade</h1>
            <p style={{ fontSize: 13, color: '#6b7a99', margin: 0 }}>Registo de actividade da agência</p>
          </div>
        </div>
        <button onClick={() => { setPage(1); load() }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 9, border: '1px solid #e5e9f2', background: '#fff', color: '#6b7a99', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
          <RefreshCw size={13} /> Atualizar
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => { setFilter(f.key); setPage(1) }}
            style={{ padding: '6px 14px', borderRadius: 20, border: filter === f.key ? '1.5px solid #6366f1' : '1px solid #e5e9f2', background: filter === f.key ? 'rgba(99,102,241,0.08)' : '#fff', color: filter === f.key ? '#6366f1' : '#6b7a99', fontSize: 12, fontWeight: filter === f.key ? 600 : 400, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
            {f.label}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#6b7a99' }}>{filtered.length} registos</span>
      </div>

      {loading ? <PageSpinner /> : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#6b7a99' }}>
          <Activity size={40} style={{ opacity: 0.25, marginBottom: 12 }} />
          <p style={{ fontSize: 14 }}>Nenhuma actividade encontrada.</p>
          <p style={{ fontSize: 12, marginTop: 4 }}>A actividade é registada automaticamente à medida que usa o CRM.</p>
        </div>
      ) : (
        <>
          <div style={{ position: 'relative', paddingLeft: 24 }}>
            <div style={{ position: 'absolute', left: 19, top: 0, bottom: 0, width: 2, background: '#e5e9f2' }} />

            {paginated.map(item => {
              const cfg = getConfig(item.action)
              const Icon = cfg.Icon
              const userName = item.userId ? usersMap[item.userId] : undefined
              const description = getDescription(item, userName)

              return (
                <div key={item.id} style={{ position: 'relative', paddingLeft: 32, paddingBottom: 16 }}>
                  <div style={{ position: 'absolute', left: -1, top: 3, width: 20, height: 20, borderRadius: '50%', background: cfg.bg, border: `2px solid ${cfg.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={10} style={{ color: cfg.color }} />
                  </div>

                  <div style={{ background: '#fff', border: '1px solid #e5e9f2', borderRadius: 10, padding: '11px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: cfg.color, background: cfg.bg, padding: '2px 7px', borderRadius: 5 }}>
                            {cfg.label}
                          </span>
                          <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#9ca3af' }}>{item.action}</span>
                        </div>
                        <p style={{ fontSize: 13, color: '#374151', margin: 0, lineHeight: 1.5, textTransform: 'capitalize' }}>
                          {description}
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                        <Clock size={11} style={{ color: '#9ca3af' }} />
                        <span style={{ fontSize: 11, color: '#9ca3af', whiteSpace: 'nowrap' }}>{formatDate(item.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {paginated.length < filtered.length && (
            <div style={{ textAlign: 'center', marginTop: 8 }}>
              <button onClick={() => setPage(p => p + 1)} style={{ padding: '9px 20px', borderRadius: 9, border: '1px solid #e5e9f2', background: '#fff', color: '#6366f1', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Ver mais ({filtered.length - paginated.length} restantes)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
