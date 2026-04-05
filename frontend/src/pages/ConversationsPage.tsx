import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  MessageCircle, Mail, Phone, Search, Send, Star, Inbox,
  Clock, CheckCheck, Check, Plus, X,
  Smartphone, ChevronDown, ChevronRight, User, Tag,
  PhoneCall, Calendar, AtSign, Edit2, Save,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { pt } from 'date-fns/locale'
import {
  getConversations, getConversation, sendMessage,
  updateConversationStatus, assignConversation, createConversation,
} from '../api/conversations.api'
import { getContacts, updateContact } from '../api/contacts.api'
import { getUsers } from '../api/users.api'
import type { Contact, Conversation, Message, User as UserType } from '../types'

// ─── helpers ──────────────────────────────────────────────────────────────────

const CHANNEL_COLOR: Record<string, string> = {
  WHATSAPP: '#25d366', EMAIL: '#3b82f6',
  INSTAGRAM: '#e1306c', SMS: '#f59e0b', INTERNAL: '#64748b',
}

function getToken() {
  return localStorage.getItem('crm_token') ?? ''
}

function fmtTime(iso: string) {
  try {
    const d = parseISO(iso)
    const now = new Date()
    if (d.toDateString() === now.toDateString()) return format(d, 'HH:mm')
    return format(d, 'dd MMM', { locale: pt })
  } catch { return '' }
}

// ─── ChannelIcon ──────────────────────────────────────────────────────────────

const ChannelIcon: React.FC<{ channel: string; size?: number }> = ({ channel, size = 14 }) => {
  const c = CHANNEL_COLOR[channel] || '#64748b'
  if (channel === 'EMAIL') return <Mail size={size} style={{ color: c }} />
  if (channel === 'SMS') return <Smartphone size={size} style={{ color: c }} />
  if (channel === 'WHATSAPP') return <MessageCircle size={size} style={{ color: c }} />
  if (channel === 'INSTAGRAM') return <AtSign size={size} style={{ color: c }} />
  if (channel === 'CALL') return <PhoneCall size={size} style={{ color: '#8b5cf6' }} />
  return <MessageCircle size={size} style={{ color: c }} />
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

const Avatar: React.FC<{ name: string; size?: number; channel?: string }> = ({ name, size = 36, channel }) => {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const colors = ['#6366f1','#8b5cf6','#ec4899','#14b8a6','#f59e0b','#10b981','#3b82f6']
  const color = colors[name.charCodeAt(0) % colors.length]
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: color + '22', border: `2px solid ${color}44`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.36, fontWeight: 700, color,
      }}>
        {initials}
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

interface NewConvModalProps { onClose: () => void; onCreated: (c: Conversation) => void }

const NewConvModal: React.FC<NewConvModalProps> = ({ onClose, onCreated }) => {
  const [search, setSearch] = useState('')
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selected, setSelected] = useState<Contact | null>(null)
  const [channel, setChannel] = useState<'WHATSAPP' | 'EMAIL' | 'SMS'>('WHATSAPP')
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [showDrop, setShowDrop] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    clearTimeout(debounceRef.current)
    if (search.length < 2) { setContacts([]); return }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await getContacts({ search, limit: 8 })
        setContacts(Array.isArray(res.data) ? res.data : res.data?.data ?? [])
        setShowDrop(true)
      } catch {}
      setLoading(false)
    }, 300)
  }, [search])

  const handleCreate = async () => {
    if (!selected) return
    setCreating(true)
    try {
      const ext = channel === 'EMAIL' ? selected.email : selected.whatsapp || selected.phone || ''
      const res = await createConversation({ channel, externalId: ext || selected.id, contactId: selected.id })
      onCreated(res.data)
    } catch (e) { console.error(e) }
    setCreating(false)
  }

  const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 100,
    background: 'rgba(0,0,0,0.55)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }
  const modal: React.CSSProperties = {
    background: 'var(--bg-card)', borderRadius: 16, width: 480,
    border: '1px solid var(--border-color)', boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
    overflow: 'hidden',
  }

  const channels: { id: 'WHATSAPP' | 'EMAIL' | 'SMS'; label: string; color: string }[] = [
    { id: 'WHATSAPP', label: 'WhatsApp', color: '#25d366' },
    { id: 'EMAIL', label: 'Email', color: '#3b82f6' },
    { id: 'SMS', label: 'SMS', color: '#f59e0b' },
  ]

  return (
    <div style={overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={modal}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>Nova Conversa</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={18} /></button>
        </div>
        <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* contact search */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Contacto</label>
            <div style={{ position: 'relative' }}>
              <input
                value={selected ? selected.name : search}
                onChange={e => { setSearch(e.target.value); setSelected(null) }}
                placeholder={loading ? 'A pesquisar...' : 'Pesquisar por nome ou telefone...'}
                style={{ width: '100%', padding: '9px 12px 9px 36px', borderRadius: 10, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
              />
              <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              {showDrop && contacts.length > 0 && !selected && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.2)', marginTop: 4, maxHeight: 200, overflowY: 'auto' }}>
                  {contacts.map(c => (
                    <div key={c.id} onClick={() => { setSelected(c); setSearch(c.name); setShowDrop(false) }}
                      style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover-bg)')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}
                    >
                      <Avatar name={c.name} size={30} />
                      <div>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{c.name}</p>
                        <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>{c.email || c.phone || ''}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          {/* channel */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Canal</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {channels.map(ch => (
                <button key={ch.id} onClick={() => setChannel(ch.id)} style={{
                  flex: 1, padding: '9px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                  border: channel === ch.id ? `2px solid ${ch.color}` : '2px solid var(--border-color)',
                  background: channel === ch.id ? ch.color + '15' : 'transparent',
                  color: channel === ch.id ? ch.color : 'var(--text-muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                  <ChannelIcon channel={ch.id} size={13} /> {ch.label}
                </button>
              ))}
            </div>
          </div>
          {/* buttons */}
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
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

  if (isCall) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 20, background: 'var(--bg-page)', border: '1px solid var(--border-color)', fontSize: 12, color: 'var(--text-muted)' }}>
          <PhoneCall size={12} style={{ color: '#8b5cf6' }} />
          <span>{msg.content}</span>
          <span style={{ opacity: 0.6 }}>· {fmtTime(msg.createdAt)}</span>
        </div>
      </div>
    )
  }

  if (isEmail) {
    return (
      <div style={{ margin: '6px 16px', borderRadius: 10, border: '1px solid var(--border-color)', background: 'var(--bg-card)', overflow: 'hidden' }}>
        <div
          onClick={() => setExpanded(e => !e)}
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', justifyContent: 'space-between' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover-bg)')}
          onMouseLeave={e => (e.currentTarget.style.background = '')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <Avatar name={isOutbound ? 'Eu' : (msg.sentBy?.name || 'Contacto')} size={28} />
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {isOutbound ? 'Eu' : (msg.sentBy?.name || 'Contacto')}
              </p>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {msg.subject || msg.content.slice(0, 60)}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtTime(msg.createdAt)}</span>
            {expanded ? <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} /> : <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />}
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

  return (
    <div style={{ display: 'flex', justifyContent: isOutbound ? 'flex-end' : 'flex-start', margin: '4px 16px', gap: 8, alignItems: 'flex-end' }}>
      {!isOutbound && <Avatar name={msg.sentBy?.name || 'Contacto'} size={26} />}
      <div style={{ maxWidth: '65%' }}>
        {!isOutbound && msg.sentBy?.name && (
          <p style={{ margin: '0 0 3px 4px', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{msg.sentBy.name}</p>
        )}
        <div style={{
          padding: '9px 14px', borderRadius: isOutbound ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          background: isOutbound ? 'linear-gradient(135deg,#1a2e4a,#243d5e)' : 'var(--bg-page)',
          border: isOutbound ? 'none' : '1px solid var(--border-color)',
          color: isOutbound ? '#fff' : 'var(--text-primary)',
          fontSize: 13, lineHeight: 1.5, wordBreak: 'break-word',
        }}>
          {msg.content}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3, justifyContent: isOutbound ? 'flex-end' : 'flex-start', padding: '0 4px' }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{fmtTime(msg.createdAt)}</span>
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

// ─── ContactDetailsPanel ──────────────────────────────────────────────────────

const ContactDetailsPanel: React.FC<{ contact: Contact; users: UserType[]; onClose: () => void }> = ({ contact, users, onClose }) => {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    name: contact.name || '',
    email: contact.email || '',
    phone: contact.phone || '',
    type: contact.type || 'LEAD',
    status: contact.status || 'NEW',
    source: contact.source || '',
    notes: contact.notes || '',
  })
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try { await updateContact(contact.id, form) } catch {}
    setSaving(false)
    setEditing(false)
  }

  const row = (label: string, value: string, field?: keyof typeof form) => (
    <div style={{ padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
      <p style={{ margin: '0 0 3px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
      {editing && field ? (
        <input value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
          style={{ width: '100%', padding: '5px 8px', borderRadius: 7, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
      ) : (
        <p style={{ margin: 0, fontSize: 13, color: value ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: value ? 500 : 400 }}>{value || '—'}</p>
      )}
    </div>
  )

  return (
    <div style={{ width: 260, minWidth: 260, display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--border-color)', background: 'var(--bg-card)', overflow: 'hidden' }}>
      {/* header */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>Detalhes do Contacto</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={15} /></button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
        {/* avatar + name */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--border-color)' }}>
          <Avatar name={contact.name} size={52} />
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{contact.name}</p>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>{contact.email || contact.phone || '—'}</p>
          </div>
          <a href={`/contacts/${contact.id}`} style={{ fontSize: 12, color: '#c9a84c', fontWeight: 600, textDecoration: 'none' }}>Ver perfil completo →</a>
        </div>

        {/* edit toggle */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
          {editing ? (
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setEditing(false)} style={{ padding: '4px 10px', borderRadius: 7, border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={save} disabled={saving} style={{ padding: '4px 10px', borderRadius: 7, border: 'none', background: '#c9a84c', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', gap: 4, alignItems: 'center' }}>
                <Save size={11} /> {saving ? 'A guardar...' : 'Guardar'}
              </button>
            </div>
          ) : (
            <button onClick={() => setEditing(true)} style={{ padding: '4px 10px', borderRadius: 7, border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', display: 'flex', gap: 4, alignItems: 'center' }}>
              <Edit2 size={11} /> Editar
            </button>
          )}
        </div>

        {/* fields */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {row('Nome', form.name, 'name')}
          {row('Email', form.email, 'email')}
          {row('Telefone', form.phone, 'phone')}
          {editing ? (
            <div style={{ padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <p style={{ margin: '0 0 3px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tipo</p>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as any }))}
                style={{ width: '100%', padding: '5px 8px', borderRadius: 7, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }}>
                <option value="LEAD">Lead</option>
                <option value="CLIENT">Cliente</option>
                <option value="OWNER">Proprietário</option>
                <option value="PARTNER">Parceiro</option>
              </select>
            </div>
          ) : row('Tipo', contact.type)}
          {row('Fonte', form.source, 'source')}
          {editing ? (
            <div style={{ padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <p style={{ margin: '0 0 3px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Notas</p>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3}
                style={{ width: '100%', padding: '5px 8px', borderRadius: 7, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
            </div>
          ) : row('Notas', form.notes)}
        </div>

        {/* assigned */}
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-color)' }}>
          <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Responsável</p>
          <div style={{ fontSize: 13, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <User size={13} style={{ color: 'var(--text-muted)' }} />
            {users.find(u => u.id === contact.assignedToId)?.name || '—'}
          </div>
        </div>
      </div>

      {/* quick actions */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: 8 }}>
        <button
          onClick={() => contact.phone && window.dispatchEvent(new CustomEvent('softphone:dial', { detail: { number: contact.phone } }))}
          style={{ flex: 1, padding: '8px', borderRadius: 9, border: 'none', background: 'rgba(99,102,241,0.12)', color: '#818cf8', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
        >
          <Phone size={12} /> Ligar
        </button>
        <button style={{ flex: 1, padding: '8px', borderRadius: 9, border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
          <Tag size={12} /> Tag
        </button>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type InboxTab = 'unread' | 'all' | 'recents' | 'starred'

export const ConversationsPage: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [users, setUsers] = useState<UserType[]>([])
  const [selected, setSelected] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [tab, setTab] = useState<InboxTab>('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [msgLoading, setMsgLoading] = useState(false)
  const [msgText, setMsgText] = useState('')
  const [subject, setSubject] = useState('')
  const [sending, setSending] = useState(false)
  const [showNewModal, setShowNewModal] = useState(false)
  const [showContactPanel, setShowContactPanel] = useState(false)
  const [isLive, setIsLive] = useState(false)
  const [starred, setStarred] = useState<Set<string>>(new Set())
  const [readIds, setReadIds] = useState<Set<string>>(new Set())

  const bottomRef = useRef<HTMLDivElement>(null)
  const selectedIdRef = useRef<string | null>(null)
  const pollConvRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  const pollMsgRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  const sseRef = useRef<EventSource | undefined>(undefined)

  // ── load conversations ──
  const loadConversations = useCallback(async () => {
    try {
      const [convRes, usersRes] = await Promise.all([
        getConversations({ limit: 100 }),
        getUsers(),
      ])
      const convData: Conversation[] = Array.isArray(convRes.data)
        ? convRes.data
        : convRes.data?.data ?? []
      setConversations(convData)
      const usersData: UserType[] = Array.isArray(usersRes.data) ? usersRes.data : usersRes.data?.data ?? []
      setUsers(usersData)
    } catch (e) { console.error('Conversations load error', e) }
    setLoading(false)
  }, [])

  // ── load messages ──
  const loadMessages = useCallback(async (id: string) => {
    try {
      const res = await getConversation(id)
      const conv: Conversation = res.data
      setSelected(conv)
      setMessages(conv.messages || [])
    } catch (e) { console.error('Load messages error', e) }
    setMsgLoading(false)
  }, [])

  // ── initial load ──
  useEffect(() => { loadConversations() }, [loadConversations])

  // ── polling ──
  useEffect(() => {
    pollConvRef.current = setInterval(loadConversations, 5000)
    return () => clearInterval(pollConvRef.current)
  }, [loadConversations])

  useEffect(() => {
    if (!selected) { clearInterval(pollMsgRef.current); return }
    clearInterval(pollMsgRef.current)
    pollMsgRef.current = setInterval(() => loadMessages(selected.id), 5000)
    return () => clearInterval(pollMsgRef.current)
  }, [selected?.id, loadMessages])

  // ── SSE ──
  useEffect(() => {
    const token = getToken()
    if (!token) return
    const apiBase = (import.meta as any).env?.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000'
    const url = `${apiBase}/api/sse?token=${encodeURIComponent(token)}`
    const es = new EventSource(url)
    sseRef.current = es
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

  // ── scroll to bottom ──
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // ── select conversation ──
  const selectConv = (conv: Conversation) => {
    setSelected(conv)
    selectedIdRef.current = conv.id
    setMsgLoading(true)
    loadMessages(conv.id)
    setReadIds(r => new Set([...r, conv.id]))
  }

  // ── send ──
  const handleSend = async () => {
    if (!selected || !msgText.trim()) return
    setSending(true)
    try {
      const payload: any = { channel: selected.channel, content: msgText }
      if (selected.channel === 'EMAIL' && subject) payload.subject = subject
      const res = await sendMessage(selected.id, payload)
      setMessages(prev => [...prev, res.data?.message || res.data])
      setMsgText('')
      setSubject('')
      loadConversations()
    } catch (e) { console.error('Send error', e) }
    setSending(false)
  }

  // ── filter ──
  const filtered = conversations
    .filter(c => {
      if (tab === 'unread') return !readIds.has(c.id) && c.messages?.some((m: any) => m.direction === 'INBOUND')
      if (tab === 'starred') return starred.has(c.id)
      if (tab === 'recents') {
        const ms = Date.now() - new Date(c.lastMessageAt).getTime()
        return ms < 7 * 24 * 60 * 60 * 1000
      }
      return true
    })
    .filter(c => {
      if (!search) return true
      const name = c.contact?.name || c.externalId || ''
      return name.toLowerCase().includes(search.toLowerCase())
    })

  const unreadCount = conversations.filter(c =>
    !readIds.has(c.id) && c.messages?.some((m: any) => m.direction === 'INBOUND')
  ).length

  // ── group messages by date ──
  const groupedMessages = (() => {
    const groups: { date: string; messages: Message[] }[] = []
    let lastDate = ''
    for (const msg of messages) {
      try {
        const d = format(parseISO(msg.createdAt), 'dd MMM yyyy', { locale: pt })
        if (d !== lastDate) { groups.push({ date: d, messages: [] }); lastDate = d }
        groups[groups.length - 1].messages.push(msg)
      } catch { groups[groups.length - 1]?.messages.push(msg) }
    }
    return groups
  })()

  // ── tabs ──
  const tabs: { id: InboxTab; label: string; icon: React.FC<any> }[] = [
    { id: 'unread', label: 'Não lidas', icon: Inbox },
    { id: 'all', label: 'Todas', icon: MessageCircle },
    { id: 'recents', label: 'Recentes', icon: Clock },
    { id: 'starred', label: 'Favoritas', icon: Star },
  ]

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden', background: 'var(--bg-page)' }}>

      {/* ── LEFT: conversation list ── */}
      <div style={{ width: 300, minWidth: 300, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border-color)', background: 'var(--bg-card)', overflow: 'hidden' }}>

        {/* header */}
        <div style={{ padding: '14px 14px 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>Conversas</span>
              {isLive && (
                <span style={{ fontSize: 10, fontWeight: 700, color: '#22c55e', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block', animation: 'pulse 2s infinite' }} />
                  ao vivo
                </span>
              )}
            </div>
            <button
              onClick={() => setShowNewModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 8, border: 'none', background: '#c9a84c', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
            >
              <Plus size={12} /> Nova
            </button>
          </div>

          {/* tabs */}
          <div style={{ display: 'flex', gap: 2, marginBottom: 10, overflowX: 'auto' }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                padding: '7px 4px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: tab === t.id ? 'var(--accent-light)' : 'transparent',
                color: tab === t.id ? '#c9a84c' : 'var(--text-muted)',
                fontSize: 10, fontWeight: tab === t.id ? 700 : 500, position: 'relative',
              }}>
                <t.icon size={14} />
                {t.id === 'unread' && unreadCount > 0 && (
                  <span style={{ position: 'absolute', top: 2, right: 4, minWidth: 16, height: 16, borderRadius: 8, background: '#c9a84c', color: '#fff', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
                {t.label}
              </button>
            ))}
          </div>

          {/* search */}
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Pesquisar..."
              style={{ width: '100%', padding: '7px 10px 7px 30px', borderRadius: 9, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-primary)', fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {/* list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>A carregar...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <MessageCircle size={32} style={{ color: 'var(--text-muted)', display: 'block', margin: '0 auto 10px' }} />
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>Sem conversas</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0', opacity: 0.7 }}>As conversas aparecerão aqui</p>
            </div>
          ) : filtered.map(conv => {
            const lastMsg = conv.messages?.[0]
            const isUnread = !readIds.has(conv.id) && lastMsg?.direction === 'INBOUND'
            const name = conv.contact?.name || conv.externalId || 'Desconhecido'
            const isSelected = selected?.id === conv.id
            return (
              <div
                key={conv.id}
                onClick={() => selectConv(conv)}
                style={{
                  padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border-subtle)',
                  background: isSelected ? 'var(--accent-light)' : 'transparent',
                  borderLeft: isSelected ? '3px solid #c9a84c' : '3px solid transparent',
                  transition: 'all 100ms',
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--hover-bg)' }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = '' }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <Avatar name={name} size={38} channel={conv.channel} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: isUnread ? 700 : 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{fmtTime(conv.lastMessageAt)}</span>
                        {isUnread && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#c9a84c', flexShrink: 0 }} />}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
                      <p style={{ margin: 0, fontSize: 12, color: isUnread ? 'var(--text-secondary)' : 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                        {lastMsg?.direction === 'OUTBOUND' ? '↗ ' : ''}
                        {lastMsg?.subject || lastMsg?.content || 'Sem mensagens'}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 6, flexShrink: 0 }}>
                        <button
                          onClick={e => { e.stopPropagation(); setStarred(s => { const n = new Set(s); n.has(conv.id) ? n.delete(conv.id) : n.add(conv.id); return n }) }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: starred.has(conv.id) ? '#f59e0b' : 'transparent', opacity: starred.has(conv.id) ? 1 : 0 }}
                          className="star-btn"
                        >
                          <Star size={11} fill={starred.has(conv.id) ? '#f59e0b' : 'none'} />
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

      {/* ── MIDDLE: thread ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {selected ? (
          <>
            {/* thread header */}
            <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar name={selected.contact?.name || selected.externalId || '?'} size={36} channel={selected.channel} />
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
                    {selected.contact?.name || selected.externalId || 'Desconhecido'}
                  </p>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <ChannelIcon channel={selected.channel} size={11} />
                    {selected.channel} · {selected.externalId || '—'}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => setShowContactPanel(v => !v)}
                  style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border-color)', background: showContactPanel ? 'var(--accent-light)' : 'transparent', color: showContactPanel ? '#c9a84c' : 'var(--text-muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', gap: 5, alignItems: 'center' }}
                >
                  <User size={13} /> Detalhes
                </button>
                <select
                  value={selected.status}
                  onChange={async e => {
                    await updateConversationStatus(selected.id, e.target.value)
                    setSelected(s => s ? { ...s, status: e.target.value as any } : null)
                    loadConversations()
                  }}
                  style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--input-bg)', color: 'var(--text-primary)', fontSize: 12, cursor: 'pointer', outline: 'none' }}
                >
                  <option value="OPEN">Aberta</option>
                  <option value="RESOLVED">Resolvida</option>
                  <option value="ARCHIVED">Arquivada</option>
                </select>
                <select
                  value={selected.assignedToId || ''}
                  onChange={async e => {
                    await assignConversation(selected.id, e.target.value)
                    setSelected(s => s ? { ...s, assignedToId: e.target.value } : null)
                  }}
                  style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--input-bg)', color: 'var(--text-primary)', fontSize: 12, cursor: 'pointer', outline: 'none' }}
                >
                  <option value="">Sem responsável</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
            </div>

            {/* messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
              {msgLoading ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>A carregar mensagens...</div>
              ) : messages.length === 0 ? (
                <div style={{ padding: 60, textAlign: 'center' }}>
                  <MessageCircle size={36} style={{ color: 'var(--text-muted)', display: 'block', margin: '0 auto 12px' }} />
                  <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>Sem mensagens ainda</p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0', opacity: 0.7 }}>Envia a primeira mensagem abaixo</p>
                </div>
              ) : (
                groupedMessages.map(group => (
                  <div key={group.date}>
                    <DateDivider date={group.date} />
                    {group.messages.map(msg => (
                      <MessageBubble key={msg.id} msg={msg} isOutbound={msg.direction === 'OUTBOUND'} />
                    ))}
                  </div>
                ))
              )}
              <div ref={bottomRef} />
            </div>

            {/* input */}
            <div style={{ borderTop: '1px solid var(--border-color)', background: 'var(--bg-card)', padding: '12px 16px', flexShrink: 0 }}>
              {selected.channel === 'EMAIL' && (
                <input
                  value={subject} onChange={e => setSubject(e.target.value)}
                  placeholder="Assunto..."
                  style={{ width: '100%', marginBottom: 8, padding: '7px 12px', borderRadius: 8, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                />
              )}
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 10px', borderRadius: 8, background: 'var(--bg-page)', border: '1px solid var(--border-color)', flexShrink: 0 }}>
                  <ChannelIcon channel={selected.channel} size={14} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>{selected.channel}</span>
                </div>
                <textarea
                  value={msgText}
                  onChange={e => setMsgText(e.target.value)}
                  onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); handleSend() } }}
                  placeholder={`Escreve uma mensagem... (Ctrl+Enter para enviar)`}
                  rows={2}
                  style={{ flex: 1, padding: '9px 12px', borderRadius: 10, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-primary)', fontSize: 13, resize: 'none', outline: 'none', lineHeight: 1.5, fontFamily: 'inherit' }}
                />
                <button
                  onClick={handleSend}
                  disabled={!msgText.trim() || sending}
                  style={{
                    width: 40, height: 40, borderRadius: 10, border: 'none', cursor: !msgText.trim() || sending ? 'not-allowed' : 'pointer',
                    background: !msgText.trim() || sending ? 'var(--bg-page)' : 'linear-gradient(135deg,#1a2e4a,#c9a84c)',
                    color: !msgText.trim() || sending ? 'var(--text-muted)' : '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}
                >
                  <Send size={16} />
                </button>
              </div>
              <p style={{ margin: '6px 0 0', fontSize: 10, color: 'var(--text-muted)', textAlign: 'right' }}>Ctrl+Enter para enviar</p>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MessageCircle size={28} style={{ color: '#c9a84c' }} />
            </div>
            <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-secondary)', margin: 0 }}>Selecione uma conversa</p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>Clique numa conversa para ver as mensagens</p>
          </div>
        )}
      </div>

      {/* ── RIGHT: contact details ── */}
      {selected && showContactPanel && selected.contact && (
        <ContactDetailsPanel
          contact={selected.contact}
          users={users}
          onClose={() => setShowContactPanel(false)}
        />
      )}

      {/* ── right empty state when no contact ── */}
      {selected && showContactPanel && !selected.contact && (
        <div style={{ width: 260, minWidth: 260, borderLeft: '1px solid var(--border-color)', background: 'var(--bg-card)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 }}>
          <User size={32} style={{ color: 'var(--text-muted)' }} />
          <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', margin: 0 }}>Sem contacto associado a esta conversa</p>
        </div>
      )}

      {/* ── Nova Conversa modal ── */}
      {showNewModal && (
        <NewConvModal
          onClose={() => setShowNewModal(false)}
          onCreated={conv => { setShowNewModal(false); loadConversations(); selectConv(conv) }}
        />
      )}

      <style>{`
        .star-btn { opacity: 0 !important; }
        div:hover > div > div > .star-btn,
        div:hover .star-btn { opacity: 1 !important; }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:.4 } }
      `}</style>
    </div>
  )
}
