import React, { useState, useRef } from 'react'
import { Upload, Download, Trash2, FileText } from 'lucide-react'
import type { PropertyDocument } from '../../../types'
import { uploadDocument, deleteDocument } from '../../../api/properties.api'
import { useUIStore } from '../../../store/ui.store'
import { formatDate } from '../../../utils/formatters'

const TIPOS = ['Caderneta Predial', 'Certidão de Teor', 'Licença de Habitabilidade', 'Certificado Energético', 'Planta', 'Contrato', 'Outro']

const formatSize = (bytes?: number) => {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface Props {
  propertyId: string
  documents: PropertyDocument[]
  onChange: (docs: PropertyDocument[]) => void
}

export const DocumentsTab: React.FC<Props> = ({ propertyId, documents, onChange }) => {
  const { showToast } = useUIStore()
  const [uploading, setUploading] = useState(false)
  const [uploadTipo, setUploadTipo] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const apiBase = (import.meta as any).env?.VITE_API_URL?.replace('/api', '') ?? 'http://localhost:3000'

  const handleFile = async (file: File) => {
    setUploading(true)
    try {
      const res = await uploadDocument(propertyId, file, file.name, uploadTipo || undefined)
      onChange([res.data, ...documents])
      showToast('Documento adicionado', 'success')
    } catch {
      showToast('Erro ao carregar documento', 'error')
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleDelete = async (docId: string) => {
    try {
      await deleteDocument(propertyId, docId)
      onChange(documents.filter(d => d.id !== docId))
    } catch {
      showToast('Erro ao eliminar documento', 'error')
    }
  }

  return (
    <div>
      {/* Upload zone */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
        <select
          value={uploadTipo}
          onChange={e => setUploadTipo(e.target.value)}
          style={{ fontSize: 13, background: 'var(--surface-2)', border: '1px solid var(--input-border)', borderRadius: 8, padding: '6px 10px', color: 'var(--text-primary)' }}
        >
          <option value="">Tipo de documento</option>
          {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '6px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', color: 'var(--text-primary)' }}
        >
          <Upload size={14} /> {uploading ? 'A carregar...' : 'Adicionar documento'}
        </button>
        <input ref={inputRef} type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }} />
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        style={{ border: '2px dashed var(--border)', borderRadius: 12, padding: 20, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}
      >
        Ou arraste um documento para aqui
      </div>

      {/* Lista */}
      {documents.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: 24 }}>Sem documentos</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {documents.map(doc => {
            const href = doc.url.startsWith('http') ? doc.url : `${apiBase}${doc.url}`
            return (
              <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10 }}>
                <FileText size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.nome}</p>
                  <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>
                    {doc.tipo && <span>{doc.tipo} · </span>}
                    {formatDate(doc.createdAt)}
                    {doc.tamanho && <span> · {formatSize(doc.tamanho)}</span>}
                  </p>
                </div>
                <a href={href} download target="_blank" rel="noreferrer" style={{ padding: 6, color: 'var(--text-muted)', display: 'flex' }}>
                  <Download size={15} />
                </a>
                <button onClick={() => handleDelete(doc.id)} style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                  <Trash2 size={15} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
