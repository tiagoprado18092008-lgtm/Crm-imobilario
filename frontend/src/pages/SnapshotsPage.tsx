import React, { useState } from 'react'
import { Copy, CheckCircle, Package, Users, Home, Key } from 'lucide-react'

interface Snapshot {
  id: string
  name: string
  description: string
  category: 'BUYERS' | 'SELLERS' | 'RENTAL'
  automations: number
  templates: number
  stages: string[]
}

const SNAPSHOTS: Snapshot[] = [
  {
    id: '1',
    name: 'Snapshot Compradores',
    description: 'Pipeline completo para gestão de compradores — desde o primeiro contacto até escritura. Inclui automações de resposta rápida, lembretes de visita e follow-up pós-proposta.',
    category: 'BUYERS',
    automations: 5,
    templates: 8,
    stages: ['Novo Lead', 'Qualificação', 'Visita Agendada', 'Proposta', 'Negociação', 'Escritura'],
  },
  {
    id: '2',
    name: 'Snapshot Angariação',
    description: 'Fluxo otimizado para angariação de imóveis — contacto com proprietários, avaliação, captação e promoção. Inclui templates de apresentação e follow-up automático.',
    category: 'SELLERS',
    automations: 4,
    templates: 6,
    stages: ['Contacto Inicial', 'Avaliação', 'Mandato Assinado', 'Promoção', 'Negociação', 'Escritura'],
  },
  {
    id: '3',
    name: 'Snapshot Arrendamento',
    description: 'Pipeline para gestão de arrendamentos — desde o lead de inquilino até contrato assinado. Inclui verificação de documentação e automações de agendamento de visitas.',
    category: 'RENTAL',
    automations: 3,
    templates: 5,
    stages: ['Pedido', 'Visita', 'Documentação', 'Contrato', 'Entrega de Chaves'],
  },
]

const CATEGORY_CONFIG = {
  BUYERS: { label: 'Compradores', icon: Users, color: '#3b82f6', bg: '#dbeafe' },
  SELLERS: { label: 'Angariação', icon: Home, color: '#8b5cf6', bg: '#ede9fe' },
  RENTAL: { label: 'Arrendamento', icon: Key, color: '#f59e0b', bg: '#fef3c7' },
}

import api from '../api/client'

export const SnapshotsPage: React.FC = () => {
  const [applied, setApplied] = useState<string[]>([])
  const [loading, setLoading] = useState<string | null>(null)

  const SNAPSHOT_AUTOMATIONS: Record<string, any[]> = {
    '1': [
      { name: 'Boas-vindas ao novo lead', trigger: 'NEW_LEAD', isActive: true, actions: JSON.stringify([{ type: 'SEND_WHATSAPP', message: 'Olá {{nome}}! Obrigado pelo interesse. Sou consultor imobiliário e estou aqui para ajudar. Que tipo de imóvel procura?' }]) },
      { name: 'Lembrete de visita', trigger: 'VISIT_SCHEDULED', isActive: true, actions: JSON.stringify([{ type: 'SEND_WHATSAPP', message: 'Olá {{nome}}! Lembro-lhe que tem uma visita agendada amanhã. Confirma?' }]) },
      { name: 'Follow-up pós-proposta', trigger: 'PROPOSAL_SENT', isActive: true, actions: JSON.stringify([{ type: 'SEND_WHATSAPP', message: 'Olá {{nome}}! Já teve oportunidade de analisar a proposta? Estou disponível para esclarecer dúvidas.' }]) },
      { name: 'Chamada perdida - SMS automático', trigger: 'MISSED_CALL', isActive: true, actions: JSON.stringify([{ type: 'SEND_SMS', message: 'Olá! Vi a sua chamada. Estou numa visita mas entrarei em contacto brevemente.' }]) },
      { name: 'Lead qualificado - criar tarefa', trigger: 'LEAD_QUALIFIED', isActive: true, actions: JSON.stringify([{ type: 'CREATE_TASK', title: 'Enviar proposta ao lead qualificado', priority: 'HIGH' }]) },
    ],
    '2': [
      { name: 'Contacto com proprietário', trigger: 'NEW_LEAD', isActive: true, actions: JSON.stringify([{ type: 'SEND_EMAIL', subject: 'Avaliação gratuita do seu imóvel', message: 'Olá! Gostaria de lhe apresentar os nossos serviços de angariação...' }]) },
      { name: 'Lembrete avaliação', trigger: 'VISIT_SCHEDULED', isActive: true, actions: JSON.stringify([{ type: 'SEND_WHATSAPP', message: 'Olá! A avaliação do seu imóvel está agendada para amanhã. Confirma?' }]) },
      { name: 'Follow-up mandato', trigger: 'PROPOSAL_SENT', isActive: true, actions: JSON.stringify([{ type: 'CREATE_TASK', title: 'Ligar ao proprietário sobre mandato', priority: 'HIGH' }]) },
      { name: 'Chamada perdida proprietário', trigger: 'MISSED_CALL', isActive: true, actions: JSON.stringify([{ type: 'SEND_SMS', message: 'Olá! Vi a sua chamada. Entrarei em contacto brevemente.' }]) },
    ],
    '3': [
      { name: 'Boas-vindas arrendamento', trigger: 'NEW_LEAD', isActive: true, actions: JSON.stringify([{ type: 'SEND_WHATSAPP', message: 'Olá {{nome}}! Obrigado pelo interesse. Que tipo de imóvel procura para arrendamento?' }]) },
      { name: 'Confirmar visita', trigger: 'VISIT_SCHEDULED', isActive: true, actions: JSON.stringify([{ type: 'SEND_WHATSAPP', message: 'Olá! A visita ao imóvel está confirmada. Qualquer dúvida, contacte-nos.' }]) },
      { name: 'Lembrete documentação', trigger: 'LEAD_QUALIFIED', isActive: true, actions: JSON.stringify([{ type: 'CREATE_TASK', title: 'Solicitar documentação ao inquilino', priority: 'MEDIUM' }]) },
    ],
  }

  const applySnapshot = async (id: string) => {
    setLoading(id)
    try {
      const automations = SNAPSHOT_AUTOMATIONS[id] || []
      for (const automation of automations) {
        await api.post('/automations', automation)
      }
      setApplied(a => [...a, id])
      setTimeout(() => setApplied(a => a.filter(x => x !== id)), 4000)
    } catch (e) {
      console.error('Snapshot error', e)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Snapshots</h2>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          Modelos prontos com automações e pipelines pré-configurados — como o GoHighLevel
        </p>
      </div>

      <div className="grid gap-5">
        {SNAPSHOTS.map(snap => {
          const cfg = CATEGORY_CONFIG[snap.category]
          const Icon = cfg.icon
          const isApplied = applied.includes(snap.id)

          return (
            <div key={snap.id} className="rounded-2xl border p-6" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: cfg.bg }}>
                    <Icon size={22} style={{ color: cfg.color }} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>{snap.name}</h3>
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: cfg.bg, color: cfg.color }}>
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{snap.description}</p>

                    <div className="flex items-center gap-4 mt-3">
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{snap.automations} automações</span>
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{snap.templates} templates</span>
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{snap.stages.length} etapas</span>
                    </div>

                    {/* Pipeline stages */}
                    <div className="flex items-center gap-1.5 mt-4 flex-wrap">
                      {snap.stages.map((stage, i) => (
                        <React.Fragment key={stage}>
                          <span className="text-xs px-2.5 py-1 rounded-lg font-medium" style={{ background: 'var(--hover-bg)', color: 'var(--text-secondary)', border: '1px solid var(--input-border)' }}>
                            {stage}
                          </span>
                          {i < snap.stages.length - 1 && (
                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>→</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => applySnapshot(snap.id)}
                  disabled={loading === snap.id}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold flex-shrink-0 ml-4 disabled:opacity-60"
                  style={{
                    background: isApplied ? '#dcfce7' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    color: isApplied ? '#16a34a' : '#fff',
                    border: 'none',
                    cursor: loading === snap.id ? 'wait' : 'pointer',
                    transition: 'all 0.3s',
                  }}
                >
                  {isApplied ? (
                    <><CheckCircle size={15} /> Aplicado!</>
                  ) : loading === snap.id ? (
                    <>A aplicar...</>
                  ) : (
                    <><Copy size={15} /> Aplicar Snapshot</>
                  )}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="rounded-2xl border p-6" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <div className="flex items-center gap-3 mb-4">
          <Package size={20} style={{ color: 'var(--text-muted)' }} />
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>O que inclui cada Snapshot?</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: '', title: 'Automações prontas', desc: 'Speed to Lead, Missed Call, lembretes de visita' },
            { icon: '', title: 'Templates de mensagem', desc: 'WhatsApp, Email e SMS pré-escritos em português' },
            { icon: '', title: 'Pipeline configurado', desc: 'Etapas do funil ajustadas ao tipo de negócio' },
            { icon: '', title: 'Tarefas automáticas', desc: 'Checklist de follow-up criado automaticamente' },
          ].map(item => (
            <div key={item.title} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'var(--hover-bg)' }}>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{item.title}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
