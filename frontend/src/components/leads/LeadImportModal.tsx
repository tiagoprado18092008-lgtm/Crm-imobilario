import { useState } from 'react'
import { X, Upload, AlertTriangle, CheckCircle2, FileText } from 'lucide-react'
import { previewLeadImport, commitLeadImport } from '../../api/leads.api'

/**
 * CSV import, in two steps.
 *
 * Nothing is written until the preview has been shown: the file is decoded,
 * phones are normalised and duplicates are found first, and the result of all
 * that is put in front of someone before a single row is saved. An import that
 * silently drops or duplicates rows is worse than one that refuses to run.
 */

type Preview = {
  encoding: string
  repaired: boolean
  headers: string[]
  mapping: Record<string, string | null>
  totalRows: number
  sample: Array<Record<string, string | null>>
  valid: number
  rejected: Array<{ row: number; reason: string; value?: string }>
  duplicates: Array<{ row: number; reason: string; value: string }>
}

const FIELD_LABELS: Record<string, string> = {
  companyName: 'Empresa',
  contactName: 'Contacto',
  phone: 'Telemóvel',
  email: 'Email',
  city: 'Localidade',
  website: 'Website',
  sector: 'Setor',
  notes: 'Notas',
}

export function LeadImportModal({
  onClose,
  onImported,
}: {
  onClose: () => void
  onImported: () => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [mapping, setMapping] = useState<Record<string, string | null>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null)

  const runPreview = async (f: File, overrides?: Record<string, string | null>) => {
    setBusy(true)
    setError(null)
    try {
      const res = await previewLeadImport(f, overrides)
      setPreview(res.data)
      setMapping(res.data.mapping)
    } catch {
      setError('Não foi possível ler o ficheiro. Confirma que é um CSV.')
    } finally {
      setBusy(false)
    }
  }

  const onPick = (f: File | undefined) => {
    if (!f) return
    setFile(f)
    setResult(null)
    runPreview(f)
  }

  const changeMapping = (field: string, header: string | null) => {
    const next = { ...mapping, [field]: header }
    setMapping(next)
    if (file) runPreview(file, next)
  }

  const commit = async () => {
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      const res = await commitLeadImport(file, { mapping })
      setResult(res.data)
    } catch {
      setError('A importação falhou. Nenhuma lead foi criada.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Importar leads"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 950,
        background: 'rgba(12,27,45,0.42)',
        display: 'grid',
        placeItems: 'center',
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(720px, 100%)',
          maxHeight: '86vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--card-radius)',
          boxShadow: '0 24px 64px rgba(12,27,45,0.24)',
          overflow: 'hidden',
          fontFamily: 'var(--font-body)',
        }}
      >
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '13px 16px',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <h2
            style={{
              margin: 0,
              flex: 1,
              fontSize: 16,
              fontWeight: 700,
              fontFamily: 'var(--font-display)',
              color: 'var(--text-primary)',
            }}
          >
            Importar leads
          </h2>
          <button
            onClick={onClose}
            aria-label="Fechar"
            style={{
              width: 30,
              height: 30,
              display: 'grid',
              placeItems: 'center',
              border: 'none',
              borderRadius: 6,
              background: 'transparent',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            <X size={16} />
          </button>
        </header>

        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {result ? (
            <div style={{ textAlign: 'center', padding: '22px 0' }}>
              <span
                style={{
                  display: 'inline-grid',
                  placeItems: 'center',
                  width: 42,
                  height: 42,
                  borderRadius: 11,
                  background: 'rgba(18,128,64,0.10)',
                  color: 'var(--success)',
                }}
              >
                <CheckCircle2 size={22} />
              </span>
              <p style={{ margin: '12px 0 3px', fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
                {result.imported} lead{result.imported === 1 ? '' : 's'} importada
                {result.imported === 1 ? '' : 's'}
              </p>
              {result.skipped > 0 && (
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
                  {result.skipped} linha{result.skipped === 1 ? '' : 's'} ignorada
                  {result.skipped === 1 ? '' : 's'} por estarem incompletas ou repetidas.
                </p>
              )}
            </div>
          ) : !file ? (
            <label
              style={{
                display: 'grid',
                placeItems: 'center',
                gap: 9,
                padding: '38px 16px',
                border: '1.5px dashed var(--border-strong)',
                borderRadius: 10,
                background: 'var(--surface-2)',
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              <Upload size={22} style={{ color: 'var(--text-muted)' }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                Escolher ficheiro CSV
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', maxWidth: 360 }}>
                A codificação é detetada automaticamente, os telemóveis são
                convertidos para +351 e os duplicados são assinalados antes de gravar.
              </span>
              <input
                type="file"
                accept=".csv,text/csv"
                hidden
                onChange={(e) => onPick(e.target.files?.[0])}
              />
            </label>
          ) : (
            <>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                  padding: '9px 12px',
                  marginBottom: 14,
                  borderRadius: 8,
                  background: 'var(--surface-2)',
                }}
              >
                <FileText size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 13, color: 'var(--text-primary)' }}>{file.name}</span>
                {preview && (
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{preview.encoding}</span>
                )}
              </div>

              {busy && !preview && (
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>A analisar o ficheiro…</p>
              )}

              {preview && (
                <>
                  {preview.repaired && (
                    <Note tone="warning">
                      O ficheiro tinha acentos corrompidos (por exemplo “GonÃ§alves”).
                      Foram corrigidos na leitura.
                    </Note>
                  )}

                  <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                    <Tally label="A importar" value={preview.valid} tone="success" />
                    <Tally label="Duplicados" value={preview.duplicates.length} tone="muted" />
                    <Tally label="Com erro" value={preview.rejected.length} tone="danger" />
                    <Tally label="Total" value={preview.totalRows} tone="muted" />
                  </div>

                  <h3 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                    Correspondência de colunas
                  </h3>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
                      gap: 8,
                      marginBottom: 18,
                    }}
                  >
                    {Object.keys(FIELD_LABELS).map((field) => (
                      <label key={field} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                          {FIELD_LABELS[field]}
                        </span>
                        <select
                          value={mapping[field] ?? ''}
                          onChange={(e) => changeMapping(field, e.target.value || null)}
                          style={{
                            height: 30,
                            padding: '0 7px',
                            border: '1px solid var(--border)',
                            borderRadius: 6,
                            background: 'var(--surface)',
                            color: 'var(--text-primary)',
                            fontSize: 13,
                            fontFamily: 'var(--font-body)',
                          }}
                        >
                          <option value="">— não importar —</option>
                          {preview.headers.map((h) => (
                            <option key={h} value={h}>
                              {h}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </div>

                  {(preview.rejected.length > 0 || preview.duplicates.length > 0) && (
                    <>
                      <h3
                        style={{
                          margin: '0 0 8px',
                          fontSize: 13,
                          fontWeight: 700,
                          color: 'var(--text-primary)',
                        }}
                      >
                        Linhas que não vão ser importadas
                      </h3>
                      <ul
                        style={{
                          listStyle: 'none',
                          margin: '0 0 16px',
                          padding: 0,
                          maxHeight: 150,
                          overflowY: 'auto',
                          border: '1px solid var(--border)',
                          borderRadius: 7,
                        }}
                      >
                        {[...preview.rejected, ...preview.duplicates].slice(0, 40).map((r, i) => (
                          <li
                            key={`${r.row}-${i}`}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              padding: '6px 10px',
                              fontSize: 12,
                              borderBottom: '1px solid var(--border)',
                            }}
                          >
                            <span style={{ color: 'var(--text-muted)', minWidth: 52 }}>
                              Linha {r.row}
                            </span>
                            <span style={{ flex: 1, color: 'var(--text-secondary)' }}>{r.reason}</span>
                            {'value' in r && r.value && (
                              <span style={{ color: 'var(--text-muted)' }}>{r.value}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </>
              )}
            </>
          )}

          {error && <Note tone="danger">{error}</Note>}
        </div>

        <footer
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
            padding: '11px 16px',
            borderTop: '1px solid var(--border)',
          }}
        >
          {result ? (
            <button onClick={onImported} style={primaryButton}>
              Ver leads
            </button>
          ) : (
            <>
              <button onClick={onClose} style={secondaryButton}>
                Cancelar
              </button>
              <button
                onClick={commit}
                disabled={!preview || preview.valid === 0 || busy}
                style={{
                  ...primaryButton,
                  opacity: !preview || preview.valid === 0 || busy ? 0.5 : 1,
                  cursor: !preview || preview.valid === 0 || busy ? 'not-allowed' : 'pointer',
                }}
              >
                {busy ? 'A importar…' : preview ? `Importar ${preview.valid}` : 'Importar'}
              </button>
            </>
          )}
        </footer>
      </div>
    </div>
  )
}

const primaryButton: React.CSSProperties = {
  height: 33,
  padding: '0 15px',
  border: 'none',
  borderRadius: 7,
  background: 'var(--primary)',
  color: '#fff',
  fontSize: 13,
  fontWeight: 600,
  fontFamily: 'var(--font-body)',
  cursor: 'pointer',
}

const secondaryButton: React.CSSProperties = {
  height: 33,
  padding: '0 15px',
  border: '1px solid var(--border-strong)',
  borderRadius: 7,
  background: 'var(--surface)',
  color: 'var(--text-primary)',
  fontSize: 13,
  fontWeight: 600,
  fontFamily: 'var(--font-body)',
  cursor: 'pointer',
}

function Tally({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'success' | 'danger' | 'muted'
}) {
  const color =
    tone === 'success' ? 'var(--success)' : tone === 'danger' ? 'var(--danger)' : 'var(--text-secondary)'
  return (
    <span
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 6,
        padding: '7px 11px',
        borderRadius: 7,
        background: 'var(--surface-2)',
      }}
    >
      <span style={{ fontSize: 17, fontWeight: 700, fontFamily: 'var(--font-display)', color }}>
        {value}
      </span>
      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</span>
    </span>
  )
}

function Note({ tone, children }: { tone: 'warning' | 'danger'; children: React.ReactNode }) {
  const color = tone === 'danger' ? 'var(--danger)' : 'var(--warning)'
  return (
    <p
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        margin: '0 0 14px',
        padding: '9px 11px',
        borderRadius: 7,
        background: tone === 'danger' ? 'rgba(200,30,30,0.07)' : 'rgba(166,90,5,0.07)',
        fontSize: 13,
        color: 'var(--text-primary)',
      }}
    >
      <AlertTriangle size={14} style={{ color, flexShrink: 0, marginTop: 2 }} />
      <span>{children}</span>
    </p>
  )
}
