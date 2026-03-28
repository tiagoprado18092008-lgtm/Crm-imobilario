import { useEffect, useRef, useState, useCallback } from 'react'
import { useAuthStore } from '../store/auth.store'

export interface AppNotification {
  id: string
  event: string
  title: string
  body: string
  link?: string
  read: boolean
  at: Date
}

const MAX = 20

export const useNotifications = () => {
  const { token } = useAuthStore()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const esRef = useRef<EventSource | null>(null)

  const addNotif = useCallback((event: string, data: any) => {
    const notif: AppNotification = {
      id: `${Date.now()}-${Math.random()}`,
      event,
      title: data.title || event,
      body: data.body || '',
      link: data.link,
      read: false,
      at: new Date(),
    }
    setNotifications(prev => [notif, ...prev].slice(0, MAX))
  }, [])

  useEffect(() => {
    if (!token) return

    const apiBase = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/$/, '')
    const url = `${apiBase}/notifications/stream`

    // EventSource doesn't support custom headers — pass token via cookie or query param
    // We use a workaround: pass token in URL for SSE only
    const es = new EventSource(`${url}?token=${token}`)
    esRef.current = es

    const handleEvent = (type: string) => (e: MessageEvent) => {
      try { addNotif(type, JSON.parse(e.data)) } catch {}
    }

    es.addEventListener('new_lead', handleEvent('new_lead'))
    es.addEventListener('new_message', handleEvent('new_message'))
    es.addEventListener('task_due', handleEvent('task_due'))
    es.addEventListener('automation_fired', handleEvent('automation_fired'))

    es.onerror = () => {
      // Auto-reconnects by browser
    }

    return () => {
      es.close()
      esRef.current = null
    }
  }, [token, addNotif])

  const markRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }, [])

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }, [])

  const unreadCount = notifications.filter(n => !n.read).length

  return { notifications, unreadCount, markRead, markAllRead }
}
