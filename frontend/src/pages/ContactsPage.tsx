import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, ChevronLeft, ChevronRight, Trash2, Edit, Download, X, Upload, Mail, Phone as PhoneIcon } from 'lucide-react'
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

const TH = ({ children, right }: { children: React.ReactNode; right?: boolean }) => (
  <th style={{
    padding: '0 14px', height: 44, textAlign: right ? 'right' : 'left',
    fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em',
    color: 'var(--text-muted)', whiteSpace: 'nowrap',
    background: 'var(--surface-2)', borderBottom: '1px solid var(--border)',
    position: 'sticky', top: 0, zIndex: 1,
    fontFamily: 'var(--font-body)',
  }}>
    {children}
  </th>
)

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
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)
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
        page, limit,
      })
      const d = res.data
      if (Array.isArray(d)) { setContacts(d); setTotal(d.length) }
      else { setContacts(d.data || []); setTotal(d.total || 0) }
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

        {hasFilters && (
          <button
            onClick={() => { setSearch(''); setTypeFilter(''); setStatusFilter(''); setSourceFilter('') }}
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
        {/* ── Mobile cards (hidden on sm+) ── */}
        <div className="sm:hidden" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {contacts.map(contact => {
            const st = STATUS_STYLE[contact.status] ?? STATUS_STYLE.NEW
            const tp = TYPE_STYLE[contact.type] ?? TYPE_STYLE.BUYER
            const color = avatarColor(contact.name)
            return (
              <div
                key={contact.id}
                onClick={() => navigate(`/contacts/${contact.id}`)}
                style={{
                  background: 'var(--surface)', borderRadius: 12,
                  border: '1px solid var(--border)', padding: '12px 14px',
                  display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                  background: color, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700,
                }}>
                  {getInitials(contact.name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {contact.name}
                  </p>
                  {contact.phone && (
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <PhoneIcon size={10} /> {contact.phone}
                    </p>
                  )}
                  {contact.email && !contact.phone && (
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {contact.email}
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                    <Pill bg={tp.bg} color={tp.color} label={tp.label} />
                    <Pill bg={st.bg} color={st.color} label={st.label} />
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => { setEditContact(contact); setShowModal(true) }}
                    style={{ padding: 8, borderRadius: 8, border: 'none', background: 'var(--surface-2)', cursor: 'pointer', color: 'var(--text-muted)', minHeight: 36, minWidth: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Edit size={14} />
                  </button>
                  <button
                    onClick={() => setDeleteId(contact.id)}
                    style={{ padding: 8, borderRadius: 8, border: 'none', background: 'var(--surface-2)', cursor: 'pointer', color: 'var(--danger)', minHeight: 36, minWidth: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          })}
          {/* Pagination mobile */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '8px 0' }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.4 : 1, fontSize: 13, color: 'var(--text-primary)' }}>
                ← Anterior
              </button>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.4 : 1, fontSize: 13, color: 'var(--text-primary)' }}>
                Próxima →
              </button>
            </div>
          )}
        </div>

        {/* ── Desktop table (hidden on mobile) ── */}
        <div className="hidden sm:block" style={{
          borderRadius: 12, overflow: 'hidden',
          border: '1px solid var(--border)',
          background: 'var(--surface)',
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
                  const isHovered = hoveredRow === contact.id
                  return (
                    <tr
                      key={contact.id}
                      onClick={() => navigate(`/contacts/${contact.id}`)}
                      onMouseEnter={() => setHoveredRow(contact.id)}
                      onMouseLeave={() => setHoveredRow(null)}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        cursor: 'pointer',
                        background: isHovered ? 'var(--surface-3)' : 'var(--surface)',
                        transition: 'background 120ms',
                      }}
                    >
                      {/* Nome + avatar */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                            background: color, color: '#fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 11, fontWeight: 700, letterSpacing: '0.03em',
                          }}>
                            {getInitials(contact.name)}
                          </div>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                            {contact.name}
                          </span>
                        </div>
                      </td>

                      {/* Email / telefone */}
                      <td style={{ padding: '12px 14px' }}>
                        {contact.email && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                            <Mail size={11} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                            {contact.email}
                          </div>
                        )}
                        {contact.phone && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                            <PhoneIcon size={10} style={{ flexShrink: 0 }} />
                            {contact.phone}
                          </div>
                        )}
                        {!contact.email && !contact.phone && <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        <Pill bg={tp.bg} color={tp.color} label={tp.label} />
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <Pill bg={st.bg} color={st.color} label={st.label} />
                      </td>
                      <td style={{ padding: '12px 14px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', fontSize: 12 }}>
                        {contact.source || '—'}
                      </td>
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                        {contact.assignedTo ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{
                              width: 22, height: 22, borderRadius: '50%',
                              background: avatarColor(contact.assignedTo.name),
                              color: '#fff', fontSize: 9, fontWeight: 700,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              flexShrink: 0,
                            }}>
                              {getInitials(contact.assignedTo.name)}
                            </div>
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{contact.assignedTo.name}</span>
                          </div>
                        ) : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>}
                      </td>
                      <td style={{ padding: '12px 14px', color: 'var(--text-muted)', whiteSpace: 'nowrap', fontSize: 12 }}>
                        {formatDate(contact.createdAt)}
                      </td>

                      {/* Ações — visíveis só no hover */}
                      <td style={{ padding: '12px 14px' }}>
                        <div
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2,
                            opacity: isHovered ? 1 : 0,
                            transition: 'opacity 120ms',
                          }}
                          onClick={e => e.stopPropagation()}
                        >
                          <button
                            onClick={() => { setEditContact(contact); setShowModal(true) }}
                            title="Editar"
                            style={{ padding: 6, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-soft)'; e.currentTarget.style.color = 'var(--accent)' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => setDeleteId(contact.id)}
                            title="Eliminar"
                            style={{ padding: 6, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(220,38,38,0.08)'; e.currentTarget.style.color = 'var(--danger)' }}
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

          {/* Pagination */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 16px', borderTop: '1px solid var(--border)',
          }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {total === 0 ? '0 contactos' : `Mostrando ${(page - 1) * limit + 1}–${Math.min(page * limit, total)} de ${total} contactos`}
            </span>
            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{
                    width: 30, height: 30, borderRadius: 6, border: 'none', background: 'transparent',
                    cursor: page === 1 ? 'not-allowed' : 'pointer',
                    color: page === 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                    opacity: page === 1 ? 0.4 : 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <ChevronLeft size={15} />
                </button>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '0 6px' }}>
                  Página {page} de {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  style={{
                    width: 30, height: 30, borderRadius: 6, border: 'none', background: 'transparent',
                    cursor: page === totalPages ? 'not-allowed' : 'pointer',
                    color: page === totalPages ? 'var(--text-muted)' : 'var(--text-primary)',
                    opacity: page === totalPages ? 0.4 : 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            )}
          </div>
        </div>
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
