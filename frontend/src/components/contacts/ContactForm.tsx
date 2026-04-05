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
import { SOURCE_OPTIONS, CONTACT_STATUS_LABELS, CONTACT_TYPE_LABELS, TIMELINE_OPTIONS } from '../../utils/constants'

const schema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  type: z.enum(['LEAD', 'CLIENT', 'OWNER', 'PARTNER']),
  status: z.enum(['NEW', 'QUALIFIED', 'CONTACTED', 'INACTIVE']),
  source: z.string().optional(),
  notes: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  assignedToId: z.string().optional(),
  preferences: z.string().optional(),
  // Perfil de procura
  budget_min: z.preprocess((v) => (v === '' || v === null || (typeof v === 'number' && isNaN(v)) ? undefined : Number(v)), z.number().positive().optional()),
  budget_max: z.preprocess((v) => (v === '' || v === null || (typeof v === 'number' && isNaN(v)) ? undefined : Number(v)), z.number().positive().optional()),
  interest_type: z.string().optional(),
  timeline: z.string().optional(),
  // RGPD
  gdprConsent: z.boolean().optional(),
  gdprConsentOrigin: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface ContactFormProps {
  contact?: Contact
  onSuccess: () => void
  onCancel: () => void
}

const inputStyle = {
  width: '100%', padding: '8px 12px', borderRadius: 8,
  border: '1px solid var(--input-border)', background: 'var(--input-bg)',
  color: 'var(--text-primary)', fontSize: 13,
}
const labelStyle = {
  fontSize: 12, fontWeight: 600 as const, color: 'var(--text-secondary)',
  display: 'block', marginBottom: 4,
}
const sectionTitleStyle = {
  fontSize: 11, fontWeight: 700 as const, color: 'var(--text-muted)',
  textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 12,
}
const sectionStyle = {
  borderTop: '1px solid var(--border-color)', paddingTop: 16, marginTop: 8,
}

export const ContactForm: React.FC<ContactFormProps> = ({ contact, onSuccess, onCancel }) => {
  const { showToast } = useUIStore()
  const { user: currentUser } = useAuthStore()
  const [users, setUsers] = useState<User[]>([])
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors }
  } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      name: contact?.name || '',
      email: contact?.email || '',
      phone: contact?.phone || '',
      whatsapp: contact?.whatsapp || '',
      type: (contact?.type as FormData['type']) || 'LEAD',
      status: contact?.status || 'NEW',
      source: contact?.source || '',
      notes: contact?.notes || '',
      city: contact?.city || '',
      postalCode: contact?.postalCode || '',
      assignedToId: contact?.assignedToId || currentUser?.id || '',
      preferences: contact?.preferences || '',
      budget_min: contact?.budget_min,
      budget_max: contact?.budget_max,
      interest_type: contact?.interest_type || '',
      timeline: contact?.timeline || '',
      gdprConsent: contact?.gdprConsent || false,
      gdprConsentOrigin: contact?.gdprConsentOrigin || '',
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

  // Ensure assignedToId is set once currentUser is available (auth hydration delay)
  useEffect(() => {
    if (currentUser?.id && !contact) {
      setValue('assignedToId', currentUser.id)
    }
  }, [currentUser?.id])

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
        preferences: data.preferences || undefined,
        city: data.city || undefined,
        postalCode: data.postalCode || undefined,
        interest_type: data.interest_type || undefined,
        timeline: data.timeline || undefined,
        gdprConsentOrigin: data.gdprConsentOrigin || undefined,
      }
      if (contact) {
        await updateContact(contact.id, payload)
        showToast('Contacto atualizado com sucesso', 'success')
      } else {
        await createContact(payload)
        showToast('Contacto criado com sucesso', 'success')
      }
      onSuccess()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      showToast(e?.response?.data?.message || 'Erro ao guardar contacto', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
      {/* Dados pessoais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Nome" required error={errors.name?.message} {...register('name')} />
        <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
        <Input label="Telefone" error={errors.phone?.message} {...register('phone')} />
        <Input label="WhatsApp" error={errors.whatsapp?.message} {...register('whatsapp')} />
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
        <Input label="Cidade" {...register('city')} />
        <Input label="Código Postal" placeholder="0000-000" {...register('postalCode')} />
      </div>

      <div className="flex flex-col gap-1">
        <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>Notas</label>
        <textarea
          {...register('notes')}
          rows={2}
          style={{ ...inputStyle, resize: 'vertical' }}
          placeholder="Notas sobre o contacto..."
        />
      </div>

      {/* Perfil de procura */}
      <div style={sectionStyle}>
        <p style={sectionTitleStyle}>Perfil de Procura</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>Budget Mínimo (€)</label>
            <input
              {...register('budget_min', { valueAsNumber: true })}
              type="number"
              placeholder="ex: 150 000"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Budget Máximo (€)</label>
            <input
              {...register('budget_max', { valueAsNumber: true })}
              type="number"
              placeholder="ex: 500 000"
              style={inputStyle}
            />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={labelStyle}>Tipo de Imóvel Pretendido</label>
            <select {...register('interest_type')} style={inputStyle}>
              <option value="">Selecionar...</option>
              <option value="APARTMENT">Apartamento</option>
              <option value="HOUSE">Moradia</option>
              <option value="COMMERCIAL">Comercial</option>
              <option value="LAND">Terreno</option>
              <option value="GARAGE">Garagem</option>
              <option value="WAREHOUSE">Armazém</option>
              <option value="FARM">Quinta</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Urgência / Timeline</label>
            <select {...register('timeline')} style={inputStyle}>
              <option value="">Selecionar...</option>
              {Object.entries(TIMELINE_OPTIONS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* RGPD */}
      <div style={sectionStyle}>
        <p style={sectionTitleStyle}>RGPD — Consentimento</p>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', marginBottom: 12 }}>
          <input
            {...register('gdprConsent')}
            type="checkbox"
            style={{ marginTop: 2, width: 16, height: 16, accentColor: '#c9a84c', cursor: 'pointer', flexShrink: 0 }}
          />
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            O contacto deu consentimento para receber comunicações de marketing e ser contactado para fins comerciais
            <span style={{ color: 'var(--text-muted)', display: 'block', marginTop: 2 }}>(Obrigatório por RGPD / Lei 58/2019)</span>
          </span>
        </label>
        <div>
          <label style={labelStyle}>Origem do Consentimento</label>
          <select {...register('gdprConsentOrigin')} style={inputStyle}>
            <option value="">Selecionar...</option>
            <option value="FORM">Formulário Web</option>
            <option value="EMAIL">Email</option>
            <option value="PHONE">Telefone</option>
            <option value="IN_PERSON">Presencial</option>
            <option value="PORTAL">Portal Imobiliário</option>
            <option value="WHATSAPP">WhatsApp</option>
          </select>
        </div>
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
