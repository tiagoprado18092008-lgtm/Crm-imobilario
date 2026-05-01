import React, { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { Upload, Download, X, CheckCircle, AlertCircle, FileSpreadsheet, ArrowRight } from 'lucide-react'
import api from '../../api/client'
import { useUIStore } from '../../store/ui.store'

type ImportType = 'contacts' | 'opportunities'

interface ImportModalProps {
  type: ImportType
  onClose: () => void
  onSuccess: () => void
}

// Fields the CRM expects for each type, with label and whether required
const CONTACT_FIELDS = [
  { key: 'name', label: 'Nome', required: true },
  { key: 'email', label: 'Email', required: false },
  { key: 'phone', label: 'Telefone', required: false },
  { key: 'whatsapp', label: 'WhatsApp', required: false },
  { key: 'type', label: 'Tipo (BUYER/OWNER/PARTNER)', required: false },
  { key: 'status', label: 'Estado (NEW/QUALIFIED/CONTACTED)', required: false },
  { key: 'source', label: 'Origem', required: false },
  { key: 'notes', label: 'Notas', required: false },
  { key: 'city', label: 'Cidade', required: false },
]

const OPPORTUNITY_FIELDS = [
  { key: 'title', label: 'Título da oportunidade', required: true },
  { key: 'contactName', label: 'Nome do contacto', required: false },
  { key: 'contactEmail', label: 'Email do contacto', required: false },
  { key: 'stage', label: 'Fase (LEAD_IN/QUALIFYING/...)', required: false },
  { key: 'value', label: 'Valor (€)', required: false },
  { key: 'source', label: 'Origem', required: false },
  { key: 'notes', label: 'Notas', required: false },
]

const CONTACTS_SAMPLE = [
  ['nome', 'email', 'telefone', 'whatsapp', 'tipo', 'estado', 'origem', 'notas', 'cidade'],
  ['João Silva', 'joao@exemplo.com', '+351912345678', '+351912345678', 'BUYER', 'NEW', 'Website', '', 'Lisboa'],
  ['Maria Santos', 'maria@exemplo.com', '+351923456789', '', 'OWNER', 'QUALIFIED', 'Indicação', 'Proprietária VIP', 'Porto'],
]

const OPPORTUNITIES_SAMPLE = [
  ['titulo', 'nomeContacto', 'emailContacto', 'fase', 'valor', 'origem', 'notas'],
  ['T2 Lisboa Centro', 'João Silva', 'joao@exemplo.com', 'LEAD_IN', '250000', 'Google', ''],
  ['Moradia Porto', 'Maria Santos', 'maria@exemplo.com', 'QUALIFYING', '350000', 'Indicação', 'Urgente'],
]

// Auto-detect mapping from header name to field key
function autoDetect(header: string, type: ImportType): string {
  const h = header.toLowerCase().trim()
  if (type === 'contacts') {
    if (/^(nome|name|full.?name|primeiro.?nome|apelido|first.?name|last.?name|contact.?name|contact)$/i.test(h)) return 'name'
    if (/^(nome|name)/i.test(h) && h.length < 15) return 'name'
    if (/email/i.test(h)) return 'email'
    if (/^(telefone|phone|tel|telef|mobile|m[oó]vel|cell)/i.test(h)) return 'phone'
    if (/whatsapp|wapp|wa$/i.test(h)) return 'whatsapp'
    if (/^(tipo|type|categoria|category)/i.test(h)) return 'type'
    if (/^(estado|status|state)/i.test(h)) return 'status'
    if (/^(origem|source|canal|channel|fonte)/i.test(h)) return 'source'
    if (/^(notas|notes|observa|comment|descri)/i.test(h)) return 'notes'
    if (/^(cidade|city|localidade|local|munic)/i.test(h)) return 'city'
  } else {
    if (/^(titulo|title|nome|name|oportunidade|opportunity|assunto|subject)/i.test(h)) return 'title'
    if (/nome.?(do.?)?contacto|contact.?name/i.test(h)) return 'contactName'
    if (/email.?(do.?)?contacto|contact.?email/i.test(h)) return 'contactEmail'
    if (/^email/i.test(h)) return 'contactEmail'
    if (/^(fase|stage|etapa|pipeline.?stage)/i.test(h)) return 'stage'
    if (/^(valor|value|pre[cç]o|price|amount|montante)/i.test(h)) return 'value'
    if (/^(origem|source|canal|channel|fonte)/i.test(h)) return 'source'
    if (/^(notas|notes|observa|comment|descri)/i.test(h)) return 'notes'
  }
  return ''
}

const TYPE_LABELS: Record<string, string> = {
  contacts: 'Contactos',
  opportunities: 'Oportunidades',
}

export const ImportModal: React.FC<ImportModalProps> = ({ type, onClose, onSuccess }) => {
  const { showToast } = useUIStore()
  const [step, setStep] = useState<'upload' | 'map' | 'result'>('upload')
  const [rows, setRows] = useState<any[][]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({}) // fieldKey -> columnIndex (as string)
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [result, setResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null)
  const [fileName, setFileName] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const fields = type === 'contacts' ? CONTACT_FIELDS : OPPORTUNITY_FIELDS
  const sample = type === 'contacts' ? CONTACTS_SAMPLE : OPPORTUNITIES_SAMPLE

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet(sample)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Template')
    XLSX.writeFile(wb, `template_${type}.xlsx`)
  }

  const parseFile = (file: File) => {
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const json: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

        if (json.length < 2) {
          showToast('Ficheiro vazio ou sem dados', 'error')
          return
        }

        const rawHeaders = (json[0] as any[]).map(h => String(h ?? '').trim())
        setHeaders(rawHeaders)

        const dataRows = json.slice(1).filter((r: any[]) => r.some(cell => String(cell ?? '').trim() !== ''))
        setRows(dataRows)

        // Auto-detect column mapping
        const autoMap: Record<string, string> = {}
        rawHeaders.forEach((h, idx) => {
          const detected = autoDetect(h, type)
          if (detected && !Object.values(autoMap).includes(String(idx))) {
            autoMap[detected] = String(idx)
          }
        })
        setMapping(autoMap)
        setStep('map')
      } catch {
        showToast('Erro ao ler o ficheiro', 'error')
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const buildRow = (rawRow: any[]): any => {
    const get = (fieldKey: string) => {
      const colIdx = mapping[fieldKey]
      if (colIdx === undefined || colIdx === '') return undefined
      const val = String(rawRow[parseInt(colIdx)] ?? '').trim()
      return val || undefined
    }

    if (type === 'contacts') {
      return {
        name: get('name'),
        email: get('email'),
        phone: get('phone'),
        whatsapp: get('whatsapp'),
        type: get('type'),
        status: get('status'),
        source: get('source'),
        notes: get('notes'),
        city: get('city'),
      }
    } else {
      const valStr = get('value')
      return {
        title: get('title'),
        contactName: get('contactName'),
        contactEmail: get('contactEmail'),
        stage: get('stage'),
        value: valStr ? parseFloat(valStr.replace(/[^0-9.]/g, '')) || undefined : undefined,
        source: get('source'),
        notes: get('notes'),
      }
    }
  }

  const requiredField = type === 'contacts' ? 'name' : 'title'
  const requiredMapped = !!mapping[requiredField]

  const handleImport = async () => {
    if (!requiredMapped) {
      showToast(`Tens de mapear o campo obrigatório: ${fields.find(f => f.key === requiredField)?.label}`, 'error')
      return
    }

    setImporting(true)
    setImportProgress(0)
    const BATCH_SIZE = 2000
    const endpoint = type === 'contacts' ? '/contacts/import' : '/opportunities/import'

    const mapped = rows.map(r => buildRow(r)).filter(r => r[requiredField])
    if (mapped.length === 0) {
      showToast('Nenhuma linha válida encontrada com o campo obrigatório preenchido', 'error')
      setImporting(false)
      return
    }

    const total = mapped.length
    const aggregate = { created: 0, skipped: 0, errors: [] as string[] }
    try {
      for (let i = 0; i < mapped.length; i += BATCH_SIZE) {
        const batch = mapped.slice(i, i + BATCH_SIZE)
        const res = await api.post(endpoint, { rows: batch })
        aggregate.created += res.data.created ?? 0
        aggregate.skipped += res.data.skipped ?? 0
        aggregate.errors.push(...(res.data.errors ?? []))
        setImportProgress(Math.round(((i + batch.length) / total) * 100))
      }
      setResult(aggregate)
      setStep('result')
      if (aggregate.created > 0) onSuccess()
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Erro ao importar'
      showToast(msg, 'error')
    } finally {
      setImporting(false)
    }
  }

  // Preview mapped data (first 3 rows)
  const previewRows = rows.slice(0, 3).map(r => buildRow(r))

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 16, width: '100%', maxWidth: step === 'map' ? 740 : 620, maxHeight: '90vh',
        overflow: 'auto', padding: '28px 32px',
        boxShadow: '0 24px 48px rgba(0,0,0,0.3)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileSpreadsheet size={20} color="var(--accent)" />
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>
              Importar {TYPE_LABELS[type]}
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        {/* Step: Upload */}
        {step === 'upload' && (
          <div>
            <div style={{
              background: 'var(--surface-3)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '14px 16px', marginBottom: 20,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                  Template de importação
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                  Descarrega o template Excel — ou usa qualquer CSV/Excel e mapeia as colunas no passo seguinte
                </p>
              </div>
              <button onClick={downloadTemplate} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 8, cursor: 'pointer',
                background: 'var(--accent)', color: '#fff', border: 'none',
                fontSize: 13, fontWeight: 600,
              }}>
                <Download size={14} /> Template
              </button>
            </div>

            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) parseFile(f) }}
              style={{
                border: '2px dashed var(--border)', borderRadius: 12,
                padding: '40px 20px', textAlign: 'center', cursor: 'pointer',
                transition: 'border-color 200ms',
              }}
            >
              <Upload size={36} color="var(--text-muted)" style={{ marginBottom: 12 }} />
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                Clica ou arrasta o ficheiro aqui
              </p>
              <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                Suporta .xlsx, .xls, .csv — qualquer formato, qualquer nome de coluna
              </p>
            </div>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) parseFile(f) }} />
          </div>
        )}

        {/* Step: Map columns */}
        {step === 'map' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <FileSpreadsheet size={15} color="var(--text-muted)" />
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{fileName}</span>
              <span style={{
                marginLeft: 'auto', padding: '2px 8px', borderRadius: 20,
                background: 'rgba(16,185,129,0.12)', color: '#10b981',
                fontSize: 11, fontWeight: 700,
              }}>
                {rows.length} linhas
              </span>
            </div>
            <p style={{ margin: '0 0 16px', fontSize: 12, color: 'var(--text-muted)' }}>
              Associa as colunas do teu ficheiro aos campos do CRM. As que foram detetadas automaticamente já estão preenchidas.
            </p>

            <div style={{ display: 'grid', gap: 10, marginBottom: 20 }}>
              {fields.map(field => (
                <div key={field.key} style={{
                  display: 'grid', gridTemplateColumns: '1fr 32px 1fr', alignItems: 'center', gap: 10,
                }}>
                  {/* CRM field */}
                  <div style={{
                    padding: '8px 12px', borderRadius: 8,
                    background: field.required ? 'rgba(46,107,230,0.08)' : 'var(--surface-3)',
                    border: `1px solid ${field.required ? 'rgba(46,107,230,0.3)' : 'var(--border)'}`,
                    fontSize: 12, fontWeight: 600,
                    color: field.required ? 'var(--accent)' : 'var(--text-secondary)',
                  }}>
                    {field.label}{field.required ? ' *' : ''}
                  </div>
                  <ArrowRight size={14} color="var(--text-muted)" style={{ justifySelf: 'center' }} />
                  {/* Column selector */}
                  <select
                    value={mapping[field.key] ?? ''}
                    onChange={e => setMapping(prev => ({ ...prev, [field.key]: e.target.value }))}
                    style={{
                      padding: '8px 10px', borderRadius: 8,
                      border: `1px solid ${mapping[field.key] ? 'var(--accent)' : 'var(--border)'}`,
                      background: 'var(--surface)', color: 'var(--text-primary)',
                      fontSize: 12, cursor: 'pointer', width: '100%',
                    }}
                  >
                    <option value="">— não importar —</option>
                    {headers.map((h, idx) => (
                      <option key={idx} value={String(idx)}>
                        {h || `Coluna ${idx + 1}`} {rows[0]?.[idx] ? `(ex: ${String(rows[0][idx]).slice(0, 30)})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {/* Mini preview */}
            {requiredMapped && previewRows.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>
                  PRÉ-VISUALIZAÇÃO (primeiras {previewRows.length} linhas)
                </p>
                <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                    <thead>
                      <tr style={{ background: 'var(--surface-3)' }}>
                        {fields.filter(f => mapping[f.key]).map(f => (
                          <th key={f.key} style={{ padding: '6px 10px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap', borderBottom: '1px solid var(--border)' }}>
                            {f.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, ri) => (
                        <tr key={ri} style={{ borderBottom: '1px solid var(--border)' }}>
                          {fields.filter(f => mapping[f.key]).map(f => (
                            <td key={f.key} style={{ padding: '5px 10px', color: 'var(--text-primary)', whiteSpace: 'nowrap', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {String(row[f.key] ?? '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {!requiredMapped && (
              <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertCircle size={14} color="#ef4444" />
                <span style={{ fontSize: 12, color: '#ef4444' }}>
                  Tens de mapear o campo obrigatório: <strong>{fields.find(f => f.required)?.label}</strong>
                </span>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'center' }}>
              <button onClick={() => setStep('upload')} style={{
                padding: '9px 20px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              }}>
                Voltar
              </button>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                {importing && (
                  <div style={{ width: 220, background: 'var(--border)', borderRadius: 4, height: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${importProgress}%`, height: '100%', background: 'var(--accent)', transition: 'width 300ms' }} />
                  </div>
                )}
                <button onClick={handleImport} disabled={importing || !requiredMapped} style={{
                  padding: '9px 24px', borderRadius: 8, border: 'none',
                  background: 'var(--accent)', color: '#fff',
                  cursor: importing || !requiredMapped ? 'not-allowed' : 'pointer',
                  fontSize: 13, fontWeight: 600, opacity: importing || !requiredMapped ? 0.6 : 1,
                }}>
                  {importing ? `A importar... ${importProgress}%` : `Importar ${rows.length} registos`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step: Result */}
        {step === 'result' && result && (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{
              width: 60, height: 60, borderRadius: '50%', margin: '0 auto 16px',
              background: result.created > 0 ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <CheckCircle size={28} color={result.created > 0 ? '#10b981' : '#f59e0b'} />
            </div>
            <h3 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
              Importação concluída
            </h3>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 20, marginBottom: 20 }}>
              <div style={{ padding: '12px 20px', borderRadius: 10, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#10b981' }}>{result.created}</p>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>Criados</p>
              </div>
              <div style={{ padding: '12px 20px', borderRadius: 10, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#f59e0b' }}>{result.skipped}</p>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>Ignorados</p>
              </div>
            </div>
            {result.errors.length > 0 && (
              <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px', textAlign: 'left', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <AlertCircle size={14} color="#ef4444" />
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#ef4444' }}>Erros ({result.errors.length})</span>
                </div>
                {result.errors.slice(0, 5).map((e, i) => (
                  <p key={i} style={{ margin: '2px 0', fontSize: 11, color: 'var(--text-muted)' }}>{e}</p>
                ))}
              </div>
            )}
            <button onClick={onClose} style={{
              padding: '10px 28px', borderRadius: 8, border: 'none',
              background: 'var(--accent)', color: '#fff', cursor: 'pointer',
              fontSize: 13, fontWeight: 600,
            }}>
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
