import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '../ui/Modal'
import { Select } from '../ui/Select'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { createInteraction } from '../../api/interactions.api'
import { useUIStore } from '../../store/ui.store'
import { INTERACTION_TYPE_LABELS } from '../../utils/constants'

const schema = z.object({
  type: z.enum(['EMAIL', 'WHATSAPP', 'CALL', 'MEETING', 'NOTE']),
  subject: z.string().optional(),
  body: z.string().min(1, 'Descrição obrigatória'),
  direction: z.enum(['IN', 'OUT'])
})

type FormData = z.infer<typeof schema>

interface CommunicationModalProps {
  isOpen: boolean
  onClose: () => void
  contactId: string
  opportunityId?: string
  defaultType?: string
  onSuccess?: () => void
}

export const CommunicationModal: React.FC<CommunicationModalProps> = ({
  isOpen,
  onClose,
  contactId,
  opportunityId,
  defaultType = 'NOTE',
  onSuccess
}) => {
  const { showToast } = useUIStore()
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors }
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: defaultType as any,
      direction: 'OUT',
      subject: '',
      body: ''
    }
  })

  const typeValue = watch('type')

  const onSubmit = async (data: FormData) => {
    setSubmitting(true)
    try {
      await createInteraction({
        ...data,
        contactId,
        opportunityId: opportunityId || undefined,
        subject: data.subject || undefined
      })
      showToast('Interação registada com sucesso', 'success')
      reset()
      onSuccess?.()
      onClose()
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Erro ao registar interação', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Registar Interação">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Tipo"
            required
            options={Object.entries(INTERACTION_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))}
            {...register('type')}
          />
          <Select
            label="Direção"
            required
            options={[
              { value: 'OUT', label: 'Enviado' },
              { value: 'IN', label: 'Recebido' }
            ]}
            {...register('direction')}
          />
        </div>

        {(typeValue === 'EMAIL' || typeValue === 'MEETING') && (
          <Input
            label="Assunto"
            error={errors.subject?.message}
            {...register('subject')}
          />
        )}

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">
            Descrição <span className="text-red-500">*</span>
          </label>
          <textarea
            {...register('body')}
            rows={4}
            className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.body ? 'border-red-400 bg-red-50' : 'border-gray-300'
            }`}
            placeholder="Descreva a interação..."
          />
          {errors.body && <p className="text-xs text-red-600">{errors.body.message}</p>}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={submitting}>
            Registar
          </Button>
        </div>
      </form>
    </Modal>
  )
}
