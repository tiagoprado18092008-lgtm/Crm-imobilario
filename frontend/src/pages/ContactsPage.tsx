import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, ChevronLeft, ChevronRight, Trash2, Edit, Download } from 'lucide-react'
import { getContacts, deleteContact } from '../api/contacts.api'
import { exportContacts } from '../api/exports.api'
import { downloadBlob } from '../utils/download'
import type { Contact } from '../types'
import { Button } from '../components/ui/Button'
import { CustomSelect } from '../components/ui/CustomSelect'
import { Badge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { EmptyState } from '../components/ui/EmptyState'
import { PageSpinner } from '../components/ui/Spinner'
import { ContactForm } from '../components/contacts/ContactForm'
import { useUIStore } from '../store/ui.store'
import { formatDate } from '../utils/formatters'
import {
  CONTACT_STATUS_LABELS,
  CONTACT_TYPE_LABELS,
  SOURCE_OPTIONS
} from '../utils/constants'

const statusVariant: Record<string, 'success' | 'info' | 'warning' | 'default'> = {
  NEW: 'info',
  QUALIFIED: 'success',
  CONTACTED: 'warning',
  INACTIVE: 'default'
}

const typeVariant: Record<string, 'info' | 'success'> = {
  LEAD: 'info',
  CLIENT: 'success'
}

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
  const [editContact, setEditContact] = useState<Contact | undefined>()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const limit = 20

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
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
        limit
      })
      const d = res.data
      if (Array.isArray(d)) {
        setContacts(d)
        setTotal(d.length)
      } else {
        setContacts(d.data || [])
        setTotal(d.total || 0)
      }
    } catch {
      showToast('Erro ao carregar contactos', 'error')
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, typeFilter, statusFilter, sourceFilter, page])

  useEffect(() => {
    fetchContacts()
  }, [fetchContacts])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, typeFilter, statusFilter, sourceFilter])

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await deleteContact(deleteId)
      showToast('Contacto eliminado', 'success')
      setDeleteId(null)
      fetchContacts()
    } catch {
      showToast('Erro ao eliminar contacto', 'error')
    }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar contactos..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{
              background: 'var(--input-bg)',
              border: '1px solid var(--input-border)',
              color: 'var(--text-primary)',
            }}
          />
        </div>

        <div style={{ width: 160 }}>
          <CustomSelect
            value={typeFilter}
            onChange={setTypeFilter}
            options={[
              { value: '', label: 'Todos os tipos' },
              ...Object.entries(CONTACT_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l as string }))
            ]}
            size="sm"
          />
        </div>

        <div style={{ width: 176 }}>
          <CustomSelect
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: '', label: 'Todos os estados' },
              ...Object.entries(CONTACT_STATUS_LABELS).map(([v, l]) => ({ value: v, label: l as string }))
            ]}
            size="sm"
          />
        </div>

        <div style={{ width: 176 }}>
          <CustomSelect
            value={sourceFilter}
            onChange={setSourceFilter}
            options={[
              { value: '', label: 'Todas as origens' },
              ...SOURCE_OPTIONS.map((s) => ({ value: s, label: s }))
            ]}
            size="sm"
            searchable
          />
        </div>

        <Button
          variant="secondary"
          onClick={async () => {
            try {
              const res = await exportContacts()
              downloadBlob(res.data, 'contactos.csv')
              showToast('CSV exportado', 'success')
            } catch { showToast('Erro ao exportar', 'error') }
          }}
          className="ml-auto"
        >
          <Download className="w-4 h-4" /> Exportar CSV
        </Button>

        <Button
          onClick={() => { setEditContact(undefined); setShowModal(true) }}
        >
          <Plus className="w-4 h-4" /> Novo Contacto
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <PageSpinner />
      ) : contacts.length === 0 ? (
        <EmptyState
          title="Nenhum contacto encontrado"
          description="Crie o seu primeiro contacto ou ajuste os filtros de pesquisa."
          actionLabel="Novo Contacto"
          onAction={() => { setEditContact(undefined); setShowModal(true) }}
        />
      ) : (
        <div className="rounded-xl shadow-sm overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--hover-bg)', borderBottom: '1px solid var(--border-color)' }}>
                  <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--text-secondary)' }}>Nome</th>
                  <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--text-secondary)' }}>Email</th>
                  <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--text-secondary)' }}>Telefone</th>
                  <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--text-secondary)' }}>Tipo</th>
                  <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--text-secondary)' }}>Estado</th>
                  <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--text-secondary)' }}>Origem</th>
                  <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--text-secondary)' }}>Responsável</th>
                  <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--text-secondary)' }}>Criado</th>
                  <th className="text-right px-4 py-3 font-semibold" style={{ color: 'var(--text-secondary)' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((contact) => (
                  <tr
                    key={contact.id}
                    className="cursor-pointer transition-colors"
                    style={{ borderBottom: '1px solid var(--border-subtle)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover-bg)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    onClick={() => navigate(`/contacts/${contact.id}`)}
                  >
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>{contact.name}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{contact.email || '-'}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{contact.phone || '-'}</td>
                    <td className="px-4 py-3">
                      <Badge variant={typeVariant[contact.type]} small>
                        {CONTACT_TYPE_LABELS[contact.type]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant[contact.status]} small>
                        {CONTACT_STATUS_LABELS[contact.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{contact.source || '-'}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{contact.assignedTo?.name || '-'}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>{formatDate(contact.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div
                        className="flex items-center justify-end gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => { setEditContact(contact); setShowModal(true) }}
                          className="p-1.5 rounded transition-colors hover:text-blue-600 hover:bg-blue-50"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteId(contact.id)}
                          className="p-1.5 rounded transition-colors hover:text-red-600 hover:bg-red-50"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid var(--border-color)' }}>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {(page - 1) * limit + 1}–{Math.min(page * limit, total)} de {total} contactos
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover-bg)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover-bg)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditContact(undefined) }}
        title={editContact ? 'Editar Contacto' : 'Novo Contacto'}
        size="xl"
      >
        <ContactForm
          contact={editContact}
          onSuccess={() => { setShowModal(false); setEditContact(undefined); fetchContacts() }}
          onCancel={() => { setShowModal(false); setEditContact(undefined) }}
        />
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Confirmar Eliminação"
        size="sm"
      >
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
          Tem a certeza que deseja eliminar este contacto? Esta ação não pode ser desfeita.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancelar</Button>
          <Button variant="danger" onClick={handleDelete}>Eliminar</Button>
        </div>
      </Modal>
    </div>
  )
}
