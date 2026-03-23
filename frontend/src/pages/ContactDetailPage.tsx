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
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
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
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{contact.name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={typeVariant[contact.type]} small>
                      {CONTACT_TYPE_LABELS[contact.type]}
                    </Badge>
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
                <div className="flex items-center gap-2 text-gray-700">
                  <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <a href={`mailto:${contact.email}`} className="hover:text-blue-600 truncate">
                    {contact.email}
                  </a>
                </div>
              )}
              {contact.phone && (
                <div className="flex items-center gap-2 text-gray-700">
                  <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <a href={`tel:${contact.phone}`} className="hover:text-blue-600">
                    {formatPhone(contact.phone)}
                  </a>
                </div>
              )}
              {contact.whatsapp && (
                <div className="flex items-center gap-2 text-gray-700">
                  <MessageCircle className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <a
                    href={`https://wa.me/${contact.whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-green-600"
                  >
                    {formatPhone(contact.whatsapp)}
                  </a>
                </div>
              )}
              {contact.source && (
                <div className="flex items-center gap-2 text-gray-700">
                  <Tag className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span>{contact.source}</span>
                </div>
              )}
              {contact.assignedTo && (
                <div className="flex items-center gap-2 text-gray-700">
                  <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span>{contact.assignedTo.name}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-gray-500">
                <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span>Criado em {formatDate(contact.createdAt)}</span>
              </div>
            </div>

            {contact.notes && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Notas</p>
                <p className="text-sm text-gray-700">{contact.notes}</p>
              </div>
            )}

            {contact.preferences && (
              <div className="mt-3">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Preferências</p>
                <p className="text-sm text-gray-700">{contact.preferences}</p>
              </div>
            )}
          </Card>

          {/* Action Buttons */}
          <Card>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Ações Rápidas</p>
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
            <div className="flex border-b border-gray-200">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors ${
                    activeTab === tab.key
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                  <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                    activeTab === tab.key
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
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
                    <p className="text-center py-8 text-gray-400 text-sm">Sem oportunidades</p>
                  ) : (
                    opportunities.map((opp) => (
                      <div
                        key={opp.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                        onClick={() => navigate('/pipeline')}
                      >
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{opp.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {STAGE_LABELS[opp.stage]}
                            {opp.property && ` • ${opp.property.title}`}
                          </p>
                        </div>
                        {opp.value && (
                          <span className="text-sm font-semibold text-green-700">
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
                    <p className="text-center py-8 text-gray-400 text-sm">Sem tarefas</p>
                  ) : (
                    tasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 text-sm">{task.title}</p>
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
                            <span className="text-xs text-gray-500">
                              {TASK_STATUS_LABELS[task.status]}
                            </span>
                            {task.dueDate && (
                              <span className="text-xs text-gray-400">
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
