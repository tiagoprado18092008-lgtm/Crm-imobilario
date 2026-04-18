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
import {
  SOURCE_OPTIONS,
  CONTACT_STATUS_LABELS,
  CONTACT_TYPE_LABELS,
  TIMELINE_OPTIONS,
  SALE_REASON_OPTIONS,
} from '../../utils/constants'

const schema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  type: z.string().min(1),
  status: z.string().min(1),
  source: z.string().optional(),
  notes: z.string().optional(),
  assignedToId: z.string().optional(),
  preferences: z.string().optional(),
  // BUYER fields
  budget_min: z.preprocess(
    (v) => (v === '' || v === null || (typeof v === 'number' && isNaN(v)) ? undefined : Number(v)),
    z.number().positive().optional()
  ),
  budget_max: z.preprocess(
    (v) => (v === '' || v === null || (typeof v === 'number' && isNaN(v)) ? undefined : Number(v)),
    z.number().positive().optional()
  ),
  interest_type: z.string().optional(),
  timeline: z.string().optional(),
  selling_also: z.boolean().optional(),
  needs_financing: z.boolean().optional(),
  // OWNER fields
  property_address: z.string().optional(),
  asking_price: z.preprocess(
    (v) => (v === '' || v === null || (typeof v === 'number' && isNaN(v)) ? undefined : Number(v)),
    z.number().positive().optional()
  ),
  sale_reason: z.string().optional(),
  buying_also: z.boolean().optional(),
})

type FormData = z.infer<typeof schema>

interface ContactFormProps {
  contact?: Contact
  onSuccess: () => void
  onCancel: () => void
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: 8,
  border: '1px solid var(--input-border)', background: 'var(--input-bg)',
  color: 'var(--text-primary)', fontSize: 13,
}
const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)',
  display: 'block', marginBottom: 4,
}
const sectionTitleStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
  textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12,
}
const sectionStyle: React.CSSProperties = {
  borderTop: '1px solid var(--border-color)', paddingTop: 16, marginTop: 8,
}

function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
      <div
        onClick={() => onChange(!checked)}
        style={{
          width: 36, height: 20, borderRadius: 10, flexShrink: 0,
          background: checked ? '#c9a84c' : 'var(--border-color)',
          position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
        }}
      >
        <div style={{
          position: 'absolute', top: 2, left: checked ? 18 : 2,
          width: 16, height: 16, borderRadius: '50%', background: '#fff',
          transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }} />
      </div>
      <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{label}</span>
    </label>
  )
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
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      name: contact?.name || '',
      email: contact?.email || '',
      phone: contact?.phone || '',
      type: (contact?.type as FormData['type']) || 'BUYER',
      status: contact?.status || 'NEW',
      source: contact?.source || '',
      notes: contact?.notes || '',
      assignedToId: contact?.assignedToId || currentUser?.id || '',
      preferences: contact?.preferences || '',
      budget_min: contact?.budget_min,
      budget_max: contact?.budget_max,
      interest_type: contact?.interest_type || '',
      timeline: contact?.timeline || '',
      selling_also: contact?.selling_also ?? false,
      needs_financing: contact?.needs_financing ?? false,
      property_address: contact?.property_address || '',
      asking_price: contact?.asking_price,
      sale_reason: contact?.sale_reason || '',
      buying_also: contact?.buying_also ?? false,
    },
  })

  const contactType = watch('type')
  const askingPrice = watch('asking_price')
  const sellingAlso = watch('selling_also') ?? false
  const needsFinancing = watch('needs_financing') ?? false
  const buyingAlso = watch('buying_also') ?? false

  const commission = askingPrice ? (Number(askingPrice) * 0.05) : null

  useEffect(() => {
    getUsers()
      .then((res) => {
        const data = res.data
        setUsers(Array.isArray(data) ? data : data.data || [])
        if (!contact && currentUser?.id) {
          setValue('assignedToId', currentUser.id)
        }
      })
      .catch(() => {})
  }, [])

  const onSubmit = async (data: FormData) => {
    setSubmitting(true)
    try {
      const payload: any = {
        name: data.name,
        email: data.email || undefined,
        phone: data.phone || undefined,
        type: data.type,
        status: data.status,
        source: data.source || undefined,
        notes: data.notes || undefined,
        preferences: data.preferences || undefined,
        assignedToId: data.assignedToId || undefined,
      }

      if (data.type === 'BUYER') {
        payload.budget_min = data.budget_min
        payload.budget_max = data.budget_max
        payload.interest_type = data.interest_type || undefined
        payload.timeline = data.timeline || undefined
        payload.selling_also = data.selling_also ?? false
        payload.needs_financing = data.needs_financing ?? false
      } else if (data.type === 'OWNER') {
        payload.property_address = data.property_address || undefined
        payload.asking_price = data.asking_price
        payload.sale_reason = data.sale_reason || undefined
        payload.buying_also = data.buying_also ?? false
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
      const e = err as { response?: { data?: { error?: string; details?: { field: string; message: string }[] } } }
      const details = e?.response?.data?.details
      const msg = details?.length
        ? details.map((d) => d.message).join(', ')
        : e?.response?.data?.error || 'Erro ao guardar contacto'
      showToast(msg, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit as any, (errs) => console.error('[ContactForm] validation errors:', errs))} className="space-y-4">
      {/* Dados base */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Nome" required error={errors.name?.message} {...register('name')} />
        <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
        <Input label="Telefone / WhatsApp" error={errors.phone?.message} {...register('phone')} />
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
        <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>Notas</label>
        <textarea
          {...register('notes')}
          rows={2}
          style={{ ...inputStyle, resize: 'vertical' }}
          placeholder="Notas sobre o contacto..."
        />
      </div>

      {/* ── BUYER fields ── */}
      {contactType === 'BUYER' && (
        <div style={sectionStyle}>
          <p style={sectionTitleStyle}>Perfil de Compra</p>
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <ToggleField
              label="Pretende vender também além de comprar?"
              checked={sellingAlso}
              onChange={(v) => setValue('selling_also', v)}
            />
            <ToggleField
              label="Necessita de financiamento?"
              checked={needsFinancing}
              onChange={(v) => setValue('needs_financing', v)}
            />
          </div>
        </div>
      )}

      {/* ── OWNER fields ── */}
      {contactType === 'OWNER' && (
        <div style={sectionStyle}>
          <p style={sectionTitleStyle}>Dados do Imóvel</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={labelStyle}>Morada do Imóvel</label>
              <input
                {...register('property_address')}
                type="text"
                placeholder="ex: Rua das Flores 12, Lisboa"
                style={inputStyle}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Asking Price (€)</label>
                <input
                  {...register('asking_price', { valueAsNumber: true })}
                  type="number"
                  placeholder="ex: 320 000"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Comissão estimada (5%)</label>
                <input
                  type="text"
                  readOnly
                  value={commission !== null ? `${commission.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €` : '—'}
                  style={{ ...inputStyle, background: 'var(--bg-subtle, #f8f9fc)', color: 'var(--text-muted)', cursor: 'default' }}
                />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Razão da Venda</label>
              <select {...register('sale_reason')} style={inputStyle}>
                <option value="">Selecionar...</option>
                {SALE_REASON_OPTIONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <ToggleField
              label="Necessita de comprar além de vender?"
              checked={buyingAlso}
              onChange={(v) => setValue('buying_also', v)}
            />
          </div>
        </div>
      )}

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
