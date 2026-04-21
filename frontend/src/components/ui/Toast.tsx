import React, { useEffect, useState } from 'react'
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUIStore } from '../../store/ui.store'

type ToastType = 'success' | 'error' | 'info' | 'warning'

const config: Record<ToastType, { icon: React.ReactNode; color: string; bg: string; border: string }> = {
  success: {
    icon: <CheckCircle size={16} />,
    color: 'var(--success)',
    bg: 'rgba(22,163,74,0.08)',
    border: 'rgba(22,163,74,0.25)',
  },
  error: {
    icon: <XCircle size={16} />,
    color: 'var(--danger)',
    bg: 'rgba(220,38,38,0.08)',
    border: 'rgba(220,38,38,0.25)',
  },
  warning: {
    icon: <AlertTriangle size={16} />,
    color: 'var(--warning)',
    bg: 'rgba(217,119,6,0.08)',
    border: 'rgba(217,119,6,0.25)',
  },
  info: {
    icon: <Info size={16} />,
    color: 'var(--accent)',
    bg: 'var(--accent-soft)',
    border: 'rgba(46,107,230,0.25)',
  },
}

const DURATION = 4000

export const Toast: React.FC = () => {
  const { toast, clearToast } = useUIStore()
  const [progress, setProgress] = useState(100)

  useEffect(() => {
    if (!toast) return
    setProgress(100)

    const start = Date.now()
    const interval = setInterval(() => {
      const elapsed = Date.now() - start
      const remaining = Math.max(0, 100 - (elapsed / DURATION) * 100)
      setProgress(remaining)
      if (remaining === 0) clearInterval(interval)
    }, 30)

    const timer = setTimeout(() => clearToast(), DURATION)
    return () => {
      clearInterval(interval)
      clearTimeout(timer)
    }
  }, [toast, clearToast])

  const type = (toast?.type ?? 'info') as ToastType
  const cfg = config[type] ?? config.info

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.message}
          initial={{ opacity: 0, x: 40, y: 0 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, x: 40 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 99999,
            minWidth: 280,
            maxWidth: 360,
          }}
        >
          <div
            style={{
              background: 'var(--surface)',
              border: `1px solid ${cfg.border}`,
              borderRadius: 12,
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              overflow: 'hidden',
              fontFamily: 'var(--font-body)',
            }}
          >
            {/* Content */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px' }}>
              <span style={{ color: cfg.color, flexShrink: 0, marginTop: 1 }}>
                {cfg.icon}
              </span>
              <p style={{ fontSize: 13, color: 'var(--text-primary)', flex: 1, margin: 0, fontWeight: 500, lineHeight: 1.4 }}>
                {toast.message}
              </p>
              <button
                onClick={clearToast}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)', padding: 2, flexShrink: 0,
                  display: 'flex', alignItems: 'center', borderRadius: 4,
                }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                <X size={14} />
              </button>
            </div>

            {/* Progress bar */}
            <div style={{ height: 3, background: 'var(--border)' }}>
              <div
                style={{
                  height: '100%',
                  width: `${progress}%`,
                  background: cfg.color,
                  transition: 'width 30ms linear',
                  borderRadius: '0 0 0 0',
                }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
