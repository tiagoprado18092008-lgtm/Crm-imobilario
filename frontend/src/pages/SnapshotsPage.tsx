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

export const SnapshotsPage: React.FC = () => {
  const [applied, setApplied] = useState<string[]>([])

  const applySnapshot = (id: string) => {
    setApplied(a => [...a, id])
    setTimeout(() => setApplied(a => a.filter(x => x !== id)), 3000)
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Snapshots</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Modelos prontos com automações e pipelines pré-configurados — como o GoHighLevel
        </p>
      </div>

      <div className="grid gap-5">
        {SNAPSHOTS.map(snap => {
          const cfg = CATEGORY_CONFIG[snap.category]
          const Icon = cfg.icon
          const isApplied = applied.includes(snap.id)

          return (
            <div key={snap.id} className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: cfg.bg }}>
                    <Icon size={22} style={{ color: cfg.color }} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-slate-900">{snap.name}</h3>
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: cfg.bg, color: cfg.color }}>
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 leading-relaxed">{snap.description}</p>

                    <div className="flex items-center gap-4 mt-3">
                      <span className="text-xs text-slate-500">⚡ {snap.automations} automações</span>
                      <span className="text-xs text-slate-500">📝 {snap.templates} templates</span>
                      <span className="text-xs text-slate-500">📊 {snap.stages.length} etapas</span>
                    </div>

                    {/* Pipeline stages */}
                    <div className="flex items-center gap-1.5 mt-4 flex-wrap">
                      {snap.stages.map((stage, i) => (
                        <React.Fragment key={stage}>
                          <span className="text-xs px-2.5 py-1 rounded-lg font-medium" style={{ background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0' }}>
                            {stage}
                          </span>
                          {i < snap.stages.length - 1 && (
                            <span className="text-slate-300 text-xs">→</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => applySnapshot(snap.id)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold flex-shrink-0 ml-4"
                  style={{
                    background: isApplied ? '#dcfce7' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                    color: isApplied ? '#16a34a' : '#fff',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                  }}
                >
                  {isApplied ? (
                    <><CheckCircle size={15} /> Aplicado!</>
                  ) : (
                    <><Copy size={15} /> Aplicar Snapshot</>
                  )}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Package size={20} className="text-slate-400" />
          <h3 className="font-semibold text-slate-800">O que inclui cada Snapshot?</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: '⚡', title: 'Automações prontas', desc: 'Speed to Lead, Missed Call, lembretes de visita' },
            { icon: '📝', title: 'Templates de mensagem', desc: 'WhatsApp, Email e SMS pré-escritos em português' },
            { icon: '📊', title: 'Pipeline configurado', desc: 'Etapas do funil ajustadas ao tipo de negócio' },
            { icon: '✅', title: 'Tarefas automáticas', desc: 'Checklist de follow-up criado automaticamente' },
          ].map(item => (
            <div key={item.title} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: '#f8fafc' }}>
              <span className="text-xl">{item.icon}</span>
              <div>
                <p className="text-sm font-medium text-slate-800">{item.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
