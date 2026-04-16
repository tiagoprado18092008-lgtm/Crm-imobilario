import React, { useEffect, useState } from 'react'
import { Plus, Trash2, Check, X } from 'lucide-react'
import {
  getPipelines, deletePipeline,
  createStage, updateStage, deleteStage,
  type Pipeline, type PipelineStage
} from '../../api/pipelines.api'
import { useUIStore } from '../../store/ui.store'
import { PageSpinner } from '../../components/ui/Spinner'

const PRESET_COLORS = ['#6366f1','#8b5cf6','#f59e0b','#10b981','#3b82f6','#f97316','#22c55e','#ef4444','#06b6d4','#ec4899']

export const PipelineSettingsPage: React.FC = () => {
  const { showToast } = useUIStore()
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [loading, setLoading] = useState(true)
  const [activePipelineId, setActivePipelineId] = useState<string | null>(null)
  const [editingStageId, setEditingStageId] = useState<string | null>(null)
  const [stageForm, setStageForm] = useState({ name: '', color: '#6366f1' })
  const [addingStage, setAddingStage] = useState(false)
  const [newStageForm, setNewStageForm] = useState({ name: '', color: '#6366f1' })

  const load = async () => {
    setLoading(true)
    try {
      const res = await getPipelines()
      const list: Pipeline[] = Array.isArray(res.data) ? res.data : []
      setPipelines(list)
      if (list.length > 0 && !activePipelineId) setActivePipelineId(list[0].id)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const activePipeline = pipelines.find(p => p.id === activePipelineId) || null

  const handleDeletePipeline = async (p: Pipeline) => {
    if (!confirm(`Eliminar pipeline "${p.name}"?`)) return
    try {
      await deletePipeline(p.id)
      showToast('Pipeline eliminada', 'success')
      setActivePipelineId(null)
      load()
    } catch (e: any) {
      showToast(e?.response?.data?.error || 'Erro ao eliminar', 'error')
    }
  }

  const handleSaveStage = async (stage: PipelineStage) => {
    if (!activePipeline) return
    try {
      await updateStage(activePipeline.id, stage.id, stageForm)
      showToast('Etapa atualizada', 'success')
      setEditingStageId(null)
      load()
    } catch {
      showToast('Erro ao atualizar etapa', 'error')
    }
  }

  const handleDeleteStage = async (stage: PipelineStage) => {
    if (!activePipeline) return
    if (!confirm(`Eliminar etapa "${stage.name}"?`)) return
    try {
      await deleteStage(activePipeline.id, stage.id)
      showToast('Etapa eliminada', 'success')
      load()
    } catch (e: any) {
      showToast(e?.response?.data?.error || 'Erro ao eliminar etapa', 'error')
    }
  }

  const handleAddStage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activePipeline || !newStageForm.name.trim()) return
    try {
      await createStage(activePipeline.id, newStageForm)
      showToast('Etapa criada', 'success')
      setAddingStage(false)
      setNewStageForm({ name: '', color: '#6366f1' })
      load()
    } catch {
      showToast('Erro ao criar etapa', 'error')
    }
  }

  if (loading) return <PageSpinner />

  const inputStyle: React.CSSProperties = {
    padding: '7px 10px', borderRadius: 8, border: '1.5px solid #dce3ef',
    fontSize: 13, fontFamily: 'inherit', outline: 'none', background: '#f8f9fc', color: '#0f2553',
  }

  return (
    <div style={{ padding: '28px 32px', maxWidth: 860, margin: '0 auto' }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0f2553', marginBottom: 4 }}>Gestão de Pipelines</h1>
      <p style={{ fontSize: 13, color: '#6b7a99', marginBottom: 28 }}>Configure as etapas de cada pipeline de vendas</p>

      <div style={{ display: 'flex', gap: 20 }}>
        <div style={{ width: 180, flexShrink: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 8 }}>Pipelines</div>
          {pipelines.map(p => (
            <div
              key={p.id}
              onClick={() => setActivePipelineId(p.id)}
              style={{
                padding: '8px 12px', borderRadius: 8, marginBottom: 4,
                background: activePipelineId === p.id ? 'rgba(99,102,241,0.1)' : '#fff',
                border: `1px solid ${activePipelineId === p.id ? '#6366f1' : '#e5e9f2'}`,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 600, color: activePipelineId === p.id ? '#6366f1' : '#374151' }}>{p.name}</span>
              <button
                onClick={e => { e.stopPropagation(); handleDeletePipeline(p) }}
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444', padding: 0, display: 'flex' }}
              ><Trash2 size={12} /></button>
            </div>
          ))}
        </div>

        <div style={{ flex: 1 }}>
          {activePipeline ? (
            <>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0f2553', marginBottom: 16 }}>
                Etapas — {activePipeline.name}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {activePipeline.stages.map(stage => (
                  <div key={stage.id} style={{ background: '#fff', border: '1px solid #e5e9f2', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 14, height: 14, borderRadius: 4, background: stage.color, flexShrink: 0 }} />
                    {editingStageId === stage.id ? (
                      <>
                        <input style={{ ...inputStyle, flex: 1 }} value={stageForm.name} onChange={e => setStageForm(f => ({ ...f, name: e.target.value }))} />
                        <div style={{ display: 'flex', gap: 4 }}>
                          {PRESET_COLORS.map(c => (
                            <div key={c} onClick={() => setStageForm(f => ({ ...f, color: c }))}
                              style={{ width: 16, height: 16, borderRadius: 4, background: c, cursor: 'pointer', outline: stageForm.color === c ? '2px solid #0f2553' : 'none', outlineOffset: 1 }} />
                          ))}
                        </div>
                        <button onClick={() => handleSaveStage(stage)} style={{ border: 'none', background: '#6366f1', color: '#fff', borderRadius: 7, padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><Check size={13} /></button>
                        <button onClick={() => setEditingStageId(null)} style={{ border: '1px solid #e5e9f2', background: '#fff', borderRadius: 7, padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><X size={13} /></button>
                      </>
                    ) : (
                      <>
                        <span style={{ flex: 1, fontSize: 13, color: '#374151' }}>{stage.name}</span>
                        <button onClick={() => { setEditingStageId(stage.id); setStageForm({ name: stage.name, color: stage.color }) }}
                          style={{ border: '1px solid #e5e9f2', background: '#fff', borderRadius: 7, padding: '4px 10px', cursor: 'pointer', fontSize: 11, color: '#6b7a99', fontFamily: 'inherit' }}>Editar</button>
                        <button onClick={() => handleDeleteStage(stage)}
                          style={{ border: '1px solid #fee2e2', background: '#fff', borderRadius: 7, padding: '4px 8px', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center' }}><Trash2 size={12} /></button>
                      </>
                    )}
                  </div>
                ))}
                {addingStage ? (
                  <form onSubmit={handleAddStage} style={{ background: '#fff', border: '1.5px solid #6366f1', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input autoFocus style={{ ...inputStyle, flex: 1 }} value={newStageForm.name} onChange={e => setNewStageForm(f => ({ ...f, name: e.target.value }))} placeholder="Nome da etapa" />
                    <div style={{ display: 'flex', gap: 4 }}>
                      {PRESET_COLORS.map(c => (
                        <div key={c} onClick={() => setNewStageForm(f => ({ ...f, color: c }))}
                          style={{ width: 16, height: 16, borderRadius: 4, background: c, cursor: 'pointer', outline: newStageForm.color === c ? '2px solid #0f2553' : 'none', outlineOffset: 1 }} />
                      ))}
                    </div>
                    <button type="submit" style={{ border: 'none', background: '#6366f1', color: '#fff', borderRadius: 7, padding: '4px 10px', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>Adicionar</button>
                    <button type="button" onClick={() => setAddingStage(false)} style={{ border: '1px solid #e5e9f2', background: '#fff', borderRadius: 7, padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><X size={13} /></button>
                  </form>
                ) : (
                  <button onClick={() => setAddingStage(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 10, border: '1.5px dashed #d1d5db', background: 'transparent', color: '#9ca3af', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                    <Plus size={13} /> Adicionar etapa
                  </button>
                )}
              </div>
            </>
          ) : (
            <p style={{ color: '#9ca3af', fontSize: 14 }}>Seleciona uma pipeline para gerir as suas etapas.</p>
          )}
        </div>
      </div>
    </div>
  )
}
