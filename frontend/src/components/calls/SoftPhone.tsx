import React, { useState, useEffect, useRef } from 'react'
import {
  Phone, PhoneOff, PhoneCall, Mic, MicOff, Volume2, VolumeX,
  Minimize2, Delete, Loader2,
} from 'lucide-react'
import { Device, Call } from '@twilio/voice-sdk'
import { getCallToken, initiateCall as apiInitiateCall } from '../../api/calls.api'
import { useUIStore } from '../../store/ui.store'

type SoftPhoneState = 'idle' | 'connecting' | 'ringing' | 'in-call' | 'error'

const DIAL_KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['*', '0', '#'],
]

export const SoftPhone: React.FC = () => {
  const { showToast } = useUIStore()
  const [expanded, setExpanded] = useState(false)
  const [phoneState, setPhoneState] = useState<SoftPhoneState>('idle')
  const [dialNumber, setDialNumber] = useState('')
  const [muted, setMuted] = useState(false)
  const [speakerOff, setSpeakerOff] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const [configured, setConfigured] = useState(false)
  const [loading, setLoading] = useState(false)

  const deviceRef = useRef<Device | null>(null)
  const callRef = useRef<Call | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const durationRef = useRef(0)

  useEffect(() => {
    getCallToken()
      .then((res) => {
        if (res.data.configured) {
          setConfigured(true)
          initDevice(res.data.token)
        }
      })
      .catch(() => {
        setConfigured(false)
      })

    // Listen for softphone:dial events from other components
    const handler = (e: Event) => {
      const ce = e as CustomEvent
      setDialNumber(ce.detail?.number || '')
      setExpanded(true)
    }
    window.addEventListener('softphone:dial', handler)

    return () => {
      window.removeEventListener('softphone:dial', handler)
      if (timerRef.current) clearInterval(timerRef.current)
      if (deviceRef.current) deviceRef.current.destroy()
    }
  }, [])

  const initDevice = async (token: string) => {
    try {
      const device = new Device(token, {
        logLevel: 1,
        codecPreferences: [Call.Codec.Opus, Call.Codec.PCMU],
      })

      device.on('registered', () => console.log('[Twilio] Device registered'))
      device.on('error', (err: any) => {
        console.error('[Twilio] Device error', err)
        setPhoneState('error')
      })
      device.on('incoming', (call: Call) => {
        callRef.current = call
        setPhoneState('ringing')
        setExpanded(true)
        showToast(`Chamada recebida de ${call.parameters.From}`, 'info')

        call.on('disconnect', () => endCall())
        call.on('cancel', () => endCall())
      })

      await device.register()
      deviceRef.current = device
    } catch (err) {
      console.error('[Twilio] Init error', err)
    }
  }

  const startTimer = () => {
    durationRef.current = 0
    setCallDuration(0)
    timerRef.current = setInterval(() => {
      durationRef.current++
      setCallDuration(durationRef.current)
    }, 1000)
  }

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0')
    const sec = (s % 60).toString().padStart(2, '0')
    return `${m}:${sec}`
  }

  const handleDial = (key: string) => {
    if (dialNumber.length < 20) setDialNumber((prev) => prev + key)
    if (callRef.current && phoneState === 'in-call') {
      callRef.current.sendDigits(key)
    }
  }

  const handleDelete = () => setDialNumber((prev) => prev.slice(0, -1))

  const handleCall = async () => {
    if (!dialNumber) return
    setLoading(true)
    setPhoneState('connecting')

    try {
      if (configured && deviceRef.current) {
        const call = await deviceRef.current.connect({
          params: { To: dialNumber },
        })
        callRef.current = call

        call.on('accept', () => {
          setPhoneState('in-call')
          startTimer()
          setLoading(false)
        })
        call.on('disconnect', () => endCall())
        call.on('error', (err: any) => {
          console.error('[Twilio Call Error]', err)
          setPhoneState('error')
          setLoading(false)
          showToast('Erro na chamada', 'error')
        })

        await apiInitiateCall({ to: dialNumber })
      } else {
        // Demo mode
        await apiInitiateCall({ to: dialNumber })
        setTimeout(() => {
          setPhoneState('in-call')
          startTimer()
          setLoading(false)
          showToast(`Chamada registada para ${dialNumber}`, 'info')
        }, 1500)
      }
    } catch (err) {
      console.error('[Call Error]', err)
      setPhoneState('error')
      setLoading(false)
      showToast('Erro ao iniciar chamada', 'error')
    }
  }

  const handleHangup = () => {
    if (callRef.current) {
      callRef.current.disconnect()
    }
    endCall()
  }

  const handleAnswer = () => {
    if (callRef.current) {
      callRef.current.accept()
      setPhoneState('in-call')
      startTimer()
    }
  }

  const handleReject = () => {
    if (callRef.current) {
      callRef.current.reject()
    }
    endCall()
  }

  const endCall = () => {
    stopTimer()
    setPhoneState('idle')
    setMuted(false)
    callRef.current = null
    showToast(`Chamada terminada — ${formatDuration(durationRef.current)}`, 'info')
  }

  const toggleMute = () => {
    if (callRef.current) {
      const newMuted = !muted
      callRef.current.mute(newMuted)
      setMuted(newMuted)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 8,
      }}
    >
      {/* Expanded softphone panel */}
      {expanded && (
        <div
          style={{
            width: 280,
            background: '#1e293b',
            borderRadius: 16,
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {/* Header */}
          <div
            style={{
              background: '#0f172a',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: configured ? '#22c55e' : '#f59e0b',
                }}
              />
              <span style={{ color: '#94a3b8', fontSize: 12, fontWeight: 500 }}>
                {configured ? 'Twilio conectado' : 'Twilio não configurado'}
              </span>
            </div>
            <button
              onClick={() => setExpanded(false)}
              style={{
                color: '#475569',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 4,
              }}
            >
              <Minimize2 size={14} />
            </button>
          </div>

          {/* Status / number display */}
          <div style={{ padding: '16px 16px 8px', textAlign: 'center' }}>
            {phoneState === 'in-call' && (
              <div
                style={{
                  color: '#22c55e',
                  fontSize: 11,
                  fontWeight: 600,
                  marginBottom: 4,
                  letterSpacing: '0.05em',
                }}
              >
                EM CHAMADA — {formatDuration(callDuration)}
              </div>
            )}
            {phoneState === 'connecting' && (
              <div style={{ color: '#f59e0b', fontSize: 11, fontWeight: 600, marginBottom: 4 }}>
                A LIGAR...
              </div>
            )}
            {phoneState === 'ringing' && (
              <div style={{ color: '#3b82f6', fontSize: 11, fontWeight: 600, marginBottom: 4 }}>
                CHAMADA RECEBIDA
              </div>
            )}

            <div
              style={{
                background: '#0f172a',
                borderRadius: 10,
                padding: '10px 16px',
                fontSize: 22,
                fontWeight: 700,
                color: '#fff',
                letterSpacing: '0.08em',
                minHeight: 48,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ flex: 1, textAlign: 'center' }}>
                {dialNumber || (
                  <span style={{ color: '#334155', fontSize: 14 }}>Introduza número</span>
                )}
              </span>
              {dialNumber && (
                <button
                  onClick={handleDelete}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#475569',
                    padding: '0 0 0 8px',
                  }}
                >
                  <Delete size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Dial pad */}
          {phoneState !== 'ringing' && (
            <div style={{ padding: '4px 16px 12px' }}>
              {DIAL_KEYS.map((row, ri) => (
                <div key={ri} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  {row.map((key) => (
                    <button
                      key={key}
                      onClick={() => handleDial(key)}
                      style={{
                        flex: 1,
                        height: 44,
                        borderRadius: 10,
                        background: '#334155',
                        border: 'none',
                        color: '#e2e8f0',
                        fontSize: 18,
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'background 100ms',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#475569')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '#334155')}
                    >
                      {key}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Call controls */}
          <div style={{ padding: '0 16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {phoneState === 'idle' || phoneState === 'error' ? (
              <button
                onClick={handleCall}
                disabled={!dialNumber || loading}
                style={{
                  width: '100%',
                  height: 52,
                  borderRadius: 12,
                  background: dialNumber
                    ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                    : '#1e3a2f',
                  border: 'none',
                  color: '#fff',
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: dialNumber ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow: dialNumber ? '0 4px 16px rgba(34,197,94,0.3)' : 'none',
                }}
              >
                {loading ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <Phone size={20} />
                )}
                {loading ? 'A ligar...' : 'Ligar'}
              </button>
            ) : phoneState === 'ringing' ? (
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={handleAnswer}
                  style={{
                    flex: 1,
                    height: 52,
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                    border: 'none',
                    color: '#fff',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <Phone size={18} /> Atender
                </button>
                <button
                  onClick={handleReject}
                  style={{
                    flex: 1,
                    height: 52,
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                    border: 'none',
                    color: '#fff',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <PhoneOff size={18} /> Rejeitar
                </button>
              </div>
            ) : (
              // In-call controls
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={toggleMute}
                    style={{
                      flex: 1,
                      height: 44,
                      borderRadius: 10,
                      background: muted ? '#3b82f6' : '#334155',
                      border: 'none',
                      color: '#fff',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                  >
                    {muted ? <MicOff size={16} /> : <Mic size={16} />}
                    {muted ? 'Sem som' : 'Microfone'}
                  </button>
                  <button
                    onClick={() => setSpeakerOff(!speakerOff)}
                    style={{
                      flex: 1,
                      height: 44,
                      borderRadius: 10,
                      background: speakerOff ? '#3b82f6' : '#334155',
                      border: 'none',
                      color: '#fff',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                  >
                    {speakerOff ? <VolumeX size={16} /> : <Volume2 size={16} />}
                    Altifalante
                  </button>
                </div>
                <button
                  onClick={handleHangup}
                  style={{
                    width: '100%',
                    height: 52,
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                    border: 'none',
                    color: '#fff',
                    fontSize: 16,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    boxShadow: '0 4px 16px rgba(239,68,68,0.3)',
                  }}
                >
                  <PhoneOff size={20} /> Desligar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background:
            phoneState === 'in-call'
              ? 'linear-gradient(135deg, #22c55e, #16a34a)'
              : phoneState === 'ringing'
              ? 'linear-gradient(135deg, #3b82f6, #2563eb)'
              : 'linear-gradient(135deg, #1e293b, #0f172a)',
          border: '2px solid rgba(255,255,255,0.1)',
          boxShadow:
            phoneState === 'in-call'
              ? '0 0 0 4px rgba(34,197,94,0.2), 0 8px 24px rgba(0,0,0,0.3)'
              : phoneState === 'ringing'
              ? '0 0 0 4px rgba(59,130,246,0.3), 0 8px 24px rgba(0,0,0,0.3)'
              : '0 8px 24px rgba(0,0,0,0.3)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          animation: phoneState === 'ringing' ? 'softphone-pulse 1s infinite' : 'none',
        }}
        title="Softphone"
      >
        {phoneState === 'in-call' ? <PhoneCall size={22} /> : <Phone size={22} />}
      </button>

      <style>{`
        @keyframes softphone-pulse {
          0%, 100% { box-shadow: 0 0 0 4px rgba(59,130,246,0.3), 0 8px 24px rgba(0,0,0,0.3); }
          50% { box-shadow: 0 0 0 8px rgba(59,130,246,0.1), 0 8px 24px rgba(0,0,0,0.3); }
        }
      `}</style>
    </div>
  )
}
