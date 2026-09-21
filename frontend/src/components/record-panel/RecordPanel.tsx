import { useEffect, useRef } from 'react'
import { X, ChevronUp, ChevronDown } from 'lucide-react'

/**
 * Side drawer for opening a record without losing the list behind it.
 *
 * ←/→ move between records so a whole list can be reviewed without closing,
 * Esc closes, and focus returns to the element that opened the panel — the
 * list row — instead of the top of the page.
 */

export type RecordPanelProps = {
  open: boolean
  onClose: () => void
  title: React.ReactNode
  subtitle?: React.ReactNode
  /** Action buttons: Ligar, WhatsApp, Email, Agendar. */
  actions?: React.ReactNode
  /** Record navigation. Omit either to hide its arrow. */
  onPrevious?: () => void
  onNext?: () => void
  width?: number
  children: React.ReactNode
}

export function RecordPanel({
  open,
  onClose,
  title,
  subtitle,
  actions,
  onPrevious,
  onNext,
  width = 520,
  children,
}: RecordPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const restoreFocusTo = useRef<Element | null>(null)

  useEffect(() => {
    if (open) {
      restoreFocusTo.current = document.activeElement
      requestAnimationFrame(() => panelRef.current?.focus())
    } else if (restoreFocusTo.current instanceof HTMLElement) {
      restoreFocusTo.current.focus()
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const typing =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (!typing && e.key === 'ArrowLeft' && onPrevious) {
        e.preventDefault()
        onPrevious()
      } else if (!typing && e.key === 'ArrowRight' && onNext) {
        e.preventDefault()
        onNext()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, onPrevious, onNext])

  if (!open) return null

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 900,
          background: 'rgba(12, 27, 45, 0.28)',
        }}
      />
      <aside
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : 'Detalhe do registo'}
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          zIndex: 901,
          width: `min(${width}px, 100vw)`,
          background: 'var(--surface)',
          borderLeft: '1px solid var(--border)',
          boxShadow: '-8px 0 32px rgba(12, 27, 45, 0.12)',
          display: 'flex',
          flexDirection: 'column',
          outline: 'none',
          animation: `panelIn var(--dur-panel) var(--ease-out)`,
        }}
      >
        <header
          style={{
            padding: '14px 16px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2
              style={{
                margin: 0,
                fontSize: 17,
                fontWeight: 700,
                fontFamily: 'var(--font-display)',
                color: 'var(--text-primary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {title}
            </h2>
            {subtitle && (
              <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
                {subtitle}
              </p>
            )}
          </div>

          <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
            {onPrevious && (
              <IconButton label="Registo anterior" onClick={onPrevious}>
                <ChevronUp size={16} />
              </IconButton>
            )}
            {onNext && (
              <IconButton label="Registo seguinte" onClick={onNext}>
                <ChevronDown size={16} />
              </IconButton>
            )}
            <IconButton label="Fechar" onClick={onClose}>
              <X size={16} />
            </IconButton>
          </div>
        </header>

        {actions && (
          <div
            style={{
              padding: '10px 16px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            {actions}
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>{children}</div>
      </aside>
    </>
  )
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      style={{
        // 32px keeps the target above the 24px minimum with room to spare.
        width: 32,
        height: 32,
        display: 'grid',
        placeItems: 'center',
        border: '1px solid transparent',
        borderRadius: 6,
        background: 'transparent',
        color: 'var(--text-secondary)',
        cursor: 'pointer',
        transition: 'background var(--dur-hover) var(--ease-out)',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-3)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      {children}
    </button>
  )
}
