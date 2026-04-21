import React from 'react'

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'default' | 'purple'

interface BadgeProps {
  variant?: BadgeVariant
  small?: boolean
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

const variantStyles: Record<BadgeVariant, React.CSSProperties> = {
  success: { background: 'rgba(22,163,74,0.12)', color: 'var(--success)' },
  warning: { background: 'rgba(217,119,6,0.12)',  color: 'var(--warning)' },
  danger:  { background: 'rgba(220,38,38,0.10)',  color: 'var(--danger)' },
  info:    { background: 'var(--accent-soft)',    color: 'var(--accent)' },
  default: { background: 'var(--surface-3)', color: 'var(--text-secondary)', outline: '1px solid var(--border)' },
  purple:  { background: 'rgba(124,58,237,0.10)', color: '#7C3AED' },
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  small = false,
  children,
  className = '',
  style,
}) => {
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontFamily: 'var(--font-body)',
        fontWeight: 600,
        borderRadius: 20,
        padding: small ? '2px 8px' : '3px 10px',
        fontSize: 11,
        letterSpacing: '0.02em',
        whiteSpace: 'nowrap',
        ...variantStyles[variant],
        ...style,
      }}
    >
      {children}
    </span>
  )
}
