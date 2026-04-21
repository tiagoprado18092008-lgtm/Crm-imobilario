import React, { useState } from 'react'
import { QRCodeSVG as QRCode } from 'qrcode.react'
import { Copy, Check, MessageCircle } from 'lucide-react'
import { Modal } from '../../ui/Modal'

interface Props {
  isOpen: boolean
  onClose: () => void
  url: string
}

export const ShareModal: React.FC<Props> = ({ isOpen, onClose, url }) => {
  const [copied, setCopied] = useState(false)

  const copyLink = async () => {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const waText = encodeURIComponent(`Olha este imóvel: ${url}`)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Partilhar Imóvel" size="sm">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center' }}>
        <QRCode value={url} size={160} />

        <div style={{ width: '100%' }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Link do imóvel</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              readOnly
              value={url}
              style={{ flex: 1, fontSize: 12, background: 'var(--surface-2)', border: '1px solid var(--input-border)', borderRadius: 8, padding: '8px 10px', color: 'var(--text-secondary)' }}
            />
            <button
              onClick={copyLink}
              style={{ padding: '8px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}
            >
              {copied ? <Check size={14} style={{ color: '#4ade80' }} /> : <Copy size={14} />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, width: '100%' }}>
          <a
            href={`https://wa.me/?text=${waText}`}
            target="_blank"
            rel="noreferrer"
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 0', background: '#25d366', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}
          >
            <MessageCircle size={15} /> WhatsApp
          </a>
          <a
            href={`mailto:?subject=Imóvel&body=${waText}`}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 0', background: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}
          >
            Email
          </a>
        </div>
      </div>
    </Modal>
  )
}
