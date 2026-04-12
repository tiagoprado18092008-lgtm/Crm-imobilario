import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, ChevronLeft, ChevronRight, Trash2, Edit, Download, X, Upload } from 'lucide-react'
import { getContacts, deleteContact } from '../api/contacts.api'
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
import { formatDate } from '../utils/formatters'
import { CONTACT_STATUS_LABELS, CONTACT_TYPE_LABELS, SOURCE_OPTIONS } from '../utils/constants'

// ── helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  const parts = name.trim().split(' ')
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?'
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const AVATAR_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#3b82f6', '#ef4444', '#14b8a6',
]
function avatarColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  NEW:       { bg: '#eff6ff', color: '#2563eb', label: 'Novo' },
  QUALIFIED: { bg: '#f0fdf4', color: '#16a34a', label: 'Qualificado' },
  CONTACTED: { bg: '#fffbeb', color: '#d97706', label: 'Contactado' },
  INACTIVE:  { bg: '#f9fafb', color: '#6b7280', label: 'Inativo' },
}
const TYPE_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  BUYER:   { bg: '#eff6ff', color: '#2563eb', label: 'Comprador' },
  OWNER:   { bg: '#fdf4ff', color: '#9333ea', label: 'Proprietário' },
  PARTNER: { bg: '#fff7ed', color: '#ea580c', label: 'Parceiro' },
}

function Pill({ bg, color, label }: { bg: string; color: string; label: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 8px', borderRadius: 20,
      fontSize: 11, fontWeight: 600,
      background: bg, color,
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  )
}

// ── page ─────────────────────────────────────────────────────────────────────

export const ContactsPage: React.FC = () => {
  const navigate = useNavigate()
  const { showToast } = useUIStore()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [editContact, setEditContact] = useState<Contact | undefined>()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const limit = 20

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const fetchContacts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getContacts({
        search: debouncedSearch || undefined,
        type: typeFilter || undefined,
        status: statusFilter || undefined,
        source: sourceFilter || undefined,
        page,
        limit,
      })
      const d = res.data
      if (Array.isArray(d)) {
        setContacts(d); setTotal(d.length)
      } else {
        setContacts(d.data || []); setTotal(d.total || 0)
      }
    } catch {
      showToast('Erro ao carregar contactos', 'error')
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, typeFilter, statusFilter, sourceFilter, page])

  useEffect(() => { fetchContacts() }, [fetchContacts])
  useEffect(() => { setPage(1) }, [debouncedSearch, typeFilter, statusFilter, sourceFilter])

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await deleteContact(deleteId)
      setContacts(prev => prev.filter(c => c.id !== deleteId))
      setTotal(prev => prev - 1)
      showToast('Contacto eliminado', 'success')
      setDeleteId(null)
    } catch {
      showToast('Erro ao eliminar contacto', 'error')
    }
  }

  const closeModal = () => { setShowModal(false); setEditContact(undefined) }

  const hasFilters = !!(typeFilter || statusFilter || sourceFilter || debouncedSearch)
  const totalPages = Math.ceil(total / limit)

  const TH = ({ children, right }: { children: React.ReactNode; right?: boolean }) => (
    <th style={{
      padding: '0 12px', height: 44, textAlign: right ? 'right' : 'left',
      fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em',
      color: 'var(--text-muted)', whiteSpace: 'nowrap',
      background: 'var(--hover-bg)', borderBottom: '1px solid var(--border-color)',
      position: 'sticky', top: 0, zIndex: 1,
    }}>
      {children}
    </th>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Toolbar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 180 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Pesquisar contactos..."
            style={{
              width: '100%', paddingLeft: 32, paddingRight: 10, height: 34,
              borderRadius: 8, fontSize: 13,
              border: '1px solid var(--input-border)', background: 'var(--input-bg)',
              color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box',
            }}
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

        {hasFilters && (
          <button
            onClick={() => { setSearch(''); setTypeFilter(''); setStatusFilter(''); setSourceFilter('') }}
            style={{
              display: 'flex', alignItems: 'center', gap: 4, height: 34,
              padding: '0 10px', borderRadius: 8, fontSize: 12, fontWeight: 500,
              border: '1px solid var(--border-color)', background: 'transparent',
              color: 'var(--text-muted)', cursor: 'pointer',
            }}
          >
            <X size={12} /> Limpar
          </button>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <Button variant="secondary" size="sm" onClick={() => setShowImport(true)}>
            <Upload className="w-4 h-4" /> Importar
          </Button>
          <Button variant="secondary" size="sm"
            onClick={async () => {
              try { const res = await exportContacts(); downloadBlob(res.data, 'contactos.csv'); showToast('CSV exportado', 'success') }
              catch { showToast('Erro ao exportar', 'error') }
            }}
          >
            <Download className="w-4 h-4" /> Exportar
          </Button>
          <Button size="sm" onClick={() => { setEditContact(undefined); setShowModal(true) }}>
            <Plus className="w-4 h-4" /> Novo Contacto
          </Button>
        </div>
      </div>

      {/* Table */}
      {loading ? <PageSpinner /> : contacts.length === 0 ? (
        <EmptyState
          title={hasFilters ? 'Sem resultados' : 'Nenhum contacto encontrado'}
          description={hasFilters ? 'Tente ajustar os filtros.' : 'Crie o seu primeiro contacto.'}
          actionLabel="Novo Contacto"
          onAction={() => { setEditContact(undefined); setShowModal(true) }}
        />
      ) : (
        <div style={{
          borderRadius: 12, overflow: 'hidden',
          border: '1px solid var(--border-color)',
          background: 'var(--bg-card)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}>
          <div style={{ overflowX: 'auto', maxHeight: 'calc(100vh - 240px)', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <TH>Nome</TH>
                  <TH>Contacto</TH>
                  <TH>Tipo</TH>
                  <TH>Estado</TH>
                  <TH>Origem</TH>
                  <TH>Responsável</TH>
                  <TH>Criado</TH>
                  <TH right>Ações</TH>
                </tr>
              </thead>
              <tbody>
                {contacts.map(contact => {
                  const st = STATUS_STYLE[contact.status] ?? STATUS_STYLE.NEW
                  const tp = TYPE_STYLE[contact.type] ?? TYPE_STYLE.BUYER
                  const color = avatarColor(contact.name)
                  return (
                    <tr
                      key={contact.id}
                      onClick={() => navigate(`/contacts/${contact.id}`)}
                      style={{ borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover-bg)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Nome + avatar */}
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                            background: color, color: '#fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 11, fontWeight: 700, letterSpacing: '0.03em',
                          }}>
                            {getInitials(contact.name)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                              {contact.name}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Email / telefone */}
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                          {contact.email || '-'}
                        </div>
                        {contact.phone && (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                            {contact.phone}
                          </div>
                        )}
                      </td>

                      <td style={{ padding: '10px 12px' }}>
                        <Pill bg={tp.bg} color={tp.color} label={tp.label} />
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <Pill bg={st.bg} color={st.color} label={st.label} />
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {contact.source || '-'}
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {contact.assignedTo?.name || '-'}
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {formatDate(contact.createdAt)}
                      </td>

                      {/* Ações */}
                      <td style={{ padding: '10px 12px' }}>
                        <div
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2 }}
                          onClick={e => e.stopPropagation()}
                        >
                          <button
                            onClick={() => { setEditContact(contact); setShowModal(true) }}
                            title="Editar"
                            style={{
                              padding: 6, borderRadius: 6, border: 'none',
                              background: 'transparent', cursor: 'pointer',
                              color: 'var(--text-muted)',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.color = '#2563eb' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => setDeleteId(contact.id)}
                            title="Eliminar"
                            style={{
                              padding: 6, borderRadius: 6, border: 'none',
                              background: 'transparent', cursor: 'pointer',
                              color: 'var(--text-muted)',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#dc2626' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination + count */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 16px', borderTop: '1px solid var(--border-color)',
          }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {total === 0 ? '0 contactos' : `${(page - 1) * limit + 1}–${Math.min(page * limit, total)} de ${total}`}
            </span>
            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{
                    padding: 6, borderRadius: 6, border: 'none', background: 'transparent',
                    cursor: page === 1 ? 'not-allowed' : 'pointer',
                    color: page === 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                    opacity: page === 1 ? 0.4 : 1,
                  }}
                >
                  <ChevronLeft size={15} />
                </button>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '0 6px' }}>
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  style={{
                    padding: 6, borderRadius: 6, border: 'none', background: 'transparent',
                    cursor: page === totalPages ? 'not-allowed' : 'pointer',
                    color: page === totalPages ? 'var(--text-muted)' : 'var(--text-primary)',
                    opacity: page === totalPages ? 0.4 : 1,
                  }}
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={editContact ? 'Editar Contacto' : 'Novo Contacto'}
        size="xl"
      >
        <ContactForm
          contact={editContact}
          onSuccess={() => { closeModal(); fetchContacts() }}
          onCancel={closeModal}
        />
      </Modal>

      {/* Delete Confirmation */}
      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Confirmar Eliminação" size="sm">
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
          Tem a certeza que deseja eliminar este contacto? Esta ação não pode ser desfeita.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancelar</Button>
          <Button variant="danger" onClick={handleDelete}>Eliminar</Button>
        </div>
      </Modal>

      {showImport && (
        <ImportModal
          type="contacts"
          onClose={() => setShowImport(false)}
          onSuccess={() => { setShowImport(false); fetchContacts() }}
        />
      )}
    </div>
  )
}
