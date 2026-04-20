import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Mail, MessageCircle, Phone, FileText, Edit, ArrowLeft,
  Calendar, Tag, User
} from 'lucide-react'
import { getContact } from '../api/contacts.api'
import type { Contact, Interaction, Task, Opportunity, Appointment } from '../types'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { PageSpinner } from '../components/ui/Spinner'
import { InteractionLog } from '../components/interactions/InteractionLog'
import { CommunicationModal } from '../components/interactions/CommunicationModal'
import { ContactForm } from '../components/contacts/ContactForm'
import { LeadScoreBadge, calcLeadScore } from '../components/contacts/LeadScoreBadge'
import { useUIStore } from '../store/ui.store'
import { useCallStore } from '../store/call.store'
import { formatDate, formatPhone } from '../utils/formatters'
import {
  STAGE_LABELS,
  TASK_STATUS_LABELS,
  TASK_PRIORITY_LABELS,
  APPOINTMENT_TYPE_LABELS,
} from '../utils/constants'
import { Badge } from '../components/ui/Badge'

const AVATAR_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#3b82f6', '#ef4444', '#14b8a6',
]
function avatarColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}
function getInitials(name: string) {
  const parts = name.trim().split(' ')
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?'
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
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

type TabType = 'appointments' | 'opportunities' | 'tasks'

const APPT_STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  SCHEDULED:  { bg: '#eff6ff', color: '#2563eb', label: 'Agendado' },
  CONFIRMED:  { bg: '#f0fdf4', color: '#16a34a', label: 'Confirmado' },
  COMPLETED:  { bg: '#f9fafb', color: '#6b7280', label: 'Concluído' },
  CANCELLED:  { bg: '#fff1f2', color: '#e11d48', label: 'Cancelado' },
  NO_SHOW:    { bg: '#fffbeb', color: '#d97706', label: 'Não compareceu' },
}

export const ContactDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showToast } = useUIStore()
  const [contact, setContact] = useState<Contact | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('appointments')
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
  const appointments: Appointment[] = (contact as any).appointments || []
  const leadScore = calcLeadScore({ interactions, opportunities, tasks, status: contact.status })

  const tabs: Array<{ key: TabType; label: string; count: number }> = [
    { key: 'appointments', label: 'Agendamentos', count: appointments.length },
    { key: 'opportunities', label: 'Oportunidades', count: opportunities.length },
    { key: 'tasks', label: 'Tarefas', count: tasks.length },
  ]

  return (
    <div className="space-y-4">
      {/* Back button */}
      <button
        onClick={() => navigate('/contacts')}
        className="flex items-center gap-2 text-sm transition-colors"
        style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
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
                <div style={{
                  width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                  background: avatarColor(contact.name), color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 700, letterSpacing: '0.03em',
                }}>
                  {getInitials(contact.name)}
                </div>
                <div>
                  <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{contact.name}</h2>
                  <div className="flex items-center gap-2 mt-1" style={{ flexWrap: 'wrap' }}>
                    {TYPE_STYLE[contact.type] && (
                      <Pill bg={TYPE_STYLE[contact.type].bg} color={TYPE_STYLE[contact.type].color} label={TYPE_STYLE[contact.type].label} />
                    )}
                    <LeadScoreBadge score={leadScore} size="sm" />
                    {STATUS_STYLE[contact.status] && (
                      <Pill bg={STATUS_STYLE[contact.status].bg} color={STATUS_STYLE[contact.status].color} label={STATUS_STYLE[contact.status].label} />
                    )}
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

            {/* BUYER details */}
            {contact.type === 'BUYER' && (contact.budget_min || contact.budget_max || contact.interest_type || contact.timeline) && (
              <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <p className="text-xs font-semibold uppercase mb-2" style={{ color: 'var(--text-secondary)' }}>Perfil de Compra</p>
                <div className="space-y-1 text-sm">
                  {(contact.budget_min || contact.budget_max) && (
                    <div className="flex justify-between">
                      <span style={{ color: 'var(--text-secondary)' }}>Budget</span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                        {contact.budget_min ? `${contact.budget_min.toLocaleString('pt-PT')} €` : '—'}
                        {' – '}
                        {contact.budget_max ? `${contact.budget_max.toLocaleString('pt-PT')} €` : '—'}
                      </span>
                    </div>
                  )}
                  {contact.interest_type && (
                    <div className="flex justify-between">
                      <span style={{ color: 'var(--text-secondary)' }}>Tipo de imóvel</span>
                      <span style={{ color: 'var(--text-primary)' }}>{contact.interest_type}</span>
                    </div>
                  )}
                  {(contact as any).selling_also && (
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Pretende também vender</p>
                  )}
                  {(contact as any).needs_financing && (
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Necessita financiamento</p>
                  )}
                </div>
              </div>
            )}

            {/* OWNER details */}
            {contact.type === 'OWNER' && ((contact as any).property_address || (contact as any).asking_price) && (
              <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <p className="text-xs font-semibold uppercase mb-2" style={{ color: 'var(--text-secondary)' }}>Dados do Imóvel</p>
                <div className="space-y-1 text-sm">
                  {(contact as any).property_address && (
                    <div>
                      <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>Morada</span>
                      <p style={{ color: 'var(--text-primary)' }}>{(contact as any).property_address}</p>
                    </div>
                  )}
                  {(contact as any).asking_price && (
                    <div className="flex justify-between">
                      <span style={{ color: 'var(--text-secondary)' }}>Asking price</span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                        {(contact as any).asking_price.toLocaleString('pt-PT')} €
                      </span>
                    </div>
                  )}
                  {(contact as any).commission && (
                    <div className="flex justify-between">
                      <span style={{ color: 'var(--text-secondary)' }}>Comissão (5%)</span>
                      <span style={{ color: '#c9a84c', fontWeight: 600 }}>
                        {(contact as any).commission.toLocaleString('pt-PT')} €
                      </span>
                    </div>
                  )}
                  {(contact as any).sale_reason && (
                    <div className="flex justify-between">
                      <span style={{ color: 'var(--text-secondary)' }}>Razão da venda</span>
                      <span style={{ color: 'var(--text-primary)' }}>{(contact as any).sale_reason}</span>
                    </div>
                  )}
                  {(contact as any).buying_also && (
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Pretende também comprar</p>
                  )}
                </div>
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
              <Button
                variant="secondary"
                size="sm"
                disabled={!contact.phone}
                onClick={() => {
                  if (!contact.phone) return
                  useCallStore.getState().openDialer(contact.phone, contact.id)
                }}
              >
                <Phone className="w-4 h-4" /> Ligar
              </Button>
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
              {activeTab === 'appointments' && (
                <div className="space-y-3">
                  {appointments.length === 0 ? (
                    <p className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>Sem agendamentos</p>
                  ) : (
                    appointments.map((appt) => {
                      const s = APPT_STATUS_STYLE[appt.status] ?? { bg: '#f9fafb', color: '#6b7280', label: appt.status }
                      const typeLabel = APPOINTMENT_TYPE_LABELS[appt.type] ?? appt.type
                      const start = new Date(appt.startAt)
                      return (
                        <div
                          key={appt.id}
                          className="flex items-start gap-3 p-3 rounded-lg"
                          style={{ background: 'var(--hover-bg)' }}
                        >
                          <div style={{
                            width: 40, height: 40, borderRadius: 8, flexShrink: 0,
                            background: '#f0f4ff', display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center',
                          }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#4f46e5', lineHeight: 1 }}>
                              {start.getDate()}
                            </span>
                            <span style={{ fontSize: 10, color: '#6366f1' }}>
                              {start.toLocaleString('pt-PT', { month: 'short' })}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{appt.title}</p>
                              <span style={{
                                fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 20,
                                background: s.bg, color: s.color,
                              }}>{s.label}</span>
                            </div>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                              {typeLabel}
                              {' · '}
                              {start.toLocaleString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                              {appt.location && ` · ${appt.location}`}
                            </p>
                            {appt.notes && (
                              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{appt.notes}</p>
                            )}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
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
