import React, { useState } from 'react'
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

const SNAPSHOTS = [
  {
    id: 'compradores',
    title: 'Compradores',
    desc: 'Automacoes para acompanhamento de compradores: follow-up automatico, alertas de novas propriedades.',
    automations: [
      { name: 'Follow-up Comprador 24h', trigger: 'NEW_LEAD', actions: JSON.stringify([{ type: 'SEND_EMAIL', template: 'welcome_buyer' }]) },
    ],
  },
  {
    id: 'angariacao',
    title: 'Angariacao',
    desc: 'Automacoes para angariacao: notificacao de visitas, lembretes de contacto com proprietarios.',
    automations: [
      { name: 'Lembrete Angariacao', trigger: 'VISIT_SCHEDULED', actions: JSON.stringify([{ type: 'CREATE_TASK', template: 'follow_up_owner' }]) },
    ],
  },
  {
    id: 'arrendamento',
    title: 'Arrendamento',
    desc: 'Automacoes para arrendamento: renovacao de contratos, lembretes de pagamento.',
    automations: [
      { name: 'Lembrete Arrendamento', trigger: 'NO_RESPONSE_2H', actions: JSON.stringify([{ type: 'SEND_SMS', template: 'rental_reminder' }]) },
    ],
  },
]

interface Props {
  onComplete: () => void
}

export const OnboardingWizard: React.FC<Props> = ({ onComplete }) => {
  const { user, setAuth } = useAuthStore()
  const token = useAuthStore((s) => s.token)
  const [step, setStep] = useState(0)

  // Step 1
  const [name, setName] = useState(user?.name ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [selectedGradient, setSelectedGradient] = useState(0)

  // Step 3
  const [appliedSnapshots, setAppliedSnapshots] = useState<Set<string>>(new Set())
  const [applyingSnapshot, setApplyingSnapshot] = useState<string | null>(null)

  // Step 4
  const [leadName, setLeadName] = useState('')
  const [leadEmail, setLeadEmail] = useState('')
  const [leadPhone, setLeadPhone] = useState('')
  const [leadSource, setLeadSource] = useState('Website')
  const [leadCreated, setLeadCreated] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const canNext = () => {
    if (step === 0) return name.trim().length > 0
    if (step === 3) return leadCreated
    return true
  }

  const handleNext = async () => {
    if (step === 0) {
      // Save profile
      try {
        await api.patch(`/users/${user!.id}/self`, { name, phone, avatarUrl: GRADIENTS[selectedGradient] })
      } catch { /* ignore */ }
    }
    if (step < 3) {
      setStep(step + 1)
    } else {
      // Complete onboarding
      try {
        await api.patch(`/users/${user!.id}/self`, { onboardingCompleted: true })
        if (user && token) {
          setAuth({ ...user, onboardingCompleted: true }, token)
        }
      } catch { /* ignore */ }
      onComplete()
    }
  }

  const applySnapshot = async (snapshot: typeof SNAPSHOTS[0]) => {
    setApplyingSnapshot(snapshot.id)
    try {
      for (const auto of snapshot.automations) {
        await api.post('/automations', auto)
      }
      setAppliedSnapshots((prev) => new Set(prev).add(snapshot.id))
    } catch { /* ignore */ }
    setApplyingSnapshot(null)
  }

  const createLead = async () => {
    if (!leadName.trim()) return
    setSubmitting(true)
    try {
      await api.post('/contacts', { name: leadName, email: leadEmail || undefined, phone: leadPhone || undefined, source: leadSource })
      setLeadCreated(true)
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 3000)
    } catch { /* ignore */ }
    setSubmitting(false)
  }

  const overlayStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(8px)',
  }

  const cardStyle: React.CSSProperties = {
    background: '#fff', borderRadius: 20, width: '100%', maxWidth: 560, maxHeight: '90vh', overflow: 'auto',
    boxShadow: '0 25px 50px rgba(0,0,0,0.25)', padding: '40px 36px',
  }

  const btnPrimary: React.CSSProperties = {
    background: '#6366f1', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 28px',
    fontSize: 14, fontWeight: 600, cursor: 'pointer',
  }

  const btnSecondary: React.CSSProperties = {
    background: 'transparent', color: '#6366f1', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 28px',
    fontSize: 14, fontWeight: 600, cursor: 'pointer',
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14,
    outline: 'none', boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 4, display: 'block' }

  return (
    <div style={overlayStyle}>
      {showConfetti && <Confetti />}
      <div style={cardStyle}>
        {/* Progress */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 32 }}>
          {[0, 1, 2, 3].map((i) => (
            <React.Fragment key={i}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700,
                background: i <= step ? '#6366f1' : '#e2e8f0',
                color: i <= step ? '#fff' : '#94a3b8',
                transition: 'all 300ms',
              }}>{i + 1}</div>
              {i < 3 && <div style={{ width: 40, height: 2, background: i < step ? '#6366f1' : '#e2e8f0', transition: 'all 300ms' }} />}
            </React.Fragment>
          ))}
        </div>

        {/* Step 1: Perfil */}
        {step === 0 && (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', margin: '0 0 4px' }}>Bem-vindo ao CRM!</h2>
            <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 24px' }}>Vamos configurar o seu perfil.</p>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Nome</label>
              <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Telefone</label>
              <input style={inputStyle} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+351 912 345 678" />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Cor do Avatar</label>
              <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                {GRADIENTS.map((g, i) => (
                  <div key={i} onClick={() => setSelectedGradient(i)} style={{
                    width: 36, height: 36, borderRadius: '50%', background: g, cursor: 'pointer',
                    border: selectedGradient === i ? '3px solid #6366f1' : '3px solid transparent',
                    boxShadow: selectedGradient === i ? '0 0 0 2px #c7d2fe' : 'none',
                  }} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Integracoes */}
        {step === 1 && (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', margin: '0 0 4px' }}>Integracoes</h2>
            <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 24px' }}>Conecte as suas ferramentas favoritas.</p>
            {[
              { icon: '💬', name: 'WhatsApp', desc: 'Envie e receba mensagens WhatsApp diretamente do CRM.' },
              { icon: '📧', name: 'Email SMTP', desc: 'Configure o envio de emails com o seu servidor SMTP.' },
              { icon: '📞', name: 'Twilio', desc: 'Chamadas e SMS integrados com Twilio.' },
            ].map((item) => (
              <div key={item.name} style={{
                border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 20px', marginBottom: 12,
                display: 'flex', alignItems: 'center', gap: 14,
              }}>
                <span style={{ fontSize: 28 }}>{item.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, color: '#1e293b' }}>{item.name}</div>
                  <div style={{ fontSize: 13, color: '#64748b' }}>{item.desc}</div>
                  <div style={{ fontSize: 12, color: '#6366f1', marginTop: 4 }}>Configure em Configuracoes</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Step 3: Snapshots */}
        {step === 2 && (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', margin: '0 0 4px' }}>Snapshots de Automacao</h2>
            <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 24px' }}>Aplique templates de automacao pre-configurados.</p>
            {SNAPSHOTS.map((s) => (
              <div key={s.id} style={{
                border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 20px', marginBottom: 12,
              }}>
                <div style={{ fontWeight: 600, fontSize: 15, color: '#1e293b', marginBottom: 4 }}>{s.title}</div>
                <div style={{ fontSize: 13, color: '#64748b', marginBottom: 10 }}>{s.desc}</div>
                {appliedSnapshots.has(s.id) ? (
                  <span style={{ fontSize: 13, color: '#10b981', fontWeight: 600 }}>✓ Aplicado</span>
                ) : (
                  <button
                    onClick={() => applySnapshot(s)}
                    disabled={applyingSnapshot === s.id}
                    style={{ ...btnSecondary, padding: '6px 16px', fontSize: 13 }}
                  >
                    {applyingSnapshot === s.id ? 'A aplicar...' : 'Aplicar'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Step 4: Primeiro Lead */}
        {step === 3 && (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', margin: '0 0 4px' }}>Crie o seu primeiro lead</h2>
            <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 24px' }}>Adicione o primeiro contacto ao CRM.</p>
            {!leadCreated ? (
              <>
                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>Nome *</label>
                  <input style={inputStyle} value={leadName} onChange={(e) => setLeadName(e.target.value)} />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>Email</label>
                  <input style={inputStyle} value={leadEmail} onChange={(e) => setLeadEmail(e.target.value)} />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>Telefone</label>
                  <input style={inputStyle} value={leadPhone} onChange={(e) => setLeadPhone(e.target.value)} />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>Origem</label>
                  <select style={{ ...inputStyle, cursor: 'pointer' }} value={leadSource} onChange={(e) => setLeadSource(e.target.value)}>
                    <option>Website</option>
                    <option>Indicacao</option>
                    <option>Idealista</option>
                    <option>Imovirtual</option>
                    <option>Redes Sociais</option>
                    <option>Outro</option>
                  </select>
                </div>
                <button onClick={createLead} disabled={submitting || !leadName.trim()} style={{ ...btnPrimary, opacity: submitting || !leadName.trim() ? 0.5 : 1 }}>
                  {submitting ? 'A criar...' : 'Criar Lead'}
                </button>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#1e293b' }}>Lead criado com sucesso!</div>
                <div style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>O seu CRM esta pronto a usar.</div>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28, paddingTop: 20, borderTop: '1px solid #f1f5f9' }}>
          <div>
            {step > 0 && (
              <button onClick={() => setStep(step - 1)} style={btnSecondary}>Voltar</button>
            )}
          </div>
          <button onClick={handleNext} disabled={!canNext()} style={{ ...btnPrimary, opacity: canNext() ? 1 : 0.5 }}>
            {step === 3 ? 'Concluir' : 'Seguinte'}
          </button>
        </div>
      </div>
    </div>
  )
}

const Confetti: React.FC = () => {
  const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#3b82f6']
  const particles = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.5,
    color: colors[i % colors.length],
    size: 6 + Math.random() * 6,
    duration: 1.5 + Math.random() * 1.5,
  }))

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 10000 }}>
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(-10px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
      {particles.map((p) => (
        <div key={p.id} style={{
          position: 'absolute', top: 0, left: `${p.left}%`,
          width: p.size, height: p.size, borderRadius: p.size > 9 ? 2 : '50%',
          background: p.color,
          animation: `confetti-fall ${p.duration}s ease-in ${p.delay}s forwards`,
        }} />
      ))}
    </div>
  )
}
