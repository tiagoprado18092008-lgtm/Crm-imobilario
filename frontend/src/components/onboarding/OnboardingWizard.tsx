import React, { useState } from 'react'
import { Check, User, Target, Zap } from 'lucide-react'
import { useAuthStore } from '../../store/auth.store'
import api from '../../api/client'

const GRADIENTS = [
  'linear-gradient(135deg, #6366f1, #8b5cf6)',
  'linear-gradient(135deg, #3b82f6, #06b6d4)',
  'linear-gradient(135deg, #10b981, #34d399)',
  'linear-gradient(135deg, #f59e0b, #f97316)',
  'linear-gradient(135deg, #ef4444, #ec4899)',
  'linear-gradient(135deg, #8b5cf6, #ec4899)',
]

const AREAS = [
  { id: 'compra_venda', label: 'Compra & Venda', desc: 'Leads de compradores e vendedores de imóveis', icon: '🏠' },
  { id: 'arrendamento', label: 'Arrendamento', desc: 'Gestão de arrendamentos e contratos', icon: '🔑' },
  { id: 'angariacao', label: 'Angariação', desc: 'Captação de novas propriedades e proprietários', icon: '📋' },
  { id: 'misto', label: 'Misto', desc: 'Todas as áreas do negócio imobiliário', icon: '⚡' },
]

interface Props {
  onComplete: () => void
}

export const OnboardingWizard: React.FC<Props> = ({ onComplete }) => {
  const { user, setAuth, token } = useAuthStore()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)

  const [name, setName] = useState(user?.name ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [selectedGradient, setSelectedGradient] = useState(0)
  const [selectedArea, setSelectedArea] = useState<string | null>(null)

  const STEPS = [
    { label: 'Perfil', icon: User },
    { label: 'Área', icon: Target },
    { label: 'Pronto', icon: Zap },
  ]

  const canNext = () => {
    if (step === 0) return name.trim().length > 0
    if (step === 1) return selectedArea !== null
    return true
  }

  const handleNext = async () => {
    if (step === 0) {
      try {
        await api.patch(`/users/${user!.id}`, {
          name,
          phone: phone || undefined,
          avatarUrl: GRADIENTS[selectedGradient],
        })
        if (user && token) {
          setAuth({ ...user, name, phone: phone || user.phone, avatarUrl: GRADIENTS[selectedGradient] }, token)
        }
      } catch { /* ignore */ }
    }

    if (step < 2) {
      setStep(s => s + 1)
      return
    }

    // Step 2 — finish
    setSaving(true)
    try {
      await api.patch(`/users/${user!.id}`, { onboardingCompleted: true })
      if (user && token) {
        setAuth({ ...user, onboardingCompleted: true }, token)
      }
    } catch { /* ignore */ }
    setSaving(false)
    onComplete()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(4,8,20,0.85)', backdropFilter: 'blur(8px)',
    }}>
      <div style={{
        background: '#0d1626',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 24,
        width: '100%', maxWidth: 520,
        maxHeight: '90vh', overflow: 'auto',
        boxShadow: '0 32px 64px rgba(0,0,0,0.5)',
        padding: '40px 36px',
      }}>
        {/* Progress steps */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 40 }}>
          {STEPS.map((s, i) => {
            const done = i < step
            const active = i === step
            const Icon = s.icon
            return (
              <React.Fragment key={i}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: done ? '#10b981' : active ? '#6366f1' : 'rgba(255,255,255,0.06)',
                    border: done ? '2px solid #10b981' : active ? '2px solid #6366f1' : '2px solid rgba(255,255,255,0.1)',
                    transition: 'all 300ms',
                  }}>
                    {done
                      ? <Check size={16} color="#fff" />
                      : <Icon size={16} color={active ? '#fff' : 'rgba(255,255,255,0.3)'} />
                    }
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 600, letterSpacing: '0.05em',
                    color: active ? '#818cf8' : done ? '#34d399' : 'rgba(255,255,255,0.25)',
                    textTransform: 'uppercase',
                  }}>{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{
                    height: 1, width: 56, marginBottom: 22,
                    background: i < step ? '#10b981' : 'rgba(255,255,255,0.08)',
                    transition: 'background 300ms',
                  }} />
                )}
              </React.Fragment>
            )
          })}
        </div>

        {/* Step 0: Perfil */}
        {step === 0 && (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
              Bem-vindo ao CasaFlow
            </h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', margin: '0 0 28px' }}>
              Vamos configurar o teu perfil em segundos.
            </p>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 6 }}>
                Nome *
              </label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                style={{
                  width: '100%', padding: '11px 14px',
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 12, color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box',
                }}
                placeholder="O teu nome completo"
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 6 }}>
                Telemóvel
              </label>
              <input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                style={{
                  width: '100%', padding: '11px 14px',
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 12, color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box',
                }}
                placeholder="+351 912 345 678"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 10 }}>
                Cor do avatar
              </label>
              <div style={{ display: 'flex', gap: 10 }}>
                {GRADIENTS.map((g, i) => (
                  <button key={i} onClick={() => setSelectedGradient(i)} style={{
                    width: 36, height: 36, borderRadius: '50%', background: g, cursor: 'pointer',
                    border: selectedGradient === i ? '3px solid #818cf8' : '3px solid transparent',
                    boxShadow: selectedGradient === i ? '0 0 0 2px rgba(99,102,241,0.4)' : 'none',
                    transition: 'all 200ms',
                  }} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Área de foco */}
        {step === 1 && (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
              Qual é a tua área principal?
            </h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', margin: '0 0 24px' }}>
              Vamos personalizar a tua experiência.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {AREAS.map(area => {
                const selected = selectedArea === area.id
                return (
                  <button key={area.id} onClick={() => setSelectedArea(area.id)} style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 18px', borderRadius: 14, cursor: 'pointer', textAlign: 'left',
                    background: selected ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.03)',
                    border: selected ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.07)',
                    transition: 'all 180ms',
                  }}>
                    <span style={{ fontSize: 24, flexShrink: 0 }}>{area.icon}</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: selected ? '#a5b4fc' : '#fff' }}>{area.label}</div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{area.desc}</div>
                    </div>
                    {selected && (
                      <div style={{
                        marginLeft: 'auto', width: 22, height: 22, borderRadius: '50%',
                        background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <Check size={12} color="#fff" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Step 2: Pronto */}
        {step === 2 && (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%', margin: '0 auto 20px',
              background: 'rgba(99,102,241,0.15)', border: '2px solid rgba(99,102,241,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Zap size={30} color="#818cf8" />
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: '#fff', margin: '0 0 10px', letterSpacing: '-0.02em' }}>
              Tudo pronto, {name.split(' ')[0]}!
            </h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', margin: '0 0 28px', lineHeight: 1.6 }}>
              O teu CRM está configurado.<br />Começa por adicionar os teus primeiros contactos.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'left' }}>
              {[
                '✓ Perfil configurado',
                '✓ Automações prontas a usar',
                '✓ Canais de comunicação disponíveis',
              ].map(item => (
                <div key={item} style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', padding: '8px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
                  {item}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginTop: 32, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div>
            {step > 0 && step < 2 && (
              <button onClick={() => setStep(s => s - 1)} style={{
                background: 'transparent', color: 'rgba(255,255,255,0.4)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 22px',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}>Voltar</button>
            )}
          </div>
          <button
            onClick={handleNext}
            disabled={!canNext() || saving}
            style={{
              background: canNext() && !saving ? 'linear-gradient(135deg,#6366f1,#4f46e5)' : 'rgba(255,255,255,0.08)',
              color: canNext() && !saving ? '#fff' : 'rgba(255,255,255,0.3)',
              border: 'none', borderRadius: 10, padding: '10px 28px',
              fontSize: 14, fontWeight: 600, cursor: canNext() && !saving ? 'pointer' : 'not-allowed',
              transition: 'all 200ms', minWidth: 120,
            }}
          >
            {saving ? 'A guardar...' : step === 2 ? 'Entrar no CRM' : 'Seguinte →'}
          </button>
        </div>
      </div>
    </div>
  )
}
