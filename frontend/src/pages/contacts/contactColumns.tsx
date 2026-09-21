import type { ColumnDef } from '@tanstack/react-table'
import { Mail, Phone as PhoneIcon, Edit, Trash2 } from 'lucide-react'
import type { Contact } from '../../types'
import { CONTACT_TYPE_LABELS, CONTACT_STATUS_LABELS } from '../../utils/constants'

/**
 * Column definitions for the contacts table.
 *
 * Kept out of the page component so the row renderer stays cheap: these are
 * built once and memoised, rather than reallocated on every state change,
 * which would defeat the row memoisation the virtualiser depends on.
 */

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  NEW: { bg: 'var(--accent-soft)', color: 'var(--accent)' },
  QUALIFIED: { bg: 'rgba(18,128,64,0.10)', color: 'var(--success)' },
  CONTACTED: { bg: 'rgba(166,90,5,0.10)', color: 'var(--warning)' },
  INACTIVE: { bg: 'var(--surface-3)', color: 'var(--text-muted)' },
}

const TYPE_STYLE: Record<string, { bg: string; color: string }> = {
  LEAD: { bg: 'var(--accent-soft)', color: 'var(--accent)' },
  PROSPECT: { bg: 'rgba(166,90,5,0.10)', color: 'var(--warning)' },
  CLIENT: { bg: 'rgba(18,128,64,0.10)', color: 'var(--success)' },
  PARTNER: { bg: 'var(--surface-3)', color: 'var(--text-secondary)' },
}

export const getInitials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join('')

export const avatarColor = (name: string) => {
  // Navy through to cyan: tints of the brand, not an unrelated rainbow.
  const palette = ['#143253', '#1E4570', '#2C5F8F', '#3D7BA8', '#0076A8', '#4E6E92']
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return palette[Math.abs(hash) % palette.length]
}

function Pill({ label, bg, color }: { label: string; bg: string; color: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 5,
        fontSize: 11,
        fontWeight: 600,
        background: bg,
        color,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  )
}

function Avatar({ name, size = 26 }: { name: string; size?: number }) {
  return (
    <div
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        flexShrink: 0,
        background: avatarColor(name),
        color: '#fff',
        display: 'grid',
        placeItems: 'center',
        fontSize: size < 24 ? 9 : 10,
        fontWeight: 700,
      }}
    >
      {getInitials(name)}
    </div>
  )
}

const formatDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'

export function buildContactColumns(opts: {
  onEdit: (c: Contact) => void
  onDelete: (id: string) => void
}): ColumnDef<Contact, any>[] {
  return [
    {
      id: 'name',
      header: 'Nome',
      size: 220,
      cell: ({ row }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
          <Avatar name={row.original.name} />
          <span
            style={{
              fontWeight: 600,
              color: 'var(--text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {row.original.name}
          </span>
        </div>
      ),
    },
    {
      id: 'contact',
      header: 'Contacto',
      size: 230,
      cell: ({ row }) => {
        const { email, phone } = row.original
        if (!email && !phone) return <span style={{ color: 'var(--text-muted)' }}>—</span>
        return (
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: 'var(--text-secondary)',
              overflow: 'hidden',
            }}
          >
            {email ? <Mail size={11} style={{ flexShrink: 0, color: 'var(--text-muted)' }} /> : null}
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{email || phone}</span>
            {email && phone && (
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  flexShrink: 0,
                }}
              >
                <PhoneIcon size={10} />
                {phone}
              </span>
            )}
          </span>
        )
      },
    },
    {
      id: 'type',
      header: 'Tipo',
      size: 100,
      cell: ({ row }) => {
        const s = TYPE_STYLE[row.original.type] ?? TYPE_STYLE.LEAD
        return <Pill label={CONTACT_TYPE_LABELS[row.original.type] ?? row.original.type} {...s} />
      },
    },
    {
      id: 'status',
      header: 'Estado',
      size: 110,
      cell: ({ row }) => {
        const s = STATUS_STYLE[row.original.status] ?? STATUS_STYLE.NEW
        return <Pill label={CONTACT_STATUS_LABELS[row.original.status] ?? row.original.status} {...s} />
      },
    },
    {
      id: 'source',
      header: 'Origem',
      size: 120,
      cell: ({ row }) => (
        <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
          {row.original.source || '—'}
        </span>
      ),
    },
    {
      id: 'assignedTo',
      header: 'Responsável',
      size: 160,
      cell: ({ row }) => {
        const a = row.original.assignedTo
        if (!a) return <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
        return (
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
            <Avatar name={a.name} size={20} />
            <span
              style={{
                fontSize: 12,
                color: 'var(--text-secondary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {a.name}
            </span>
          </span>
        )
      },
    },
    {
      id: 'createdAt',
      header: 'Criado',
      size: 100,
      cell: ({ row }) => (
        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
          {formatDate(row.original.createdAt)}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      size: 76,
      cell: ({ row }) => (
        <span
          className="row-actions"
          onClick={(e) => e.stopPropagation()}
          style={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}
        >
          <RowAction label="Editar" onClick={() => opts.onEdit(row.original)}>
            <Edit size={14} />
          </RowAction>
          <RowAction label="Eliminar" danger onClick={() => opts.onDelete(row.original.id)}>
            <Trash2 size={14} />
          </RowAction>
        </span>
      ),
    },
  ]
}

function RowAction({
  label,
  onClick,
  danger,
  children,
}: {
  label: string
  onClick: () => void
  danger?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      style={{
        width: 26,
        height: 26,
        display: 'grid',
        placeItems: 'center',
        border: 'none',
        borderRadius: 5,
        background: 'transparent',
        color: 'var(--text-muted)',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = danger ? 'rgba(200,30,30,0.08)' : 'var(--accent-soft)'
        e.currentTarget.style.color = danger ? 'var(--danger)' : 'var(--accent)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent'
        e.currentTarget.style.color = 'var(--text-muted)'
      }}
    >
      {children}
    </button>
  )
}
