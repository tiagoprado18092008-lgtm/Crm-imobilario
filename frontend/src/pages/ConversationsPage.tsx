import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  MessageCircle, Mail, Search, Send, Star, Inbox,
  Clock, CheckCheck, Check, Plus, X, Filter,
  Smartphone, ChevronDown, ChevronRight, User, Tag,
  PhoneCall, Calendar, AtSign, Edit2, Save, Archive,
  FileText, Phone, ChevronLeft, Wifi, WifiOff, BookOpen,
  MessageSquare, Users, Hash,
} from 'lucide-react'
import { format, parseISO, formatDistanceToNow, isToday, isYesterday } from 'date-fns'
import { pt } from 'date-fns/locale'
import {
  getConversations, getConversation, sendMessage,
  updateConversationStatus, assignConversation, createConversation,
  markAsRead, toggleStar,
} from '../api/conversations.api'
import { getContacts, updateContact } from '../api/contacts.api'
import { getUsers } from '../api/users.api'
import { TemplatesModal } from '../components/conversations/TemplatesModal'
import { useAuthStore } from '../store/auth.store'
import type { Contact, Conversation, Message, User as UserType } from '../types'

// ─── helpers ──────────────────────────────────────────────────────────────────

const CHANNEL_COLOR: Record<string, string> = {
  WHATSAPP: '#25d366', EMAIL: '#3b82f6',
  INSTAGRAM: '#e1306c', SMS: '#f59e0b', INTERNAL: '#8b5cf6',
}

function getToken() { return localStorage.getItem('crm_token') ?? '' }

function fmtTimestamp(iso: string): string {
  try {
    const d = parseISO(iso)
    if (isToday(d)) return format(d, 'HH:mm')
    if (isYesterday(d)) return 'Ontem'
    return format(d, 'dd MMM', { locale: pt })
  } catch { return '' }
}

function fmtDateHeader(iso: string): string {
  try {
    const d = parseISO(iso)
    if (isToday(d)) return 'Hoje'
    if (isYesterday(d)) return 'Ontem'
    return format(d, 'dd MMM yyyy', { locale: pt })
  } catch { return '' }
}

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function getAvatarColor(name: string): string {
  const colors = ['#6366f1','#8b5cf6','#ec4899','#14b8a6','#f59e0b','#10b981','#3b82f6','#ef4444']
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

// ─── ChannelIcon ──────────────────────────────────────────────────────────────

const ChannelIcon: React.FC<{ channel: string; size?: number }> = ({ channel, size = 14 }) => {
  const c = CHANNEL_COLOR[channel] || '#64748b'
  if (channel === 'EMAIL') return <Mail size={size} style={{ color: c }} />
  if (channel === 'SMS') return <Smartphone size={size} style={{ color: c }} />
  if (channel === 'WHATSAPP') return <MessageCircle size={size} style={{ color: c }} />
  if (channel === 'INSTAGRAM') return <AtSign size={size} style={{ color: c }} />
  if (channel === 'INTERNAL') return <Hash size={size} style={{ color: c }} />
  if (channel === 'CALL') return <PhoneCall size={size} style={{ color: '#8b5cf6' }} />
  return <MessageCircle size={size} style={{ color: c }} />
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

const Avatar: React.FC<{ name: string; size?: number; channel?: string }> = ({ name, size = 36, channel }) => {
  const color = getAvatarColor(name)
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: color + '20', border: `2px solid ${color}40`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.35, fontWeight: 700, color,
      }}>
        {getInitials(name)}
      </div>
      {channel && (
        <div style={{
          position: 'absolute', bottom: -2, right: -2,
          width: 16, height: 16, borderRadius: '50%',
          background: 'var(--bg-card)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1.5px solid var(--bg-card)',
        }}>
          <ChannelIcon channel={channel} size={9} />
        </div>
      )}
    </div>
  )
}

// ─── Nova Conversa modal ──────────────────────────────────────────────────────

const NewConvModal: React.FC<{ onClose: () => void; onCreated: (c: Conversation) => void }> = ({ onClose, onCreated }) => {
  const [search, setSearch] = useState('')
  const [allContacts, setAllContacts] = useState<Contact[]>([])
  const [selected, setSelected] = useState<Contact | null>(null)
  const [channel, setChannel] = useState<'WHATSAPP' | 'EMAIL' | 'SMS'>('WHATSAPP')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await getContacts({ limit: 50 })
        const list = res.data?.data ?? res.data ?? []
        setAllContacts(Array.isArray(list) ? list : [])
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  const filtered = search.trim().length > 0
    ? allContacts.filter(c =>
        c.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.phone?.includes(search) ||
        c.email?.toLowerCase().includes(search.toLowerCase())
      )
    : allContacts

  const handleCreate = async () => {
    if (!selected) return
    setCreating(true)
    try {
      const ext = channel === 'EMAIL' ? selected.email : selected.whatsapp || selected.phone || ''
      const res = await createConversation({ channel, externalId: ext || selected.id, contactId: selected.id })
      onCreated(res.data)
    } catch {}
    setCreating(false)
  }

  const chs: { id: 'WHATSAPP' | 'EMAIL' | 'SMS'; label: string; color: string }[] = [
    { id: 'WHATSAPP', label: 'WhatsApp', color: '#25d366' },
    { id: 'EMAIL', label: 'Email', color: '#3b82f6' },
    { id: 'SMS', label: 'SMS', color: '#f59e0b' },
  ]

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 16, width: 500, border: '1px solid var(--border-color)', boxShadow: '0 24px 80px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', maxHeight: '85vh' }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>Nova Conversa</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={17} /></button>
        </div>

        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14, overflow: 'hidden', flex: 1 }}>
          {/* Search */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Contacto</label>
            <div style={{ position: 'relative' }}>
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); if (selected) setSelected(null) }}
                placeholder="Pesquisar por nome ou telefone..."
                style={{ width: '100%', padding: '9px 12px 9px 36px', borderRadius: 10, border: selected ? '1.5px solid #25d366' : '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                autoFocus
              />
              <Search size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              {selected && (
                <button onClick={() => { setSelected(null); setSearch('') }} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                  <X size={13} />
                </button>
              )}
            </div>
            {selected && (
              <div style={{ marginTop: 6, padding: '6px 10px', borderRadius: 8, background: 'rgba(37,211,102,0.08)', border: '1px solid rgba(37,211,102,0.3)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Avatar name={selected.name} size={24} />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{selected.name}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>{selected.phone || selected.email || ''}</span>
              </div>
            )}
          </div>

          {/* Contacts table */}
          {!selected && (
            <div style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 10, minHeight: 0 }}>
              {loading ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>A carregar...</div>
              ) : filtered.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Nenhum contacto encontrado.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-page)' }}>
                      <th style={{ padding: '8px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Nome</th>
                      <th style={{ padding: '8px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Telefone</th>
                      <th style={{ padding: '8px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(c => (
                      <tr key={c.id}
                        onClick={() => { setSelected(c); setSearch('') }}
                        style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer', transition: 'background 0.1s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover-bg)')}
                        onMouseLeave={e => (e.currentTarget.style.background = '')}
                      >
                        <td style={{ padding: '9px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Avatar name={c.name} size={28} />
                            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{c.name}</span>
                          </div>
                        </td>
                        <td style={{ padding: '9px 14px', fontSize: 12, color: 'var(--text-muted)' }}>{c.phone || '—'}</td>
                        <td style={{ padding: '9px 14px', fontSize: 12, color: 'var(--text-muted)' }}>{c.email || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Canal */}
          <div style={{ flexShrink: 0 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Canal</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {chs.map(ch => (
                <button key={ch.id} onClick={() => setChannel(ch.id)} style={{ flex: 1, padding: '9px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600, border: channel === ch.id ? `2px solid ${ch.color}` : '2px solid var(--border-color)', background: channel === ch.id ? ch.color + '15' : 'transparent', color: channel === ch.id ? ch.color : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <ChannelIcon channel={ch.id} size={13} /> {ch.label}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
            <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
            <button onClick={handleCreate} disabled={!selected || creating} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: !selected || creating ? 'var(--bg-page)' : 'linear-gradient(135deg,#1a2e4a,#c9a84c)', color: !selected || creating ? 'var(--text-muted)' : '#fff', fontSize: 13, fontWeight: 700, cursor: !selected || creating ? 'not-allowed' : 'pointer' }}>
              {creating ? 'A criar...' : 'Criar Conversa'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── MessageBubble ────────────────────────────────────────────────────────────

const MessageBubble: React.FC<{ msg: Message; isOutbound: boolean }> = ({ msg, isOutbound }) => {
  const [expanded, setExpanded] = useState(false)
  const isEmail = msg.channel === 'EMAIL'
  const isCall = msg.channel === 'CALL'
  const isInternal = msg.channel === 'INTERNAL'

  if (isCall) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 20, background: 'var(--bg-page)', border: '1px solid var(--border-color)', fontSize: 12, color: 'var(--text-muted)' }}>
          <PhoneCall size={12} style={{ color: '#8b5cf6' }} />
          <span>{msg.content}</span>
          <span style={{ opacity: 0.6 }}>· {format(parseISO(msg.createdAt), 'HH:mm')}</span>
        </div>
      </div>
    )
  }

  if (isEmail) {
    return (
      <div style={{ margin: '6px 16px', borderRadius: 10, border: '1px solid var(--border-color)', background: 'var(--bg-card)', overflow: 'hidden' }}>
        <div onClick={() => setExpanded(e => !e)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', justifyContent: 'space-between' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover-bg)')}
          onMouseLeave={e => (e.currentTarget.style.background = '')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <Avatar name={isOutbound ? 'Eu' : (msg.sentBy?.name || 'Contacto')} size={28} />
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{isOutbound ? 'Eu' : (msg.sentBy?.name || 'Contacto')}</p>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{msg.subject || msg.content.slice(0, 60)}</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{format(parseISO(msg.createdAt), 'HH:mm')}</span>
            {expanded ? <ChevronDown size={13} style={{ color: 'var(--text-muted)' }} /> : <ChevronRight size={13} style={{ color: 'var(--text-muted)' }} />}
          </div>
        </div>
        {expanded && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-color)', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap', background: 'var(--bg-page)' }}>
            {msg.content}
          </div>
        )}
      </div>
    )
  }

  if (isInternal) {
    return (
      <div style={{ margin: '4px 16px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 10, padding: '8px 14px', maxWidth: '70%', fontSize: 12, color: '#92400e', lineHeight: 1.5 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4, fontWeight: 700, fontSize: 10, opacity: 0.7 }}>
            <Hash size={9} /> NOTA INTERNA · {format(parseISO(msg.createdAt), 'HH:mm')}
          </div>
          {msg.content}
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', justifyContent: isOutbound ? 'flex-end' : 'flex-start', margin: '3px 16px', gap: 8, alignItems: 'flex-end' }}>
      {!isOutbound && <Avatar name={msg.sentBy?.name || 'Contacto'} size={26} />}
      <div style={{ maxWidth: '65%' }}>
        {!isOutbound && msg.sentBy?.name && (
          <p style={{ margin: '0 0 3px 4px', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{msg.sentBy.name}</p>
        )}
        <div style={{
          padding: '9px 13px',
          borderRadius: isOutbound ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          background: isOutbound ? 'linear-gradient(135deg,#1a2e4a,#243d5e)' : 'var(--bg-page)',
          border: isOutbound ? 'none' : '1px solid var(--border-color)',
          color: isOutbound ? '#fff' : 'var(--text-primary)',
          fontSize: 13, lineHeight: 1.55, wordBreak: 'break-word',
        }}>
          {msg.content}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3, justifyContent: isOutbound ? 'flex-end' : 'flex-start', padding: '0 4px' }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{format(parseISO(msg.createdAt), 'HH:mm')}</span>
          {isOutbound && (
            msg.status === 'READ' ? <CheckCheck size={11} style={{ color: '#60a5fa' }} /> :
            msg.status === 'DELIVERED' ? <CheckCheck size={11} style={{ color: 'var(--text-muted)' }} /> :
            <Check size={11} style={{ color: 'var(--text-muted)' }} />
          )}
          <ChannelIcon channel={msg.channel} size={10} />
        </div>
      </div>
      {isOutbound && <Avatar name={msg.sentBy?.name || 'Eu'} size={26} />}
    </div>
  )
}

// ─── DateDivider ──────────────────────────────────────────────────────────────

const DateDivider: React.FC<{ date: string }> = ({ date }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '12px 16px' }}>
    <div style={{ flex: 1, height: 1, background: 'var(--border-color)' }} />
    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px', background: 'var(--bg-page)', borderRadius: 20, border: '1px solid var(--border-color)' }}>
      <Calendar size={10} /> {date}
    </span>
    <div style={{ flex: 1, height: 1, background: 'var(--border-color)' }} />
  </div>
)

// ─── ContactInfoPanel ─────────────────────────────────────────────────────────

const ContactInfoPanel: React.FC<{ contact: Contact; conversation: Conversation; users: UserType[]; onClose: () => void; onConvUpdate: (c: Conversation) => void }> = ({ contact, conversation, users, onClose, onConvUpdate }) => {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: contact.name || '', email: contact.email || '', phone: contact.phone || '', notes: contact.notes || '' })
  const [saving, setSaving] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [dnd, setDnd] = useState(false)

  const save = async () => {
    setSaving(true)
    try { await updateContact(contact.id, form) } catch {}
    setSaving(false)
    setEditing(false)
  }

  const row = (label: string, value: string, field?: keyof typeof form) => (
    <div style={{ padding: '7px 0', borderBottom: '1px solid var(--border-subtle)' }}>
      <p style={{ margin: '0 0 2px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
      {editing && field ? (
        <input value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
          style={{ width: '100%', padding: '4px 8px', borderRadius: 7, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-primary)', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
      ) : (
        <p style={{ margin: 0, fontSize: 13, color: value ? 'var(--text-primary)' : 'var(--text-muted)' }}>{value || '—'}</p>
      )}
    </div>
  )

  return (
    <div style={{ width: 280, minWidth: 280, display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--border-color)', background: 'var(--bg-card)', overflow: 'hidden' }}>
      {/* header */}
      <div style={{ padding: '13px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>Informação do Contacto</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><ChevronRight size={16} /></button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* avatar + name */}
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--border-color)' }}>
          <Avatar name={contact.name} size={56} />
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{contact.name}</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>{contact.email || contact.phone || '—'}</p>
          </div>
          <a href={`/contacts/${contact.id}`} style={{ fontSize: 12, color: '#c9a84c', fontWeight: 600, textDecoration: 'none' }}>Ver perfil completo →</a>
        </div>

        {/* fields */}
        <div style={{ padding: '12px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
            {editing ? (
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setEditing(false)} style={{ padding: '3px 9px', borderRadius: 7, border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer' }}>Cancelar</button>
                <button onClick={save} disabled={saving} style={{ padding: '3px 9px', borderRadius: 7, border: 'none', background: '#c9a84c', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', gap: 4, alignItems: 'center' }}>
                  <Save size={10} /> {saving ? 'A guardar...' : 'Guardar'}
                </button>
              </div>
            ) : (
              <button onClick={() => setEditing(true)} style={{ padding: '3px 9px', borderRadius: 7, border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer', display: 'flex', gap: 4, alignItems: 'center' }}>
                <Edit2 size={10} /> Editar
              </button>
            )}
          </div>
          {row('Nome', form.name, 'name')}
          {row('Email', form.email, 'email')}
          {row('Telefone', form.phone, 'phone')}
          {row('Notas', form.notes, 'notes')}
        </div>

        {/* assigned */}
        <div style={{ padding: '0 16px 12px', borderBottom: '1px solid var(--border-color)' }}>
          <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Responsável</p>
          <select value={conversation.assignedToId || ''} onChange={async e => {
            await assignConversation(conversation.id, e.target.value)
            onConvUpdate({ ...conversation, assignedToId: e.target.value })
          }} style={{ width: '100%', padding: '6px 8px', borderRadius: 8, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-primary)', fontSize: 12, outline: 'none' }}>
            <option value="">Sem responsável</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>

        {/* tags */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)' }}>
          <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tags</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 6 }}>
            {(contact.tags || []).map((tag: string) => (
              <span key={tag} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 20, background: 'var(--bg-page)', border: '1px solid var(--border-color)', fontSize: 11, color: 'var(--text-secondary)' }}>
                {tag} <X size={9} style={{ cursor: 'pointer', color: 'var(--text-muted)' }} />
              </span>
            ))}
            {(!contact.tags || contact.tags.length === 0) && (
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Sem tags</span>
            )}
          </div>
          <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') setTagInput('') }}
            placeholder="Adicionar tag..."
            style={{ width: '100%', padding: '5px 8px', borderRadius: 7, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-primary)', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
        </div>

        {/* DND */}
        <div style={{ padding: '12px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>Não Perturbar (DND)</p>
            <button onClick={() => setDnd(d => !d)} style={{ width: 38, height: 20, borderRadius: 10, border: 'none', background: dnd ? '#ef4444' : 'var(--border-color)', cursor: 'pointer', position: 'relative', transition: 'background 200ms' }}>
              <div style={{ position: 'absolute', top: 2, left: dnd ? 20 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 200ms' }} />
            </button>
          </div>
          {['Chamadas', 'SMS', 'WhatsApp', 'Email'].map(ch => (
            <div key={ch} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', fontSize: 12, color: 'var(--text-secondary)' }}>
              <span>{ch}</span>
              <span style={{ fontSize: 10, color: dnd ? '#ef4444' : '#22c55e', fontWeight: 700 }}>{dnd ? 'OFF' : 'ON'}</span>
            </div>
          ))}
        </div>

        {/* quick actions */}
        <div style={{ padding: '0 16px 16px' }}>
          <button onClick={() => contact.phone && window.dispatchEvent(new CustomEvent('softphone:dial', { detail: { number: contact.phone } }))}
            style={{ width: '100%', padding: '9px', borderRadius: 9, border: 'none', background: 'rgba(99,102,241,0.1)', color: '#818cf8', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Phone size={13} /> Ligar para {contact.phone || 'contacto'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Composer ─────────────────────────────────────────────────────────────────

type ComposerChannel = 'WHATSAPP' | 'EMAIL' | 'SMS' | 'INTERNAL'

const Composer: React.FC<{
  conversation: Conversation
  onSend: (content: string, channel: string, subject?: string) => Promise<void>
  sending: boolean
  contact?: Contact | null
}> = ({ conversation, onSend, sending, contact }) => {
  const { user } = useAuthStore()
  const [activeChannel, setActiveChannel] = useState<ComposerChannel>(conversation.channel as ComposerChannel || 'WHATSAPP')
  const [text, setText] = useState('')
  const [subject, setSubject] = useState('')
  const [showTemplates, setShowTemplates] = useState(false)
  const textRef = useRef<HTMLTextAreaElement>(null)

  const is24hOld = conversation.lastMessageAt
    ? Date.now() - new Date(conversation.lastMessageAt).getTime() > 24 * 60 * 60 * 1000
    : false

  const channels: { id: ComposerChannel; label: string; color: string }[] = [
    { id: 'SMS', label: 'SMS', color: '#f59e0b' },
    { id: 'WHATSAPP', label: 'WhatsApp', color: '#25d366' },
    { id: 'EMAIL', label: 'E-mail', color: '#3b82f6' },
    { id: 'INTERNAL', label: 'Interno', color: '#8b5cf6' },
  ]

  const handleSend = async () => {
    if (!text.trim()) return
    await onSend(text.trim(), activeChannel, activeChannel === 'EMAIL' ? subject : undefined)
    setText('')
    setSubject('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  return (
    <div style={{ borderTop: '1px solid var(--border-color)', background: 'var(--bg-card)', flexShrink: 0 }}>
      {/* channel tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', padding: '0 16px' }}>
        {channels.map(ch => (
          <button key={ch.id} onClick={() => setActiveChannel(ch.id)} style={{
            padding: '9px 14px', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', background: 'transparent',
            color: activeChannel === ch.id ? ch.color : 'var(--text-muted)',
            borderBottom: `2px solid ${activeChannel === ch.id ? ch.color : 'transparent'}`,
            transition: 'all 120ms',
          }}>
            {ch.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '12px 16px' }}>
        {/* email subject */}
        {activeChannel === 'EMAIL' && (
          <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Assunto:"
            style={{ width: '100%', marginBottom: 8, padding: '7px 12px', borderRadius: 8, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
        )}

        {/* 24h warning for whatsapp */}
        {activeChannel === 'WHATSAPP' && is24hOld && (
          <div style={{ marginBottom: 8, padding: '8px 12px', borderRadius: 8, background: '#fef3c7', border: '1px solid #fde68a', fontSize: 12, color: '#92400e', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <span>⚠️</span>
            <span>Não foi iniciada conversa nas últimas 24h. Para enviar uma mensagem, usa um template aprovado.</span>
          </div>
        )}

        {/* textarea */}
        <textarea ref={textRef} value={text} onChange={e => setText(e.target.value)} onKeyDown={handleKeyDown}
          placeholder={activeChannel === 'INTERNAL' ? 'Escrever nota interna... (visível só para a equipa)' : 'Escrever mensagem... (Enter para enviar, Shift+Enter para nova linha)'}
          rows={3}
          style={{
            width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid var(--input-border)',
            background: activeChannel === 'INTERNAL' ? '#fefce8' : 'var(--input-bg)',
            color: 'var(--text-primary)', fontSize: 13, resize: 'none', outline: 'none', lineHeight: 1.5,
            fontFamily: 'inherit', boxSizing: 'border-box',
          }}
        />

        {/* SMS counter */}
        {activeChannel === 'SMS' && text.length > 0 && (
          <p style={{ margin: '3px 0 0', fontSize: 10, color: text.length > 160 ? '#ef4444' : 'var(--text-muted)', textAlign: 'right' }}>
            {text.length}/160{text.length > 160 ? ' (2 SMS)' : ''}
          </p>
        )}

        {activeChannel === 'INTERNAL' && (
          <p style={{ margin: '4px 0 0', fontSize: 11, color: '#92400e' }}>🔒 Visível apenas para a equipa</p>
        )}

        {/* action bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <button onClick={() => setShowTemplates(true)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            <FileText size={13} /> Templates
          </button>
          <button onClick={handleSend} disabled={!text.trim() || sending} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '7px 18px', borderRadius: 9, border: 'none', cursor: !text.trim() || sending ? 'not-allowed' : 'pointer',
            background: !text.trim() || sending ? 'var(--bg-page)' : 'linear-gradient(135deg,#1a2e4a,#c9a84c)',
            color: !text.trim() || sending ? 'var(--text-muted)' : '#fff', fontSize: 13, fontWeight: 700,
          }}>
            {sending ? 'A enviar...' : <><Send size={13} /> Enviar</>}
          </button>
        </div>
      </div>

      <TemplatesModal
        open={showTemplates}
        onClose={() => setShowTemplates(false)}
        channel={activeChannel}
        contact={contact}
        user={user}
        onSelect={(body, subj) => {
          setText(body)
          if (subj) setSubject(subj)
          textRef.current?.focus()
        }}
      />
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type FilterId = 'unread' | 'all' | 'recents' | 'starred' | 'mine_unread' | 'mine_all' | 'internal_unread' | 'internal_all'

export const ConversationsPage: React.FC = () => {
  const { user } = useAuthStore()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [users, setUsers] = useState<UserType[]>([])
  const [selected, setSelected] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [filter, setFilter] = useState<FilterId>('all')
  const [channelFilter, setChannelFilter] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [msgLoading, setMsgLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [showNewModal, setShowNewModal] = useState(false)
  const [showInfo, setShowInfo] = useState(true)
  const [isLive, setIsLive] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const selectedIdRef = useRef<string | null>(null)
  const pollConvRef = useRef<ReturnType<typeof setInterval>>()
  const pollMsgRef = useRef<ReturnType<typeof setInterval>>()

  const loadConversations = useCallback(async () => {
    try {
      const [convRes, usersRes] = await Promise.all([getConversations({ limit: 100 }), getUsers()])
      setConversations(Array.isArray(convRes.data) ? convRes.data : convRes.data?.data ?? [])
      setUsers(Array.isArray(usersRes.data) ? usersRes.data : usersRes.data?.data ?? [])
    } catch {}
    setLoading(false)
  }, [])

  const loadMessages = useCallback(async (id: string) => {
    setMsgLoading(true)
    try {
      const res = await getConversation(id)
      const conv: Conversation = res.data
      setSelected(conv)
      setMessages(conv.messages || [])
    } catch {}
    setMsgLoading(false)
  }, [])

  useEffect(() => { loadConversations() }, [loadConversations])

  useEffect(() => {
    pollConvRef.current = setInterval(loadConversations, 8000)
    return () => clearInterval(pollConvRef.current)
  }, [loadConversations])

  useEffect(() => {
    if (!selected) { clearInterval(pollMsgRef.current); return }
    clearInterval(pollMsgRef.current)
    pollMsgRef.current = setInterval(() => loadMessages(selected.id), 5000)
    return () => clearInterval(pollMsgRef.current)
  }, [selected?.id, loadMessages])

  // SSE
  useEffect(() => {
    const token = getToken()
    if (!token) return
    const apiBase = (import.meta as any).env?.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000'
    const es = new EventSource(`${apiBase}/api/sse?token=${encodeURIComponent(token)}`)
    es.onopen = () => setIsLive(true)
    es.onerror = () => setIsLive(false)
    es.addEventListener('new_message', (e: any) => {
      const data = JSON.parse(e.data || '{}')
      loadConversations()
      if (selectedIdRef.current && data.conversationId === selectedIdRef.current) {
        loadMessages(selectedIdRef.current)
      }
    })
    return () => { es.close(); setIsLive(false) }
  }, [loadConversations, loadMessages])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const selectConv = async (conv: Conversation) => {
    setSelected(conv)
    selectedIdRef.current = conv.id
    loadMessages(conv.id)
    if (!conv.isRead) {
      markAsRead(conv.id).catch(() => {})
      setConversations(cs => cs.map(c => c.id === conv.id ? { ...c, isRead: true } : c))
    }
  }

  const handleSend = async (content: string, channel: string, subject?: string) => {
    if (!selected) return
    setSending(true)
    try {
      const res = await sendMessage(selected.id, { channel, content, subject })
      const newMsg = res.data?.message || res.data
      setMessages(prev => [...prev, newMsg])
      setConversations(cs => cs.map(c => c.id === selected.id ? { ...c, lastMessageText: content.substring(0, 100), lastMessageAt: new Date().toISOString() } : c))
    } catch {}
    setSending(false)
  }

  const handleToggleStar = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    toggleStar(convId).catch(() => {})
    setConversations(cs => cs.map(c => c.id === convId ? { ...c, isStarred: !c.isStarred } : c))
    if (selected?.id === convId) setSelected(s => s ? { ...s, isStarred: !s.isStarred } : null)
  }

  const handleResolve = async () => {
    if (!selected) return
    const newStatus = selected.status === 'OPEN' ? 'RESOLVED' : 'OPEN'
    await updateConversationStatus(selected.id, newStatus)
    setSelected(s => s ? { ...s, status: newStatus as any } : null)
    setConversations(cs => cs.map(c => c.id === selected.id ? { ...c, status: newStatus as any } : c))
  }

  // Filter logic
  const filtered = conversations.filter(c => {
    if (channelFilter && c.channel !== channelFilter) return false
    if (search) {
      const name = c.contact?.name || c.externalId || ''
      if (!name.toLowerCase().includes(search.toLowerCase())) return false
    }
    switch (filter) {
      case 'unread': return !c.isRead
      case 'starred': return c.isStarred
      case 'recents': return Date.now() - new Date(c.lastMessageAt).getTime() < 7 * 24 * 60 * 60 * 1000
      case 'mine_unread': return c.assignedToId === user?.id && !c.isRead
      case 'mine_all': return c.assignedToId === user?.id
      case 'internal_unread': return c.channel === 'INTERNAL' && !c.isRead
      case 'internal_all': return c.channel === 'INTERNAL'
      default: return true
    }
  })

  const unreadCount = conversations.filter(c => !c.isRead).length

  const groupedMessages = (() => {
    const groups: { date: string; messages: Message[] }[] = []
    let lastDate = ''
    for (const msg of messages) {
      try {
        const d = fmtDateHeader(msg.createdAt)
        if (d !== lastDate) { groups.push({ date: d, messages: [] }); lastDate = d }
        groups[groups.length - 1].messages.push(msg)
      } catch { groups[groups.length - 1]?.messages.push(msg) }
    }
    return groups
  })()

  // sidebar filter items
  type FilterGroup = { label: string; items: { id: FilterId; label: string; icon: React.FC<any>; badge?: number }[] }
  const filterGroups: FilterGroup[] = [
    {
      label: 'Caixa de entrada',
      items: [
        { id: 'unread', label: 'Não lidas', icon: Inbox, badge: unreadCount || undefined },
        { id: 'recents', label: 'Recentes', icon: Clock },
        { id: 'starred', label: 'Com estrela', icon: Star },
        { id: 'all', label: 'Todas', icon: MessageCircle },
      ],
    },
    {
      label: 'A minha caixa',
      items: [
        { id: 'mine_unread', label: 'Não lidas', icon: Inbox },
        { id: 'mine_all', label: 'Todas', icon: Users },
      ],
    },
    {
      label: 'Chat Interno',
      items: [
        { id: 'internal_unread', label: 'Não lidas', icon: Inbox },
        { id: 'internal_all', label: 'Todas', icon: Hash },
      ],
    },
  ]

  const channelButtons: { id: string; label: string; color: string }[] = [
    { id: 'WHATSAPP', label: 'WhatsApp', color: '#25d366' },
    { id: 'EMAIL', label: 'Email', color: '#3b82f6' },
    { id: 'SMS', label: 'SMS', color: '#f59e0b' },
  ]

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden', background: 'var(--bg-page)' }}>

      {/* ── COL 1: Filter Sidebar (240px) ── */}
      <div style={{ width: 240, minWidth: 240, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border-color)', background: 'var(--bg-card)', overflow: 'hidden' }}>
        {/* header */}
        <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>Conversas</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 700, color: isLive ? '#22c55e' : 'var(--text-muted)' }}>
              {isLive ? <Wifi size={11} style={{ color: '#22c55e' }} /> : <WifiOff size={11} />}
            </span>
          </div>
          <button onClick={() => setShowNewModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 9px', borderRadius: 8, border: 'none', background: '#c9a84c', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
            <Plus size={11} /> Nova
          </button>
        </div>

        {/* filter groups */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {filterGroups.map(group => (
            <div key={group.label} style={{ marginBottom: 4 }}>
              <p style={{ margin: '8px 16px 4px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{group.label}</p>
              {group.items.map(item => {
                const isActive = filter === item.id
                return (
                  <button key={item.id} onClick={() => setFilter(item.id)} style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '7px 16px', border: 'none', cursor: 'pointer', textAlign: 'left',
                    background: isActive ? 'rgba(99,102,241,0.08)' : 'transparent',
                    color: isActive ? '#6366f1' : 'var(--text-secondary)',
                    fontWeight: isActive ? 700 : 500, fontSize: 13,
                    borderLeft: `3px solid ${isActive ? '#6366f1' : 'transparent'}`,
                    transition: 'all 100ms',
                  }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--hover-bg)' }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = '' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <item.icon size={14} />
                      {item.label}
                    </div>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span style={{ minWidth: 18, height: 18, borderRadius: 9, background: '#ef4444', color: '#fff', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          ))}

          {/* channel filters */}
          <div style={{ padding: '8px 16px', marginTop: 4, borderTop: '1px solid var(--border-color)' }}>
            <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Canal</p>
            <div style={{ display: 'flex', gap: 5 }}>
              {channelButtons.map(ch => (
                <button key={ch.id} onClick={() => setChannelFilter(channelFilter === ch.id ? null : ch.id)} title={ch.label} style={{
                  flex: 1, padding: '6px', borderRadius: 8, border: `1.5px solid ${channelFilter === ch.id ? ch.color : 'var(--border-color)'}`,
                  background: channelFilter === ch.id ? ch.color + '18' : 'transparent',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 120ms',
                }}>
                  <ChannelIcon channel={ch.id} size={14} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── COL 2: Conversation list (380px) ── */}
      <div style={{ width: 360, minWidth: 360, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border-color)', background: 'var(--bg-card)', overflow: 'hidden' }}>
        {/* list header */}
        <div style={{ padding: '12px 14px 8px', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar conversas..."
              style={{ width: '100%', padding: '7px 10px 7px 30px', borderRadius: 9, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-primary)', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
            <div style={{ display: 'flex', gap: 0 }}>
              {(['Conversas', 'Acções'] as const).map((t, i) => (
                <button key={t} style={{ padding: '4px 12px', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', background: 'transparent', color: i === 0 ? '#6366f1' : 'var(--text-muted)', borderBottom: i === 0 ? '2px solid #6366f1' : '2px solid transparent' }}>
                  {t}
                </button>
              ))}
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{filtered.length} conversa{filtered.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>A carregar...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <MessageCircle size={32} style={{ color: 'var(--text-muted)', display: 'block', margin: '0 auto 10px' }} />
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>Sem conversas</p>
            </div>
          ) : filtered.map(conv => {
            const name = conv.contact?.name || conv.externalId || 'Desconhecido'
            const isSelected = selected?.id === conv.id
            const preview = conv.lastMessageText || 'Sem mensagens'

            return (
              <div key={conv.id} onClick={() => selectConv(conv)} style={{
                padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border-subtle)',
                background: isSelected ? 'rgba(99,102,241,0.06)' : 'transparent',
                borderLeft: isSelected ? '3px solid #6366f1' : '3px solid transparent',
                transition: 'all 100ms',
              }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--hover-bg)' }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = '' }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <Avatar name={name} size={38} channel={conv.channel} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: !conv.isRead ? 700 : 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</p>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>{fmtTimestamp(conv.lastMessageAt)}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <ChannelIcon channel={conv.channel} size={11} />
                      <p style={{ margin: 0, fontSize: 12, color: !conv.isRead ? 'var(--text-secondary)' : 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, fontWeight: !conv.isRead ? 600 : 400 }}>
                        {preview}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                        {conv.isStarred && <Star size={11} fill="#f59e0b" style={{ color: '#f59e0b' }} />}
                        {!conv.isRead && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1', flexShrink: 0 }} />}
                        <button onClick={e => handleToggleStar(conv.id, e)} className="star-btn" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: conv.isStarred ? '#f59e0b' : 'var(--text-muted)', opacity: conv.isStarred ? 1 : 0, transition: 'opacity 150ms' }}>
                          <Star size={11} fill={conv.isStarred ? '#f59e0b' : 'none'} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── COL 3: Thread + Info ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minWidth: 0 }}>

        {/* Thread */}
        {selected ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
            {/* thread header */}
            <div style={{ padding: '11px 16px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar name={selected.contact?.name || selected.externalId || '?'} size={34} channel={selected.channel} />
                <div>
                  <a href={`/contacts/${selected.contactId}`} style={{ margin: 0, fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', textDecoration: 'none', display: 'block' }}>
                    {selected.contact?.name || selected.externalId || 'Desconhecido'}
                  </a>
                  <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <ChannelIcon channel={selected.channel} size={10} />
                    {selected.channel} · {selected.externalId || '—'}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <button onClick={e => handleToggleStar(selected.id, e)} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border-color)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: selected.isStarred ? '#f59e0b' : 'var(--text-muted)' }}>
                  <Star size={14} fill={selected.isStarred ? '#f59e0b' : 'none'} />
                </button>
                <button onClick={async () => { await updateConversationStatus(selected.id, 'ARCHIVED'); setSelected(s => s ? { ...s, status: 'ARCHIVED' } : null); loadConversations() }} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border-color)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                  <Archive size={14} />
                </button>
                <button onClick={handleResolve} style={{ padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, background: selected.status === 'OPEN' ? 'rgba(16,185,129,0.12)' : 'rgba(99,102,241,0.12)', color: selected.status === 'OPEN' ? '#10b981' : '#6366f1' }}>
                  {selected.status === 'OPEN' ? '✓ Resolver' : '↺ Reabrir'}
                </button>
                <button onClick={() => setShowInfo(v => !v)} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border-color)', background: showInfo ? 'rgba(99,102,241,0.08)' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: showInfo ? '#6366f1' : 'var(--text-muted)' }}>
                  <User size={14} />
                </button>
              </div>
            </div>

            {/* messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
              {msgLoading ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>A carregar mensagens...</div>
              ) : messages.length === 0 ? (
                <div style={{ padding: 60, textAlign: 'center' }}>
                  <MessageSquare size={36} style={{ color: 'var(--text-muted)', display: 'block', margin: '0 auto 12px' }} />
                  <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>Sem mensagens ainda</p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0', opacity: 0.7 }}>Envia a primeira mensagem abaixo</p>
                </div>
              ) : groupedMessages.map(group => (
                <div key={group.date}>
                  <DateDivider date={group.date} />
                  {group.messages.map(msg => (
                    <MessageBubble key={msg.id} msg={msg} isOutbound={msg.direction === 'OUTBOUND'} />
                  ))}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* composer */}
            <Composer
              conversation={selected}
              onSend={handleSend}
              sending={sending}
              contact={selected.contact}
            />
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(99,102,241,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MessageCircle size={28} style={{ color: '#6366f1' }} />
            </div>
            <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-secondary)', margin: 0 }}>Seleciona uma conversa</p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>Clica numa conversa para ver as mensagens</p>
          </div>
        )}

        {/* Contact Info Panel */}
        {selected && showInfo && (
          selected.contact ? (
            <ContactInfoPanel
              contact={selected.contact}
              conversation={selected}
              users={users}
              onClose={() => setShowInfo(false)}
              onConvUpdate={conv => setSelected(conv)}
            />
          ) : (
            <div style={{ width: 280, minWidth: 280, borderLeft: '1px solid var(--border-color)', background: 'var(--bg-card)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 }}>
              <User size={32} style={{ color: 'var(--text-muted)' }} />
              <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', margin: 0 }}>Sem contacto associado</p>
              <button onClick={() => setShowInfo(false)} style={{ fontSize: 12, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Fechar painel</button>
            </div>
          )
        )}
      </div>

      {/* modals */}
      {showNewModal && (
        <NewConvModal
          onClose={() => setShowNewModal(false)}
          onCreated={conv => { setShowNewModal(false); loadConversations(); selectConv(conv) }}
        />
      )}

      <style>{`
        .star-btn { opacity: 0 !important; }
        div:hover > div > div > .star-btn { opacity: 1 !important; }
        div:hover .star-btn { opacity: 1 !important; }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:.4 } }
      `}</style>
    </div>
  )
}
