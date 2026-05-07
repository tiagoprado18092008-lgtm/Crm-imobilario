import React, { useState, useCallback } from 'react'
import { Sparkles } from 'lucide-react'
import { Button } from '../../ui/Button'
import { Card } from '../../ui/Card'
import type { Property } from '../../../types'
import { updateProperty, generateDescription } from '../../../api/properties.api'
import { useUIStore } from '../../../store/ui.store'
import { CustomSelect } from '../../ui/CustomSelect'

const COMODIDADES = [
  'Garagem', 'Elevador', 'Varanda', 'Terraço', 'Jardim', 'Piscina',
  'Ar condicionado', 'Lareira', 'Arrecadação', 'Porteiro', 'Condomínio',
  'Mobilado', 'Cozinha equipada', 'Videovigilância', 'Painéis solares',
]

interface InlineFieldProps {
  label: string
  value?: string | number | null
  type?: 'text' | 'number' | 'select' | 'textarea'
  options?: { value: string; label: string }[]
  onSave: (val: string) => Promise<void>
}

const InlineField: React.FC<InlineFieldProps> = ({ label, value, type = 'text', options, onSave }) => {
  const [editing, setEditing] = useState(false)
  const [current, setCurrent] = useState(value?.toString() ?? '')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    await onSave(current)
    setSaving(false)
    setEditing(false)
  }

  if (type === 'select') {
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 140 }}>{label}</span>
        <CustomSelect
          value={current}
          onChange={v => { setCurrent(v); onSave(v) }}
          placeholder="—"
          options={options ?? []}
          size="sm"
        />
      </div>
    )
  }

  if (type === 'textarea') {
    return (
      <div>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</span>
        <textarea
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          onBlur={save}
          rows={4}
          style={{ width: '100%', marginTop: 4, fontSize: 13, color: 'var(--text-primary)', background: 'var(--surface-2)', border: '1px solid var(--input-border)', borderRadius: 8, padding: '8px 10px', resize: 'vertical', boxSizing: 'border-box' }}
        />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 140 }}>{label}</span>
      {editing ? (
        <input
          autoFocus
          type={type}
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false) }}
          style={{ fontSize: 13, color: 'var(--text-primary)', background: 'var(--surface-2)', border: '1px solid var(--input-border)', borderRadius: 6, padding: '2px 8px', width: 180 }}
        />
      ) : (
        <span
          onClick={() => setEditing(true)}
          style={{ fontSize: 13, color: current ? 'var(--text-primary)' : 'var(--text-muted)', cursor: 'pointer', padding: '2px 8px', borderRadius: 6, minWidth: 80, textAlign: 'right' }}
          title="Clique para editar"
        >
          {current || '—'}
        </span>
      )}
    </div>
  )
}

interface Props {
  property: Property
  onChange: (updated: Partial<Property>) => void
}

export const DetailsTab: React.FC<Props> = ({ property, onChange }) => {
  const { showToast } = useUIStore()
  const [generatingDesc, setGeneratingDesc] = useState(false)
  const [description, setDescription] = useState(property.description ?? '')

  const save = useCallback(async (field: string, value: any) => {
    try {
      await updateProperty(property.id, { [field]: value === '' ? null : value })
      onChange({ [field]: value === '' ? null : value })
    } catch {
      showToast('Erro ao guardar', 'error')
    }
  }, [property.id])

  const saveComodidade = async (comodidade: string, checked: boolean) => {
    const current = property.comodidades ?? []
    const next = checked ? [...current, comodidade] : current.filter(c => c !== comodidade)
    await save('comodidades', next)
  }

  const handleGenerateDesc = async () => {
    setGeneratingDesc(true)
    try {
      const res = await generateDescription(property.id)
      const desc = res.data.description
      setDescription(desc)
      await save('description', desc)
      showToast('Descrição gerada', 'success')
    } catch {
      showToast('Erro ao gerar descrição', 'error')
    } finally {
      setGeneratingDesc(false)
    }
  }

  const showAreaTereno = ['HOUSE', 'LAND', 'FARM'].includes(property.type)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Localização */}
      <Card title="Localização">
        <InlineField label="Endereço" value={property.address} onSave={v => save('address', v)} />
        <InlineField label="Código postal" value={property.postalCode} onSave={v => save('postalCode', v)} />
        <InlineField label="Freguesia" value={property.freguesia} onSave={v => save('freguesia', v)} />
        <InlineField label="Concelho" value={property.concelho} onSave={v => save('concelho', v)} />
        <InlineField label="Distrito" value={property.district} onSave={v => save('district', v)} />
      </Card>

      {/* Características */}
      <Card title="Características">
        <InlineField
          label="Tipologia"
          value={property.tipologia}
          type="select"
          options={['T0','T1','T2','T3','T4','T4+'].map(v => ({ value: v, label: v }))}
          onSave={v => save('tipologia', v)}
        />
        <InlineField label="Área bruta (m²)" value={property.area} type="number" onSave={v => save('area', v ? Number(v) : null)} />
        <InlineField label="Área útil (m²)" value={property.areaUtil} type="number" onSave={v => save('areaUtil', v ? Number(v) : null)} />
        {showAreaTereno && (
          <InlineField label="Área de terreno (m²)" value={property.areaTereno} type="number" onSave={v => save('areaTereno', v ? Number(v) : null)} />
        )}
        <InlineField label="Ano de construção" value={property.anoConstrucao} type="number" onSave={v => save('anoConstrucao', v ? Number(v) : null)} />
        <InlineField label="Piso" value={property.piso} type="number" onSave={v => save('piso', v ? Number(v) : null)} />
        <InlineField
          label="Orientação solar"
          value={property.orientacao}
          type="select"
          options={['Norte','Sul','Este','Oeste','Nascente','Poente'].map(v => ({ value: v, label: v }))}
          onSave={v => save('orientacao', v)}
        />
        <InlineField
          label="Certificado energético"
          value={property.energyCertificate}
          type="select"
          options={['A+','A','B','B-','C','D','E','F','Isento'].map(v => ({ value: v, label: v }))}
          onSave={v => save('energyCertificate', v)}
        />
      </Card>

      {/* Comodidades */}
      <Card title="Comodidades">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
          {COMODIDADES.map(c => (
            <label key={c} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={(property.comodidades ?? []).includes(c)}
                onChange={e => saveComodidade(c, e.target.checked)}
              />
              {c}
            </label>
          ))}
        </div>
      </Card>

      {/* Negócio */}
      <Card title="Negócio">
        <InlineField
          label="Finalidade"
          value={property.purpose}
          type="select"
          options={[{ value: 'SALE', label: 'Venda' }, { value: 'RENT', label: 'Arrendamento' }, { value: 'TRESPASSE', label: 'Ambos' }]}
          onSave={v => save('purpose', v)}
        />
        <InlineField label="Preço de venda (€)" value={property.price} type="number" onSave={v => save('price', v ? Number(v) : 0)} />
        <InlineField label="Preço arrendamento (€/mês)" value={property.precoArrendamento} type="number" onSave={v => save('precoArrendamento', v ? Number(v) : null)} />
        <InlineField label="Despesas condomínio (€/mês)" value={property.despesasCondominio} type="number" onSave={v => save('despesasCondominio', v ? Number(v) : null)} />
        <InlineField label="IMI anual estimado (€)" value={property.imiAnual} type="number" onSave={v => save('imiAnual', v ? Number(v) : null)} />
        <InlineField label="Comissão (%)" value={property.commission} type="number" onSave={v => save('commission', v ? Number(v) : null)} />
      </Card>

      {/* Descrição */}
      <Card title="Descrição">
        <div style={{ marginBottom: 10 }}>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            onBlur={() => save('description', description)}
            rows={5}
            style={{ width: '100%', fontSize: 13, color: 'var(--text-primary)', background: 'var(--surface-2)', border: '1px solid var(--input-border)', borderRadius: 8, padding: '8px 10px', resize: 'vertical', boxSizing: 'border-box' }}
            placeholder="Descrição do imóvel..."
          />
        </div>
        <Button variant="secondary" onClick={handleGenerateDesc} loading={generatingDesc}>
          <Sparkles size={14} /> Gerar descrição com IA
        </Button>
      </Card>
    </div>
  )
}
