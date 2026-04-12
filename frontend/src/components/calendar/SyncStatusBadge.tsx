import React from 'react'
import { RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'

interface SyncStatusBadgeProps {
  lastSyncedAt?: string | null
  syncing?: boolean
  error?: boolean
  onRetry: () => void
}

function timeAgo(date: string): string {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (diff < 60) return 'agora mesmo'
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `há ${Math.floor(diff / 3600)} h`
  return `há ${Math.floor(diff / 86400)} d`
}

export const SyncStatusBadge: React.FC<SyncStatusBadgeProps> = ({
  lastSyncedAt,
  syncing,
  error,
  onRetry,
}) => {
  if (syncing) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
        background: 'rgba(245,158,11,0.1)', color: '#f59e0b',
        border: '1px solid rgba(245,158,11,0.25)' }}>
        <RefreshCw size={11} style={{ animation: 'spin 1s linear infinite' }} />
        A sincronizar...
      </span>
    )
  }

  if (error) {
    return (
      <span
        onClick={onRetry}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
          background: 'rgba(239,68,68,0.1)', color: '#ef4444',
          border: '1px solid rgba(239,68,68,0.25)', cursor: 'pointer' }}>
        <AlertCircle size={11} />
        Erro · tentar novamente
      </span>
    )
  }

  if (lastSyncedAt) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
        background: 'rgba(16,185,129,0.1)', color: '#10b981',
        border: '1px solid rgba(16,185,129,0.25)' }}>
        <CheckCircle size={11} />
        Sincronizado · {timeAgo(lastSyncedAt)}
      </span>
    )
  }

  return null
}
