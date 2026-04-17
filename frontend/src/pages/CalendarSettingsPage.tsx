import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Settings, RefreshCw, Link, Unlink, Clock } from 'lucide-react'
import {
  getCalendarStatus,
  syncCalendar,
  connectGoogle,
  connectOutlook,
  disconnectProvider,
  getCalendarSlots,
  updateCalendarSlots,
} from '../api/calendar.api'
import { SyncStatusBadge } from '../components/calendar/SyncStatusBadge'
import { useUIStore } from '../store/ui.store'
import { useAuthStore } from '../store/auth.store'

type Tab = 'integrations' | 'availability' | 'notifications'

const DAYS = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado']

const defaultSlots = DAYS.map((_, i) => ({
  dayOfWeek: i,
  startTime: '09:00',
  endTime: '18:00',
  isAvailable: i >= 1 && i <= 5, // Mon–Fri
}))

export const CalendarSettingsPage: React.FC = () => {
  const { showToast } = useUIStore()
  const { token } = useAuthStore()
  const [searchParams] = useSearchParams()
  const [tab, setTab] = useState<Tab>('integrations')
  const [integrations, setIntegrations] = useState<any[]>([])
  const [syncing, setSyncing] = useState(false)
  const [slots, setSlots] = useState(defaultSlots)
  const [savingSlots, setSavingSlots] = useState(false)
  const [notifEmail, setNotifEmail] = useState(
    () => localStorage.getItem('cal_notif_email') === 'true'
  )
  const [notifReminder, setNotifReminder] = useState(
    () => localStorage.getItem('cal_notif_reminder') || '30'
  )

  useEffect(() => {
    loadStatus()
    loadSlots()
  }, [])

  useEffect(() => {
    const connected = searchParams.get('connected')
    const error = searchParams.get('error')
    if (connected) {
      showToast(`${connected === 'google' ? 'Google' : 'Outlook'} Calendar ligado com sucesso!`, 'success')
      loadStatus()
    }
    if (error) {
      showToast(`Erro ao ligar ${error === 'google' ? 'Google' : 'Outlook'} Calendar`, 'error')
    }
  }, [searchParams])

  const loadStatus = async () => {
    try {
      const res = await getCalendarStatus()
      setIntegrations(res.data)
    } catch {}
  }

  const loadSlots = async () => {
    try {
      const res = await getCalendarSlots()
      if (res.data.length > 0) setSlots(res.data)
    } catch {}
  }

  const handleSync = async () => {
    setSyncing(true)
    try {
      await syncCalendar()
      showToast('Sincronização concluída', 'success')
      loadStatus()
    } catch {
      showToast('Erro na sincronização', 'error')
    } finally {
      setSyncing(false)
    }
  }

  const handleDisconnect = async (provider: string) => {
    try {
      await disconnectProvider(provider)
      showToast('Integração desligada', 'success')
      loadStatus()
    } catch {
      showToast('Erro ao desligar', 'error')
    }
  }

  const handleSaveSlots = async () => {
    setSavingSlots(true)
    try {
      await updateCalendarSlots(slots)
      showToast('Disponibilidade guardada', 'success')
    } catch {
      showToast('Erro ao guardar', 'error')
    } finally {
      setSavingSlots(false)
    }
  }

  const googleIntegration = integrations.find(i => i.provider === 'google')
  const outlookIntegration = integrations.find(i => i.provider === 'outlook')

  const tabStyle = (t: Tab): React.CSSProperties => ({
    padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
    fontSize: 13, fontWeight: 600,
    background: tab === t ? 'var(--accent)' : 'transparent',
    color: tab === t ? '#fff' : 'var(--text-secondary)',
  })

  const cardStyle: React.CSSProperties = {
    background: 'var(--bg-card)', border: '1px solid var(--border-color)',
    borderRadius: 12, padding: '16px 20px', marginBottom: 14,
  }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '24px 16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <Settings size={20} color="var(--accent)" />
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
          Definições de Calendário
        </h1>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, padding: 4,
        background: 'var(--hover-bg)', borderRadius: 10, width: 'fit-content' }}>
        <button style={tabStyle('integrations')} onClick={() => setTab('integrations')}>Integrações</button>
        <button style={tabStyle('availability')} onClick={() => setTab('availability')}>Disponibilidade</button>
        <button style={tabStyle('notifications')} onClick={() => setTab('notifications')}>Notificações</button>
      </div>

      {/* Tab: Integrations */}
      {tab === 'integrations' && (
        <div>
          {/* Google */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg"
                    alt="Google Calendar"
                    width="26" height="26"
                    style={{ objectFit: 'contain' }}
                  />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                    Google Calendar
                  </p>
                  {googleIntegration?.isActive ? (
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                      {googleIntegration.email}
                    </p>
                  ) : (
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>Não ligado</p>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {googleIntegration?.isActive && (
                  <SyncStatusBadge
                    lastSyncedAt={googleIntegration.lastSyncedAt}
                    syncing={syncing}
                    onRetry={handleSync}
                  />
                )}
                {googleIntegration?.isActive ? (
                  <button onClick={() => handleDisconnect('google')} style={{
                    display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px',
                    borderRadius: 8, border: '1px solid var(--border-color)',
                    background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  }}>
                    <Unlink size={13} /> Desligar
                  </button>
                ) : (
                  <button onClick={() => connectGoogle(token || '')} style={{
                    display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px',
                    borderRadius: 8, border: 'none',
                    background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  }}>
                    <Link size={13} /> Ligar com Google
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Outlook */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/d/df/Microsoft_Office_Outlook_%282018%E2%80%93present%29.svg"
                    alt="Outlook Calendar"
                    width="26" height="26"
                    style={{ objectFit: 'contain' }}
                  />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                    Outlook Calendar
                  </p>
                  {outlookIntegration?.isActive ? (
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                      {outlookIntegration.email}
                    </p>
                  ) : (
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>Não ligado</p>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {outlookIntegration?.isActive && (
                  <SyncStatusBadge
                    lastSyncedAt={outlookIntegration.lastSyncedAt}
                    syncing={syncing}
                    onRetry={handleSync}
                  />
                )}
                {outlookIntegration?.isActive ? (
                  <button onClick={() => handleDisconnect('outlook')} style={{
                    display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px',
                    borderRadius: 8, border: '1px solid var(--border-color)',
                    background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  }}>
                    <Unlink size={13} /> Desligar
                  </button>
                ) : (
                  <button onClick={() => connectOutlook(token || '')} style={{
                    display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px',
                    borderRadius: 8, border: 'none',
                    background: '#0078d4', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  }}>
                    <Link size={13} /> Ligar com Outlook
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Sync button */}
          {(googleIntegration?.isActive || outlookIntegration?.isActive) && (
            <button onClick={handleSync} disabled={syncing} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '9px 20px', borderRadius: 8, border: '1px solid var(--border-color)',
              background: 'transparent', color: 'var(--text-secondary)', cursor: syncing ? 'not-allowed' : 'pointer',
              fontSize: 13, fontWeight: 600, opacity: syncing ? 0.6 : 1,
            }}>
              <RefreshCw size={14} style={syncing ? { animation: 'spin 1s linear infinite' } : {}} />
              {syncing ? 'A sincronizar...' : 'Sincronizar agora'}
            </button>
          )}
        </div>
      )}

      {/* Tab: Availability */}
      {tab === 'availability' && (
        <div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
            Define os teus horários de disponibilidade semanal.
          </p>
          {slots.map((slot, i) => (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '100px 1fr 1fr 50px', gap: 10, alignItems: 'center',
              padding: '10px 0', borderBottom: '1px solid var(--border-color)',
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                {DAYS[slot.dayOfWeek]}
              </span>
              <input type="time" value={slot.startTime} disabled={!slot.isAvailable}
                onChange={e => {
                  const updated = [...slots]
                  updated[i] = { ...updated[i], startTime: e.target.value }
                  setSlots(updated)
                }}
                style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border-color)',
                  background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 12 }} />
              <input type="time" value={slot.endTime} disabled={!slot.isAvailable}
                onChange={e => {
                  const updated = [...slots]
                  updated[i] = { ...updated[i], endTime: e.target.value }
                  setSlots(updated)
                }}
                style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border-color)',
                  background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 12 }} />
              <input type="checkbox" checked={slot.isAvailable}
                onChange={e => {
                  const updated = [...slots]
                  updated[i] = { ...updated[i], isAvailable: e.target.checked }
                  setSlots(updated)
                }} />
            </div>
          ))}
          <button onClick={handleSaveSlots} disabled={savingSlots} style={{
            marginTop: 20, padding: '9px 24px', borderRadius: 8, border: 'none',
            background: 'var(--accent)', color: '#fff', cursor: savingSlots ? 'not-allowed' : 'pointer',
            fontSize: 13, fontWeight: 600, opacity: savingSlots ? 0.7 : 1,
          }}>
            {savingSlots ? 'A guardar...' : 'Guardar disponibilidade'}
          </button>
        </div>
      )}

      {/* Tab: Notifications */}
      {tab === 'notifications' && (
        <div>
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                  Email ao criar evento
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                  Receber confirmação por email quando um evento é criado
                </p>
              </div>
              <input type="checkbox" checked={notifEmail}
                onChange={e => {
                  setNotifEmail(e.target.checked)
                  localStorage.setItem('cal_notif_email', String(e.target.checked))
                }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                  Lembrete antes do evento
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                  Notificação X minutos antes
                </p>
              </div>
              <select value={notifReminder}
                onChange={e => {
                  setNotifReminder(e.target.value)
                  localStorage.setItem('cal_notif_reminder', e.target.value)
                }}
                style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border-color)',
                  background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 12 }}>
                <option value="0">Desligado</option>
                <option value="10">10 minutos</option>
                <option value="30">30 minutos</option>
                <option value="60">1 hora</option>
                <option value="1440">1 dia</option>
              </select>
            </div>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
            As preferências de notificação são guardadas localmente. O envio de emails será activado numa versão futura.
          </p>
        </div>
      )}
    </div>
  )
}
