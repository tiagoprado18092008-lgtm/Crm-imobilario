import React, { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Select } from '../ui/Select'
import { deletePipeline, type Pipeline } from '../../api/pipelines.api'
import { useUIStore } from '../../store/ui.store'
import { useAuthStore } from '../../store/auth.store'

interface DeletePipelineModalProps {
  /** The pipeline being deleted; null keeps the modal closed. */
  pipeline: Pipeline | null
  /** Every pipeline in the workspace, offered as destinations for its deals. */
  pipelines: Pipeline[]
  onClose: () => void
  onDeleted: (deletedId: string) => void
}

type Choice = 'move' | 'delete'

const MANAGER_ROLES = ['AGENCY_OWNER', 'AGENCY_ADMIN', 'SUPER_ADMIN']

/**
 * Deleting a pipeline that still holds deals used to end in a refusal and no
 * way forward. This asks what happens to them instead: fold them into another
 * pipeline, or delete them with it.
 */
export const DeletePipelineModal: React.FC<DeletePipelineModalProps> = ({ pipeline, pipelines, onClose, onDeleted }) => {
  const { showToast } = useUIStore()
  const { user } = useAuthStore()
  const canDeleteDeals = MANAGER_ROLES.includes(user?.role ?? '')

  const [count, setCount] = useState(0)
  const [choice, setChoice] = useState<Choice>('move')
  const [moveTo, setMoveTo] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)

  const destinations = pipelines.filter(p => p.id !== pipeline?.id)

  useEffect(() => {
    if (!pipeline) return
    setCount(pipeline._count?.opportunities ?? 0)
    setChoice(destinations.length > 0 || !canDeleteDeals ? 'move' : 'delete')
    setMoveTo(destinations[0]?.id ?? '')
    setConfirmed(false)
  }, [pipeline?.id])

  const canSubmit = count === 0 || (choice === 'move' ? !!moveTo : confirmed)

  const submit = async () => {
    if (!pipeline || !canSubmit) return
    setBusy(true)
    try {
      const opts = count === 0 ? {} : choice === 'move' ? { moveTo } : { deleteOpportunities: true }
      const { data } = await deletePipeline(pipeline.id, opts)
      const target = destinations.find(p => p.id === moveTo)?.name
      showToast(
        data?.moved ? `Pipeline eliminada · ${data.moved} oportunidade(s) movida(s) para "${target}"`
          : data?.deleted ? `Pipeline eliminada com ${data.deleted} oportunidade(s)`
          : 'Pipeline eliminada',
        'success',
      )
      onDeleted(pipeline.id)
    } catch (e: any) {
      // The count shown came from the last list load and can be stale; the
      // server's is the truth, so ask again with it rather than failing.
      if (e?.response?.status === 409 && typeof e.response.data?.count === 'number') {
        setCount(e.response.data.count)
      } else {
        showToast(e?.response?.data?.error || 'Erro ao eliminar pipeline', 'error')
      }
    } finally {
      setBusy(false)
    }
  }

  const optionStyle = (active: boolean, disabled = false): React.CSSProperties => ({
    display: 'block', padding: '12px 14px', borderRadius: 10, marginBottom: 10,
    border: `1.5px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    background: active ? 'var(--surface-2)' : 'var(--surface)',
    cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.55 : 1,
  })

  const submitLabel = count === 0 ? 'Eliminar'
    : choice === 'move' ? 'Mover e eliminar pipeline'
    : `Eliminar pipeline e ${count} oportunidade(s)`

  return (
    <Modal
      isOpen={!!pipeline}
      onClose={busy ? () => {} : onClose}
      title="Eliminar pipeline"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button variant="danger" onClick={submit} loading={busy} disabled={!canSubmit}>{submitLabel}</Button>
        </>
      }
    >
      {count === 0 ? (
        <p style={{ fontSize: 14, color: 'var(--text-primary)', margin: 0, lineHeight: 1.5 }}>
          Eliminar a pipeline <strong>"{pipeline?.name}"</strong>? Esta ação não pode ser desfeita.
        </p>
      ) : (
        <>
          <p style={{ fontSize: 14, color: 'var(--text-primary)', margin: '0 0 16px', lineHeight: 1.5 }}>
            A pipeline <strong>"{pipeline?.name}"</strong> tem <strong>{count}</strong> oportunidade(s).
            O que queres fazer com elas?
          </p>

          <label style={optionStyle(choice === 'move', destinations.length === 0)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
              <input type="radio" name="pipeline-delete" checked={choice === 'move'}
                disabled={destinations.length === 0} onChange={() => setChoice('move')} />
              Mover para outra pipeline
            </div>
            {destinations.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>Não há outra pipeline para onde mover.</div>
            ) : choice === 'move' && (
              <div style={{ marginTop: 10 }}>
                <Select
                  value={moveTo}
                  onChange={e => setMoveTo(e.target.value)}
                  options={destinations.map(p => ({ value: p.id, label: p.name }))}
                />
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.4 }}>
                  Cada oportunidade fica na etapa com o mesmo nome; se não existir, vai para a primeira etapa.
                </div>
              </div>
            )}
          </label>

          {canDeleteDeals && (
            <label style={optionStyle(choice === 'delete')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                <input type="radio" name="pipeline-delete" checked={choice === 'delete'} onChange={() => setChoice('delete')} />
                Eliminar também as oportunidades
              </div>
              {choice === 'delete' && (
                <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca' }}>
                  <div style={{ display: 'flex', gap: 8, fontSize: 12, color: 'var(--danger)', lineHeight: 1.4, marginBottom: 8 }}>
                    <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                    As oportunidades são apagadas de vez. Os contactos continuam no CRM.
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-primary)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />
                    Confirmo que quero eliminar {count} oportunidade(s)
                  </label>
                </div>
              )}
            </label>
          )}
        </>
      )}
    </Modal>
  )
}
