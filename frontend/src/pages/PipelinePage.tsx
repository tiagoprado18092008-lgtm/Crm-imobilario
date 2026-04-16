import React, { useEffect, useState } from 'react'
import { Plus, ChevronRight } from 'lucide-react'
import { KanbanBoard } from '../components/kanban/KanbanBoard'
import { getPipelines, createPipeline, type Pipeline } from '../api/pipelines.api'
import { useUIStore } from '../store/ui.store'
import { useAuthStore } from '../store/auth.store'
import { PageSpinner } from '../components/ui/Spinner'

export const PipelinePage: React.FC = () => {
  const { showToast } = useUIStore()
  const { user } = useAuthStore()
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [activePipeline, setActivePipeline] = useState<Pipeline | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')

  const canManage = user?.role === 'AGENCY_OWNER' || user?.role === 'AGENCY_ADMIN'

  const load = async () => {
    setLoading(true)
    try {
      const res = await getPipelines()
      const list: Pipeline[] = Array.isArray(res.data) ? res.data : []
      setPipelines(list)
      if (list.length > 0 && !activePipeline) setActivePipeline(list[0])
    } catch {
      showToast('Erro ao carregar pipelines', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    try {
      const res = await createPipeline(newName.trim())
      showToast('Pipeline criada', 'success')
      setNewName('')
      setCreating(false)
      await load()
      setActivePipeline(res.data)
    } catch {
      showToast('Erro ao criar pipeline', 'error')
    }
  }

  if (loading) return <PageSpinner />

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <div style={{
        width: 200,
        flexShrink: 0,
        background: '#fff',
        borderRight: '1px solid #e5e9f2',
        display: 'flex',
        flexDirection: 'column',
        padding: '20px 0',
      }}>
        <div style={{ padding: '0 16px 12px', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>
          Pipelines
        </div>
        <div style={{ flex: 1, overflowY: 'auto' as const }}>
          {pipelines.map(p => (
            <button
              key={p.id}
              onClick={() => setActivePipeline(p)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 16px',
                background: activePipeline?.id === p.id ? 'rgba(99,102,241,0.08)' : 'transparent',
                color: activePipeline?.id === p.id ? '#6366f1' : '#374151',
                border: 'none',
                fontSize: 13,
                fontWeight: activePipeline?.id === p.id ? 700 : 500,
                cursor: 'pointer',
                textAlign: 'left' as const,
                fontFamily: 'inherit',
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{p.name}</span>
              {activePipeline?.id === p.id && <ChevronRight size={14} />}
            </button>
          ))}
        </div>
        {canManage && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid #e5e9f2' }}>
            {creating ? (
              <form onSubmit={handleCreate}>
                <input
                  autoFocus
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Nome da pipeline"
                  style={{
                    width: '100%',
                    padding: '7px 10px',
                    borderRadius: 8,
                    border: '1.5px solid #6366f1',
                    fontSize: 12,
                    fontFamily: 'inherit',
                    marginBottom: 6,
                    outline: 'none',
                    boxSizing: 'border-box' as const,
                  }}
                />
                <div style={{ display: 'flex', gap: 6 }}>
                  <button type="button" onClick={() => setCreating(false)} style={{ flex: 1, padding: '6px', borderRadius: 7, border: '1px solid #e5e9f2', background: '#fff', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
                  <button type="submit" style={{ flex: 1, padding: '6px', borderRadius: 7, border: 'none', background: '#6366f1', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Criar</button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setCreating(true)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 10px',
                  borderRadius: 8,
                  border: '1.5px dashed #d1d5db',
                  background: 'transparent',
                  color: '#9ca3af',
                  fontSize: 12,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <Plus size={13} /> Nova pipeline
              </button>
            )}
          </div>
        )}
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {activePipeline ? (
          <KanbanBoard
            key={activePipeline.id}
            pipelineId={activePipeline.id}
            stages={activePipeline.stages}
          />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af', fontSize: 14 }}>
            Seleciona uma pipeline
          </div>
        )}
      </div>
    </div>
  )
}
