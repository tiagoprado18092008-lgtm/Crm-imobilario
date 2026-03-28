import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Button } from '../ui/Button'
import { createContact, updateContact } from '../../api/contacts.api'
import { getUsers } from '../../api/users.api'
import type { Contact, User } from '../../types'
import { useUIStore } from '../../store/ui.store'
import { useAuthStore } from '../../store/auth.store'
import { SOURCE_OPTIONS, CONTACT_STATUS_LABELS, CONTACT_TYPE_LABELS } from '../../utils/constants'

const schema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  type: z.enum(['LEAD', 'CLIENT']),
  status: z.enum(['NEW', 'QUALIFIED', 'CONTACTED', 'INACTIVE']),
  source: z.string().optional(),
  notes: z.string().optional(),
  assignedToId: z.string().min(1, 'Responsável obrigatório'),
  preferences: z.string().optional()
})

type FormData = z.infer<typeof schema>

interface ContactFormProps {
  contact?: Contact
  onSuccess: () => void
  onCancel: () => void
}

export const ContactForm: React.FC<ContactFormProps> = ({ contact, onSuccess, onCancel }) => {
  const { showToast } = useUIStore()
  const { user: currentUser } = useAuthStore()
  const [users, setUsers] = useState<User[]>([])
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: contact?.name || '',
      email: contact?.email || '',
      phone: contact?.phone || '',
      whatsapp: contact?.whatsapp || '',
      type: contact?.type || 'LEAD',
      status: contact?.status || 'NEW',
      source: contact?.source || '',
      notes: contact?.notes || '',
      assignedToId: contact?.assignedToId || currentUser?.id || '',
      preferences: contact?.preferences || ''
    }
  })

  useEffect(() => {
    getUsers()
      .then((res) => {
        const data = res.data
        setUsers(Array.isArray(data) ? data : data.data || [])
      })
      .catch(() => {})
  }, [])

  const onSubmit = async (data: FormData) => {
    setSubmitting(true)
    try {
      const payload = {
        ...data,
        email: data.email || undefined,
        phone: data.phone || undefined,
        whatsapp: data.whatsapp || undefined,
        source: data.source || undefined,
        notes: data.notes || undefined,
        preferences: data.preferences || undefined
      }
      if (contact) {
        await updateContact(contact.id, payload)
        showToast('Contacto atualizado com sucesso', 'success')
      } else {
        await createContact(payload)
        showToast('Contacto criado com sucesso', 'success')
      }
      onSuccess()
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Erro ao guardar contacto', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Nome"
          required
          error={errors.name?.message}
          {...register('name')}
        />
        <Input
          label="Email"
          type="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          label="Telefone"
          error={errors.phone?.message}
          {...register('phone')}
        />
        <Input
          label="WhatsApp"
          error={errors.whatsapp?.message}
          {...register('whatsapp')}
        />
        <Select
          label="Tipo"
          required
          error={errors.type?.message}
          options={Object.entries(CONTACT_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))}
          {...register('type')}
        />
        <Select
          label="Estado"
          required
          error={errors.status?.message}
          options={Object.entries(CONTACT_STATUS_LABELS).map(([v, l]) => ({ value: v, label: l }))}
          {...register('status')}
        />
        <Select
          label="Origem"
          error={errors.source?.message}
          placeholder="Selecionar origem"
          options={SOURCE_OPTIONS.map((s) => ({ value: s, label: s }))}
          {...register('source')}
        />
        <Select
          label="Responsável"
          required
          error={errors.assignedToId?.message}
          placeholder="Selecionar responsável"
          options={users.map((u) => ({ value: u.id, label: u.name }))}
          {...register('assignedToId')}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Notas</label>
        <textarea
          {...register('notes')}
          rows={3}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Notas sobre o contacto..."
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Preferências</label>
        <textarea
          {...register('preferences')}
          rows={3}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder='Tipo de imóvel, localização, preço... (ex: {"propertyType":"APARTMENT","location":"Lisboa","minPrice":200000})'
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" loading={submitting}>
          {contact ? 'Atualizar' : 'Criar'} Contacto
        </Button>
      </div>
    </form>
  )
}
