import React, { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { Upload, Download, X, CheckCircle, AlertCircle, FileSpreadsheet } from 'lucide-react'
import api from '../../api/client'
import { useUIStore } from '../../store/ui.store'

type ImportType = 'contacts' | 'opportunities'

interface ImportModalProps {
  type: ImportType
  onClose: () => void
  onSuccess: () => void
}

const CONTACTS_COLUMNS = ['nome*', 'email', 'telefone', 'whatsapp', 'tipo', 'estado', 'origem', 'notas', 'cidade']
const OPPORTUNITIES_COLUMNS = ['titulo*', 'nomeContacto', 'emailContacto', 'fase', 'valor', 'origem', 'notas']

const CONTACTS_SAMPLE = [
  ['nome*', 'email', 'telefone', 'whatsapp', 'tipo', 'estado', 'origem', 'notas', 'cidade'],
  ['João Silva', 'joao@exemplo.com', '+351912345678', '+351912345678', 'BUYER', 'NEW', 'Website', '', 'Lisboa'],
  ['Maria Santos', 'maria@exemplo.com', '+351923456789', '', 'OWNER', 'QUALIFIED', 'Indicação', 'Proprietária VIP', 'Porto'],
]

const OPPORTUNITIES_SAMPLE = [
  ['titulo*', 'nomeContacto', 'emailContacto', 'fase', 'valor', 'origem', 'notas'],
  ['T2 Lisboa Centro', 'João Silva', 'joao@exemplo.com', 'LEAD_IN', '250000', 'Google', ''],
  ['Moradia Porto', 'Maria Santos', 'maria@exemplo.com', 'QUALIFYING', '350000', 'Indicação', 'Urgente'],
]

const TYPE_LABELS: Record<string, string> = {
  contacts: 'Contactos',
  opportunities: 'Oportunidades',
}

export const ImportModal: React.FC<ImportModalProps> = ({ type, onClose, onSuccess }) => {
  const { showToast } = useUIStore()
  const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload')
  const [rows, setRows] = useState<any[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [result, setResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null)
  const [fileName, setFileName] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const columns = type === 'contacts' ? CONTACTS_COLUMNS : OPPORTUNITIES_COLUMNS
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
      const data = new Uint8Array(e.target!.result as ArrayBuffer)
      const workbook = XLSX.read(data, { type: 'array' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const json: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

      if (json.length < 2) {
        showToast('Ficheiro vazio ou sem dados', 'error')
        return
      }

      const rawHeaders = (json[0] as string[]).map(h => String(h).toLowerCase().trim())
      setHeaders(rawHeaders)

      const dataRows = json.slice(1).filter((r: any[]) => r.some(cell => cell !== ''))
      setRows(dataRows)
      setStep('preview')
    }
    reader.readAsArrayBuffer(file)
  }

  const mapRow = (row: any[], hdrs: string[]): any => {
    const get = (keys: string[]) => {
      for (const k of keys) {
        const idx = hdrs.findIndex(h => h.includes(k))
        if (idx !== -1 && row[idx] !== '') return String(row[idx]).trim()
      }
      return undefined
    }

    if (type === 'contacts') {
      return {
        name: get(['nome', 'name']),
        email: get(['email']),
        phone: get(['telefone', 'phone', 'tel']),
        whatsapp: get(['whatsapp']),
        type: get(['tipo', 'type']),
        status: get(['estado', 'status']),
        source: get(['origem', 'source']),
        notes: get(['notas', 'notes']),
        city: get(['cidade', 'city']),
      }
    } else {
      const val = get(['valor', 'value', 'preco'])
      return {
        title: get(['titulo', 'title', 'nome', 'name']),
        contactName: get(['nomecontacto', 'contactname', 'contacto', 'contact']),
        contactEmail: get(['emailcontacto', 'contactemail', 'email']),
        stage: get(['fase', 'stage', 'etapa']),
        value: val ? parseFloat(val.replace(/[^0-9.]/g, '')) || undefined : undefined,
        source: get(['origem', 'source']),
        notes: get(['notas', 'notes']),
      }
    }
  }

  const handleImport = async () => {
    setImporting(true)
    setImportProgress(0)
    const BATCH_SIZE = 2000
    const endpoint = type === 'contacts' ? '/contacts/import' : '/opportunities/import'
    const mapped = rows.map(r => mapRow(r, headers)).filter(r =>
      type === 'contacts' ? r.name : r.title
    )
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
    } catch {
      showToast('Erro ao importar', 'error')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 16, width: '100%', maxWidth: 620, maxHeight: '85vh',
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
            {/* Template download */}
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
                  Descarrega o template Excel com as colunas corretas
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

            {/* Colunas */}
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600 }}>
              COLUNAS SUPORTADAS (* obrigatório)
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
              {columns.map(c => (
                <span key={c} style={{
                  padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                  background: c.includes('*') ? 'rgba(46,107,230,0.12)' : 'var(--surface-3)',
                  color: c.includes('*') ? 'var(--accent)' : 'var(--text-secondary)',
                  border: `1px solid ${c.includes('*') ? 'rgba(46,107,230,0.3)' : 'var(--border)'}`,
                }}>
                  {c}
                </span>
              ))}
            </div>

            {/* Drop zone */}
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) parseFile(f) }}
              style={{
                border: '2px dashed var(--border)', borderRadius: 12,
                padding: '32px 20px', textAlign: 'center', cursor: 'pointer',
                transition: 'border-color 200ms',
              }}
            >
              <Upload size={32} color="var(--text-muted)" style={{ marginBottom: 10 }} />
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                Clica ou arrasta o ficheiro aqui
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                Suporta .xlsx, .xls, .csv
              </p>
            </div>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) parseFile(f) }} />
          </div>
        )}

        {/* Step: Preview */}
        {step === 'preview' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <FileSpreadsheet size={16} color="var(--text-muted)" />
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{fileName}</span>
              <span style={{
                marginLeft: 'auto', padding: '2px 8px', borderRadius: 20,
                background: 'rgba(16,185,129,0.12)', color: '#10b981',
                fontSize: 11, fontWeight: 700,
              }}>
                {rows.length} linhas
              </span>
            </div>

            {/* Preview table */}
            <div style={{ overflowX: 'auto', marginBottom: 20, border: '1px solid var(--border)', borderRadius: 8 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: 'var(--surface-3)' }}>
                    {headers.map((h, i) => (
                      <th key={i} style={{ padding: '8px 10px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap', borderBottom: '1px solid var(--border)' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 5).map((row, ri) => (
                    <tr key={ri} style={{ borderBottom: '1px solid var(--border)' }}>
                      {row.map((cell: any, ci: number) => (
                        <td key={ci} style={{ padding: '7px 10px', color: 'var(--text-primary)', whiteSpace: 'nowrap', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {String(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.length > 5 && (
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16, textAlign: 'center' }}>
                +{rows.length - 5} linhas adicionais
              </p>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setStep('upload')} style={{
                padding: '9px 20px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              }}>
                Voltar
              </button>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, alignItems: 'flex-end' }}>
                {importing && (
                  <div style={{ width: 200, background: 'var(--border)', borderRadius: 4, height: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${importProgress}%`, height: '100%', background: 'var(--accent)', transition: 'width 300ms' }} />
                  </div>
                )}
                <button onClick={handleImport} disabled={importing} style={{
                  padding: '9px 24px', borderRadius: 8, border: 'none',
                  background: 'var(--accent)', color: '#fff', cursor: importing ? 'not-allowed' : 'pointer',
                  fontSize: 13, fontWeight: 600, opacity: importing ? 0.7 : 1,
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
