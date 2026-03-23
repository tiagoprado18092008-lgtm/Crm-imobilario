import React, { useEffect, useRef, useState } from 'react'
import {
  MessageCircle, Mail, Instagram, Phone, Search,
  Send, Paperclip, ExternalLink, Check, CheckCheck,
  MoreHorizontal,
} from 'lucide-react'
import { formatDistanceToNow, format, parseISO } from 'date-fns'
import { pt } from 'date-fns/locale'
import {
  getConversations, getConversation, sendMessage,
  updateConversationStatus, assignConversation,
} from '../api/conversations.api'
import { getUsers } from '../api/users.api'
import type { Conversation, Message, User as UserType } from '../types'

const CHANNEL_COLORS: Record<string, string> = {
  WHATSAPP: '#25d366',
  EMAIL: '#3b82f6',
  INSTAGRAM: '#e1306c',
  INTERNAL: '#64748b',
}

const CHANNEL_LABELS: Record<string, string> = {
  WHATSAPP: 'WhatsApp',
  EMAIL: 'Email',
  INSTAGRAM: 'Instagram',
  INTERNAL: 'Interno',
}

type ChannelFilter = 'ALL' | 'WHATSAPP' | 'EMAIL' | 'INSTAGRAM'

const ChannelIcon: React.FC<{ channel: string; size?: number }> = ({ channel, size = 14 }) => {
  const color = CHANNEL_COLORS[channel] || '#64748b'
  if (channel === 'WHATSAPP') return <MessageCircle size={size} style={{ color }} />
  if (channel === 'EMAIL') return <Mail size={size} style={{ color }} />
  if (channel === 'INSTAGRAM') return <Instagram size={size} style={{ color }} />
  return <MessageCircle size={size} style={{ color }} />
}

const StatusIcon: React.FC<{ status: string }> = ({ status }) => {
  if (status === 'READ') return <CheckCheck size={12} className="text-blue-400" />
  if (status === 'DELIVERED') return <CheckCheck size={12} className="text-slate-400" />
  return <Check size={12} className="text-slate-400" />
}

export const ConversationsPage: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selected, setSelected] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [users, setUsers] = useState<UserType[]>([])
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('ALL')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [msgLoading, setMsgLoading] = useState(false)
  const [sendChannel, setSendChannel] = useState<string>('WHATSAPP')
  const [subject, setSubject] = useState('')
  const [msgText, setMsgText] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const [convRes, usersRes] = await Promise.all([
          getConversations({ limit: 50 }),
          getUsers(),
        ])
        const convData = Array.isArray(convRes.data) ? convRes.data : convRes.data?.data ?? []
        setConversations(convData)
        const usersData = Array.isArray(usersRes.data) ? usersRes.data : usersRes.data?.data ?? []
        setUsers(usersData)
      } catch (e) {
        console.error('Conversations load error', e)
      }
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    if (!selected) return
    const loadConv = async () => {
      setMsgLoading(true)
      try {
        const res = await getConversation(selected.id)
        const conv: Conversation = res.data
        setSelected(conv)
        setMessages(conv.messages || [])
        setSendChannel(conv.channel)
      } catch (e) {
        console.error('Conversation load error', e)
      }
      setMsgLoading(false)
    }
    loadConv()
  }, [selected?.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const filteredConvs = conversations
    .filter((c) => channelFilter === 'ALL' || c.channel === channelFilter)
    .filter((c) => {
      if (!search) return true
      const name = c.contact?.name || c.externalId || ''
      return name.toLowerCase().includes(search.toLowerCase())
    })

  const handleSend = async () => {
    if (!selected || !msgText.trim()) return
    setSending(true)
    try {
      const payload: any = { channel: sendChannel, content: msgText }
      if (sendChannel === 'EMAIL' && subject) payload.subject = subject
      const res = await sendMessage(selected.id, payload)
      const newMsg: Message = res.data
      setMessages((prev) => [...prev, newMsg])
      setMsgText('')
      setSubject('')
    } catch (e) {
      console.error('Send error', e)
    }
    setSending(false)
  }

  const handleStatusChange = async (status: string) => {
    if (!selected) return
    try {
      await updateConversationStatus(selected.id, status)
      setSelected((prev) => prev ? { ...prev, status: status as any } : null)
      setConversations((prev) =>
        prev.map((c) => c.id === selected.id ? { ...c, status: status as any } : c)
      )
    } catch (e) {
      console.error('Status update error', e)
    }
  }

  const handleAssign = async (userId: string) => {
    if (!selected) return
    try {
      await assignConversation(selected.id, userId)
      const u = users.find((u) => u.id === userId)
      setSelected((prev) => prev ? { ...prev, assignedToId: userId, assignedTo: u } : null)
    } catch (e) {
      console.error('Assign error', e)
    }
  }

  return (
    <div className="flex h-full overflow-hidden" style={{ height: 'calc(100vh - 64px)' }}>
      {/* Left panel */}
      <div
        className="flex flex-col border-r border-slate-200 bg-white flex-shrink-0 overflow-hidden"
        style={{ width: 280 }}
      >
        {/* Channel filter */}
        <div className="px-3 pt-4 pb-2">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(['ALL', 'WHATSAPP', 'EMAIL', 'INSTAGRAM'] as ChannelFilter[]).map((ch) => (
              <button
                key={ch}
                onClick={() => setChannelFilter(ch)}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-xs font-medium transition-all"
                style={{
                  background: channelFilter === ch ? '#fff' : 'transparent',
                  color: channelFilter === ch ? '#0f172a' : '#64748b',
                  boxShadow: channelFilter === ch ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                {ch === 'ALL' ? (
                  <MessageCircle size={12} />
                ) : (
                  <ChannelIcon channel={ch} size={12} />
                )}
                {ch === 'ALL' ? 'Todas' : CHANNEL_LABELS[ch]}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="px-3 pb-2">
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-lg">
            <Search size={13} className="text-slate-400 flex-shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar conversas..."
              className="flex-1 bg-transparent text-sm text-slate-700 placeholder-slate-400 outline-none"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredConvs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <MessageCircle size={32} className="text-slate-300 mb-3" />
              <p className="text-sm text-slate-400 font-medium">Sem conversas</p>
              <p className="text-xs text-slate-300 mt-1">
                {channelFilter !== 'ALL' ? 'Nenhuma conversa neste canal' : 'As conversas aparecerão aqui'}
              </p>
            </div>
          ) : (
            filteredConvs.map((conv) => {
              const isActive = selected?.id === conv.id
              const lastMsg = conv.messages?.[conv.messages.length - 1]
              const contactName = conv.contact?.name || conv.externalId || 'Desconhecido'
              const timeAgo = conv.lastMessageAt
                ? formatDistanceToNow(parseISO(conv.lastMessageAt), { addSuffix: true, locale: pt })
                : ''
              return (
                <div
                  key={conv.id}
                  onClick={() => setSelected(conv)}
                  className="flex items-start gap-3 px-3 py-3 cursor-pointer border-b border-slate-50 hover:bg-slate-50"
                  style={{ background: isActive ? '#eff6ff' : undefined }}
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm font-bold"
                    style={{ background: CHANNEL_COLORS[conv.channel] || '#64748b' }}
                  >
                    {contactName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-sm font-semibold text-slate-800 truncate">{contactName}</span>
                      <span className="text-xs text-slate-400 flex-shrink-0">{timeAgo}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <ChannelIcon channel={conv.channel} size={11} />
                      <span className="text-xs text-slate-400 truncate">
                        {lastMsg ? lastMsg.content : 'Nenhuma mensagem'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span
                        className="text-xs px-1.5 py-0.5 rounded font-medium"
                        style={{
                          background: conv.status === 'OPEN' ? '#dbeafe' : conv.status === 'RESOLVED' ? '#d1fae5' : '#f1f5f9',
                          color: conv.status === 'OPEN' ? '#1d4ed8' : conv.status === 'RESOLVED' ? '#065f46' : '#64748b',
                        }}
                      >
                        {conv.status === 'OPEN' ? 'Aberta' : conv.status === 'RESOLVED' ? 'Resolvida' : 'Arquivada'}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Middle panel */}
      <div className="flex-1 flex flex-col bg-white border-r border-slate-200 overflow-hidden">
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: '#dbeafe' }}
            >
              <MessageCircle size={28} className="text-blue-500" />
            </div>
            <h3 className="text-base font-semibold text-slate-700 mb-1">Selecione uma conversa</h3>
            <p className="text-sm text-slate-400">Clique numa conversa para ver as mensagens</p>
          </div>
        ) : (
          <>
            {/* Thread header */}
            <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100 flex-shrink-0">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                style={{ background: CHANNEL_COLORS[selected.channel] || '#64748b' }}
              >
                {(selected.contact?.name || selected.externalId || 'D').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 text-sm">
                  {selected.contact?.name || selected.externalId || 'Desconhecido'}
                </p>
                <div className="flex items-center gap-1">
                  <ChannelIcon channel={selected.channel} size={11} />
                  <span className="text-xs text-slate-400">{CHANNEL_LABELS[selected.channel]}</span>
                </div>
              </div>
              <button className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <MoreHorizontal size={16} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3" style={{ background: '#f8fafc' }}>
              {msgLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-6 h-6 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <MessageCircle size={28} className="text-slate-300 mb-2" />
                  <p className="text-sm text-slate-400">Sem mensagens ainda</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isOut = msg.direction === 'OUTBOUND'
                  return (
                    <div key={msg.id} className={`flex ${isOut ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className="max-w-xs lg:max-w-md rounded-2xl px-4 py-2.5"
                        style={{
                          background: isOut ? '#0066ff' : '#fff',
                          color: isOut ? '#fff' : '#0f172a',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                          borderRadius: isOut ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        }}
                      >
                        {msg.subject && (
                          <p className="text-xs font-semibold mb-1 opacity-80">{msg.subject}</p>
                        )}
                        <p className="text-sm leading-relaxed">{msg.content}</p>
                        <div className={`flex items-center gap-1 mt-1 ${isOut ? 'justify-end' : 'justify-start'}`}>
                          <span className="text-xs opacity-60">
                            {msg.createdAt ? format(parseISO(msg.createdAt), 'HH:mm') : ''}
                          </span>
                          {isOut && <StatusIcon status={msg.status} />}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input area */}
            <div className="flex-shrink-0 border-t border-slate-100 bg-white">
              {/* Channel tabs */}
              <div className="flex items-center gap-0 px-4 pt-3">
                {(['WHATSAPP', 'EMAIL', 'INSTAGRAM'] as const).map((ch) => (
                  <button
                    key={ch}
                    onClick={() => setSendChannel(ch)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-t-lg border border-b-0 transition-all"
                    style={{
                      background: sendChannel === ch ? '#fff' : '#f8fafc',
                      borderColor: sendChannel === ch ? '#e2e8f0' : 'transparent',
                      color: sendChannel === ch ? CHANNEL_COLORS[ch] : '#94a3b8',
                    }}
                  >
                    <ChannelIcon channel={ch} size={11} />
                    {CHANNEL_LABELS[ch]}
                  </button>
                ))}
              </div>
              <div className="px-4 pb-4 pt-0 space-y-2" style={{ borderTop: '1px solid #e2e8f0' }}>
                {sendChannel === 'EMAIL' && (
                  <input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Assunto..."
                    className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-400 mt-2"
                  />
                )}
                <div className="flex items-end gap-2 mt-2">
                  <textarea
                    value={msgText}
                    onChange={(e) => setMsgText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSend()
                      }
                    }}
                    placeholder="Escreva uma mensagem... (Enter para enviar)"
                    rows={2}
                    className="flex-1 text-sm px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-400 resize-none"
                    style={{ minHeight: 60 }}
                  />
                  <div className="flex flex-col gap-1.5">
                    <button className="p-2.5 rounded-xl text-slate-400 hover:bg-slate-100">
                      <Paperclip size={16} />
                    </button>
                    <button
                      onClick={handleSend}
                      disabled={sending || !msgText.trim()}
                      className="p-2.5 rounded-xl text-white transition-all"
                      style={{
                        background: msgText.trim() ? '#0066ff' : '#cbd5e1',
                        cursor: msgText.trim() ? 'pointer' : 'not-allowed',
                      }}
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Right panel: contact info */}
      <div
        className="flex-col bg-white overflow-y-auto hidden lg:flex flex-shrink-0"
        style={{ width: 320 }}
      >
        {!selected ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <p className="text-sm text-slate-300">Nenhuma conversa selecionada</p>
          </div>
        ) : (
          <div className="p-5 space-y-5">
            {/* Contact */}
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Contacto</h4>
              {selected.contact ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}
                    >
                      {selected.contact.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{selected.contact.name}</p>
                      <a
                        href={`/contacts/${selected.contact.id}`}
                        className="text-xs text-blue-600 hover:underline flex items-center gap-0.5"
                      >
                        Ver Contacto <ExternalLink size={10} />
                      </a>
                    </div>
                  </div>
                  {selected.contact.phone && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Phone size={13} className="text-slate-400 flex-shrink-0" />
                      {selected.contact.phone}
                    </div>
                  )}
                  {selected.contact.email && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Mail size={13} className="text-slate-400 flex-shrink-0" />
                      <span className="truncate">{selected.contact.email}</span>
                    </div>
                  )}
                  {selected.contact.whatsapp && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <MessageCircle size={13} style={{ color: '#25d366', flexShrink: 0 }} />
                      {selected.contact.whatsapp}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-400">Sem contacto associado</p>
              )}
            </div>

            <div className="border-t border-slate-100" />

            {/* Status */}
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Estado da Conversa</h4>
              <div className="flex flex-wrap gap-2">
                {(['OPEN', 'RESOLVED', 'ARCHIVED'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
                    style={{
                      background: selected.status === s ? (s === 'OPEN' ? '#dbeafe' : s === 'RESOLVED' ? '#d1fae5' : '#f1f5f9') : '#fff',
                      color: selected.status === s ? (s === 'OPEN' ? '#1d4ed8' : s === 'RESOLVED' ? '#065f46' : '#64748b') : '#64748b',
                      borderColor: selected.status === s ? 'transparent' : '#e2e8f0',
                    }}
                  >
                    {s === 'OPEN' ? 'Aberta' : s === 'RESOLVED' ? 'Resolvida' : 'Arquivada'}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-100" />

            {/* Assign */}
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Atribuído a</h4>
              <select
                value={selected.assignedToId || ''}
                onChange={(e) => handleAssign(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-400 bg-white text-slate-700"
              >
                <option value="">-- Não atribuído --</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>

            <div className="border-t border-slate-100" />

            {/* Conversation info */}
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Informações</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Canal</span>
                  <div className="flex items-center gap-1">
                    <ChannelIcon channel={selected.channel} size={12} />
                    <span className="font-medium text-slate-700">{CHANNEL_LABELS[selected.channel]}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Criada em</span>
                  <span className="font-medium text-slate-700">
                    {selected.createdAt ? format(parseISO(selected.createdAt), 'dd/MM/yyyy HH:mm') : '–'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Última mensagem</span>
                  <span className="font-medium text-slate-700">
                    {selected.lastMessageAt
                      ? formatDistanceToNow(parseISO(selected.lastMessageAt), { addSuffix: true, locale: pt })
                      : '–'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
