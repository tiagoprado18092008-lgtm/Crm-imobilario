import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Trash2, Edit, Download, X, Upload, MoreHorizontal } from 'lucide-react'
import { useIsMobile } from '../hooks/useIsMobile'
import { DataTable } from '../components/data-table/DataTable'
import { buildContactColumns } from './contacts/contactColumns'
import { useContactsList } from '../hooks/useContactsList'
import { deleteContact } from '../api/contacts.api'
import { ImportModal } from '../components/import/ImportModal'
import { exportContacts } from '../api/exports.api'
import { downloadBlob } from '../utils/download'
import type { Contact } from '../types'
import { Button } from '../components/ui/Button'
import { CustomSelect } from '../components/ui/CustomSelect'
import { Modal } from '../components/ui/Modal'
import { EmptyState } from '../components/ui/EmptyState'
import { PageSpinner } from '../components/ui/Spinner'
import { ContactForm } from '../components/contacts/ContactForm'
import { useUIStore } from '../store/ui.store'
import { CONTACT_STATUS_LABELS, CONTACT_TYPE_LABELS, SOURCE_OPTIONS } from '../utils/constants'

function getInitials(name: string) {
  const parts = name.trim().split(' ')
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?'
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const AVATAR_COLORS = [
  '#2E6BE6', '#7C3AED', '#EC4899', '#D97706',
  '#16A34A', '#0891B2', '#DC2626', '#0D9488',
]
function avatarColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  NEW:       { bg: 'var(--surface-3)',           color: 'var(--text-secondary)', label: 'Novo' },
  QUALIFIED: { bg: 'rgba(22,163,74,0.1)',        color: 'var(--success)',        label: 'Qualificado' },
  CONTACTED: { bg: 'rgba(217,119,6,0.1)',        color: 'var(--warning)',        label: 'Contactado' },
  INACTIVE:  { bg: 'var(--surface-3)',           color: 'var(--text-muted)',     label: 'Inativo' },
}
const TYPE_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  BUYER:   { bg: 'var(--accent-soft)',           color: 'var(--accent)',  label: 'Comprador' },
  OWNER:   { bg: 'rgba(124,58,237,0.1)',         color: '#7C3AED',       label: 'Proprietário' },
  PARTNER: { bg: 'rgba(217,119,6,0.1)',          color: 'var(--warning)', label: 'Parceiro' },
}

function Pill({ bg, color, label }: { bg: string; color: string; label: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 10px', borderRadius: 20,
      fontSize: 11, fontWeight: 600,
      background: bg, color,
      whiteSpace: 'nowrap',
      fontFamily: 'var(--font-body)',
    }}>
      {label}
    </span>
  )
}

const ContactCard: React.FC<{
  contact: Contact
  onEdit: () => void
  onDelete: () => void
  onClick: () => void
}> = ({ contact, onEdit, onDelete, onClick }) => {
  const [menuOpen, setMenuOpen] = useState(false)
  const initials = getInitials(contact.name)
  const color = avatarColor(contact.name)
  const status = STATUS_STYLE[contact.status] || STATUS_STYLE.NEW
  const type = TYPE_STYLE[contact.type || '']

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        cursor: 'pointer',
        position: 'relative',
      }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
        background: color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontWeight: 700, fontSize: 14,
      }}>
        {initials}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {contact.name}
          </span>
          <Pill bg={status.bg} color={status.color} label={status.label} />
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {contact.email || contact.phone || '—'}
        </div>
        {type && (
          <div style={{ marginTop: 4 }}>
            <Pill bg={type.bg} color={type.color} label={type.label} />
          </div>
        )}
      </div>

      <div style={{ position: 'relative', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
        <button
          onClick={() => setMenuOpen(o => !o)}
          style={{
            width: 32, height: 32, borderRadius: 8, border: 'none',
            background: 'var(--surface-3)', color: 'var(--text-muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <MoreHorizontal size={16} />
        </button>
        {menuOpen && (
          <div style={{
            position: 'absolute', right: 0, top: '100%', marginTop: 4, zIndex: 50,
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            overflow: 'hidden', minWidth: 140,
          }}>
            <button
              onClick={() => { setMenuOpen(false); onEdit() }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', fontSize: 13, color: 'var(--text-primary)', border: 'none', background: 'none', cursor: 'pointer' }}
            >
              <Edit size={13} /> Editar
            </button>
            <button
              onClick={() => { setMenuOpen(false); onDelete() }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', fontSize: 13, color: 'var(--danger)', border: 'none', background: 'none', cursor: 'pointer' }}
            >
              <Trash2 size={13} /> Eliminar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}


export const ContactsPage: React.FC = () => {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const { showToast } = useUIStore()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [editContact, setEditContact] = useState<Contact | undefined>()
  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const filters = useMemo(() => ({
    search: debouncedSearch || undefined,
    type: typeFilter || undefined,
    status: statusFilter || undefined,
    source: sourceFilter || undefined,
    tag: tagFilter || undefined,
  }), [debouncedSearch, typeFilter, statusFilter, sourceFilter, tagFilter])

  const {
    contacts, isLoading: loading, isFetchingNextPage, hasNextPage, fetchNextPage, refetch,
  } = useContactsList(filters)

  const columns = useMemo(
    () => buildContactColumns({
      onEdit: (c) => { setEditContact(c); setShowModal(true) },
      onDelete: (id) => setDeleteId(id),
    }),
    [],
  )

  const fetchContacts = useCallback(() => { refetch() }, [refetch])

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await deleteContact(deleteId)
      // Refetch rather than splice: the list is paged, so the local array is
      // only the part that has been scrolled into view.
      refetch()
      showToast('Contacto eliminado', 'success')
      setDeleteId(null)
    } catch {
      showToast('Erro ao eliminar contacto', 'error')
    }
  }

  const closeModal = () => { setShowModal(false); setEditContact(undefined) }
  const hasFilters = !!(typeFilter || statusFilter || sourceFilter || tagFilter || debouncedSearch)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontFamily: 'var(--font-body)' }}>

      {/* Toolbar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 180 }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Pesquisar por nome, email ou telefone..."
            style={{
              width: '100%', paddingLeft: 34, paddingRight: 10, height: 40,
              borderRadius: 8, fontSize: 13,
              border: '1px solid var(--border)', background: 'var(--surface)',
              color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box',
              fontFamily: 'var(--font-body)',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(46,107,230,0.12)' }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' }}
          />
        </div>

        <div style={{ width: 150 }}>
          <CustomSelect value={typeFilter} onChange={setTypeFilter} size="sm"
            options={[{ value: '', label: 'Todos os tipos' }, ...Object.entries(CONTACT_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l as string }))]}
          />
        </div>
        <div style={{ width: 160 }}>
          <CustomSelect value={statusFilter} onChange={setStatusFilter} size="sm"
            options={[{ value: '', label: 'Todos os estados' }, ...Object.entries(CONTACT_STATUS_LABELS).map(([v, l]) => ({ value: v, label: l as string }))]}
          />
        </div>
        <div style={{ width: 170 }}>
          <CustomSelect value={sourceFilter} onChange={setSourceFilter} size="sm" searchable
            options={[{ value: '', label: 'Todas as origens' }, ...SOURCE_OPTIONS.map(s => ({ value: s, label: s }))]}
          />
        </div>
        <div style={{ position: 'relative', width: 140 }}>
          <input
            value={tagFilter}
            onChange={e => setTagFilter(e.target.value)}
            placeholder="Filtrar por tag..."
            style={{
              width: '100%', paddingLeft: 10, paddingRight: 10, height: 40,
              borderRadius: 8, fontSize: 13,
              border: '1px solid var(--border)', background: 'var(--surface)',
              color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box',
              fontFamily: 'var(--font-body)',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(46,107,230,0.12)' }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' }}
          />
        </div>

        {hasFilters && (
          <button
            onClick={() => { setSearch(''); setTypeFilter(''); setStatusFilter(''); setSourceFilter(''); setTagFilter('') }}
            style={{
              display: 'flex', alignItems: 'center', gap: 4, height: 40,
              padding: '0 12px', borderRadius: 8, fontSize: 12, fontWeight: 500,
              border: '1px solid var(--border)', background: 'transparent',
              color: 'var(--text-muted)', cursor: 'pointer',
              fontFamily: 'var(--font-body)',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-3)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <X size={12} /> Limpar filtros
          </button>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <Button variant="secondary" size="sm" onClick={() => setShowImport(true)}>
            <Upload size={14} /> Importar
          </Button>
          <Button variant="secondary" size="sm"
            onClick={async () => {
              try { const res = await exportContacts(); downloadBlob(res.data, 'contactos.csv'); showToast('CSV exportado', 'success') }
              catch { showToast('Erro ao exportar', 'error') }
            }}
          >
            <Download size={14} /> Exportar
          </Button>
          <Button size="sm" onClick={() => { setEditContact(undefined); setShowModal(true) }}>
            <Plus size={14} /> Novo Contacto
          </Button>
        </div>
      </div>

      {/* Table / Cards */}
      {loading ? <PageSpinner /> : contacts.length === 0 ? (
        <EmptyState
          title={hasFilters ? 'Sem resultados' : 'Nenhum contacto encontrado'}
          description={hasFilters ? 'Tente ajustar os filtros.' : 'Crie o seu primeiro contacto para começar.'}
          actionLabel="Novo Contacto"
          onAction={() => { setEditContact(undefined); setShowModal(true) }}
        />
      ) : (
        <>
        {isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {contacts.map(contact => (
              <ContactCard
                key={contact.id}
                contact={contact}
                onClick={() => navigate(`/contacts/${contact.id}`)}
                onEdit={() => { setEditContact(contact); setShowModal(true) }}
                onDelete={() => setDeleteId(contact.id)}
              />
            ))}
          </div>
        ) : (
        <div style={{
          borderRadius: 12, overflow: 'hidden',
          border: '1px solid var(--border)',
          background: 'var(--surface)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}>
          <div style={{ height: 'calc(100vh - 250px)', minHeight: 320 }}>
            <DataTable
              data={contacts}
              columns={columns}
              getRowId={(c) => c.id}
              onRowClick={(c) => navigate(`/contacts/${c.id}`)}
              onEndReached={() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage() }}
              isLoading={isFetchingNextPage}
            />
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '9px 16px', borderTop: '1px solid var(--border)',
          }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {contacts.length === 0
                ? 'Sem contactos'
                : `${contacts.length} contacto${contacts.length === 1 ? '' : 's'}${hasNextPage ? ' carregados' : ''}`}
            </span>
            {hasNextPage && (
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {isFetchingNextPage ? 'A carregar mais…' : 'Continua ao deslizar'}
              </span>
            )}
          </div>
        </div>
        )}
        </>
      )}

      {/* Create / Edit Modal */}
      <Modal isOpen={showModal} onClose={closeModal} title={editContact ? 'Editar Contacto' : 'Novo Contacto'} size="xl">
        <ContactForm contact={editContact} onSuccess={() => { closeModal(); fetchContacts() }} onCancel={closeModal} />
      </Modal>

      {/* Delete Confirmation */}
      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Confirmar Eliminação" size="sm">
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.5 }}>
          Tem a certeza que deseja eliminar este contacto? Esta ação não pode ser desfeita.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancelar</Button>
          <Button variant="danger" onClick={handleDelete}>Eliminar</Button>
        </div>
      </Modal>

      {showImport && (
        <ImportModal type="contacts" onClose={() => setShowImport(false)} onSuccess={() => { setShowImport(false); fetchContacts() }} />
      )}
    </div>
  )
}
