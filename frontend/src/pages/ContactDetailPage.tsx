import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Mail, MessageCircle, Phone, FileText, Edit, ArrowLeft,
  User, Calendar, Tag
} from 'lucide-react'
import { getContact } from '../api/contacts.api'
import type { Contact, Interaction, Task, Opportunity } from '../types'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { PageSpinner } from '../components/ui/Spinner'
import { InteractionLog } from '../components/interactions/InteractionLog'
import { CommunicationModal } from '../components/interactions/CommunicationModal'
import { ContactForm } from '../components/contacts/ContactForm'
import { LeadScoreBadge, calcLeadScore } from '../components/contacts/LeadScoreBadge'
import { useUIStore } from '../store/ui.store'
import { formatDate, formatPhone } from '../utils/formatters'
import {
  CONTACT_STATUS_LABELS,
  CONTACT_TYPE_LABELS,
  STAGE_LABELS,
  TASK_STATUS_LABELS,
  TASK_PRIORITY_LABELS
} from '../utils/constants'

const statusVariant: Record<string, any> = {
  NEW: 'info', QUALIFIED: 'success', CONTACTED: 'warning', INACTIVE: 'default'
}
const typeVariant: Record<string, any> = { LEAD: 'info', CLIENT: 'success' }

type TabType = 'interactions' | 'opportunities' | 'tasks'

export const ContactDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showToast } = useUIStore()
  const [contact, setContact] = useState<Contact | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('interactions')
  const [commModal, setCommModal] = useState<string | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)

  const fetchContact = async () => {
    if (!id) return
    setLoading(true)
    try {
      const res = await getContact(id)
      setContact(res.data)
    } catch {
      showToast('Erro ao carregar contacto', 'error')
      navigate('/contacts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchContact() }, [id])

  if (loading) return <PageSpinner />
  if (!contact) return null

  const interactions: Interaction[] = contact.interactions || []
  const opportunities: Opportunity[] = contact.opportunities || []
  const tasks: Task[] = contact.tasks || []
  const leadScore = calcLeadScore({ interactions, opportunities, tasks, status: contact.status })

  const tabs: Array<{ key: TabType; label: string; count: number }> = [
    { key: 'interactions', label: 'Interações', count: interactions.length },
    { key: 'opportunities', label: 'Oportunidades', count: opportunities.length },
    { key: 'tasks', label: 'Tarefas', count: tasks.length }
  ]

  return (
    <div className="space-y-4">
      {/* Back button */}
      <button
        onClick={() => navigate('/contacts')}
        className="flex items-center gap-2 text-sm transition-colors"
        style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar aos Contactos
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Contact Info */}
        <div className="space-y-4">
          <Card>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(99,102,241,0.12)' }}>
                  <User className="w-6 h-6" style={{ color: '#6366f1' }} />
                </div>
                <div>
                  <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{contact.name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={typeVariant[contact.type]} small>
                      {CONTACT_TYPE_LABELS[contact.type]}
                    </Badge>
                    <LeadScoreBadge score={leadScore} size="sm" />
                    <Badge variant={statusVariant[contact.status]} small>
                      {CONTACT_STATUS_LABELS[contact.status]}
                    </Badge>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowEditModal(true)}
              >
                <Edit className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-3 text-sm">
              {contact.email && (
                <div className="flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <Mail className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                  <a href={`mailto:${contact.email}`} className="hover:text-blue-600 truncate" style={{ color: 'inherit' }}>
                    {contact.email}
                  </a>
                </div>
              )}
              {contact.phone && (
                <div className="flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <Phone className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                  <a href={`tel:${contact.phone}`} className="hover:text-blue-600" style={{ color: 'inherit' }}>
                    {formatPhone(contact.phone)}
                  </a>
                </div>
              )}
              {contact.whatsapp && (
                <div className="flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <MessageCircle className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                  <a
                    href={`https://wa.me/${contact.whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-green-600"
                    style={{ color: 'inherit' }}
                  >
                    {formatPhone(contact.whatsapp)}
                  </a>
                </div>
              )}
              {contact.source && (
                <div className="flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <Tag className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                  <span>{contact.source}</span>
                </div>
              )}
              {contact.assignedTo && (
                <div className="flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <User className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                  <span>{contact.assignedTo.name}</span>
                </div>
              )}
              <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                <Calendar className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                <span>Criado em {formatDate(contact.createdAt)}</span>
              </div>
            </div>

            {contact.notes && (
              <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <p className="text-xs font-semibold uppercase mb-1" style={{ color: 'var(--text-secondary)' }}>Notas</p>
                <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{contact.notes}</p>
              </div>
            )}

            {contact.preferences && (
              <div className="mt-3">
                <p className="text-xs font-semibold uppercase mb-1" style={{ color: 'var(--text-secondary)' }}>Preferências</p>
                <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{contact.preferences}</p>
              </div>
            )}
          </Card>

          {/* Action Buttons */}
          <Card>
            <p className="text-xs font-semibold uppercase mb-3" style={{ color: 'var(--text-secondary)' }}>Ações Rápidas</p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCommModal('EMAIL')}
              >
                <Mail className="w-4 h-4" /> Email
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCommModal('WHATSAPP')}
              >
                <MessageCircle className="w-4 h-4" /> WhatsApp
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCommModal('CALL')}
              >
                <Phone className="w-4 h-4" /> Chamada
              </Button>
              {contact.phone && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    window.dispatchEvent(
                      new CustomEvent('softphone:dial', { detail: { number: contact.phone } })
                    )
                  }}
                  style={{ background: '#f0fdf4', color: '#15803d', borderColor: '#bbf7d0' }}
                >
                  <Phone className="w-4 h-4" /> Ligar
                </Button>
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCommModal('NOTE')}
              >
                <FileText className="w-4 h-4" /> Nota
              </Button>
            </div>
          </Card>
        </div>

        {/* Right: Tabs */}
        <div className="lg:col-span-2">
          <Card padding={false}>
            {/* Tab Headers */}
            <div className="flex" style={{ borderBottom: '1px solid var(--border-color)' }}>
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className="flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors"
                  style={{
                    color: activeTab === tab.key ? '#6366f1' : 'var(--text-secondary)',
                    borderBottom: activeTab === tab.key ? '2px solid #6366f1' : '2px solid transparent',
                    background: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {tab.label}
                  <span
                    className="px-1.5 py-0.5 rounded-full text-xs"
                    style={{
                      background: activeTab === tab.key ? 'rgba(99,102,241,0.12)' : 'var(--bg-page)',
                      color: activeTab === tab.key ? '#6366f1' : 'var(--text-secondary)',
                    }}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            <div className="p-5">
              {activeTab === 'interactions' && (
                <InteractionLog interactions={interactions} />
              )}

              {activeTab === 'opportunities' && (
                <div className="space-y-3">
                  {opportunities.length === 0 ? (
                    <p className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>Sem oportunidades</p>
                  ) : (
                    opportunities.map((opp) => (
                      <div
                        key={opp.id}
                        className="flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors"
                        style={{ background: 'var(--hover-bg)' }}
                        onClick={() => navigate('/pipeline')}
                      >
                        <div>
                          <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{opp.title}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                            {STAGE_LABELS[opp.stage]}
                            {opp.property && ` • ${opp.property.title}`}
                          </p>
                        </div>
                        {opp.value && (
                          <span className="text-sm font-semibold text-green-600">
                            €{opp.value.toLocaleString('pt-PT')}
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'tasks' && (
                <div className="space-y-3">
                  {tasks.length === 0 ? (
                    <p className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>Sem tarefas</p>
                  ) : (
                    tasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-start gap-3 p-3 rounded-lg"
                        style={{ background: 'var(--hover-bg)' }}
                      >
                        <div className="flex-1">
                          <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{task.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge
                              variant={
                                task.priority === 'HIGH' ? 'danger' :
                                task.priority === 'MEDIUM' ? 'warning' : 'default'
                              }
                              small
                            >
                              {TASK_PRIORITY_LABELS[task.priority]}
                            </Badge>
                            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                              {TASK_STATUS_LABELS[task.status]}
                            </span>
                            {task.dueDate && (
                              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                Prazo: {formatDate(task.dueDate)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Communication Modal */}
      <CommunicationModal
        isOpen={!!commModal}
        onClose={() => setCommModal(null)}
        contactId={contact.id}
        defaultType={commModal || 'NOTE'}
        onSuccess={fetchContact}
      />

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Editar Contacto"
        size="xl"
      >
        <ContactForm
          contact={contact}
          onSuccess={() => { setShowEditModal(false); fetchContact() }}
          onCancel={() => setShowEditModal(false)}
        />
      </Modal>
    </div>
  )
}
