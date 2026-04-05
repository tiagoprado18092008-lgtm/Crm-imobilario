import React from 'react'

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'default' | 'purple'

interface BadgeProps {
  variant?: BadgeVariant
  small?: boolean
  children: React.ReactNode
  className?: string
}

const variantStyles: Record<BadgeVariant, React.CSSProperties> = {
  success: { background: 'rgba(34,197,94,0.15)', color: '#4ade80' },
  warning: { background: 'rgba(245,158,11,0.15)', color: '#fbbf24' },
  danger:  { background: 'rgba(239,68,68,0.15)',  color: '#f87171' },
  info:    { background: 'rgba(59,130,246,0.15)', color: '#60a5fa' },
  default: { background: 'var(--bg-page)',        color: 'var(--text-muted)', outline: '1px solid var(--border-color)' },
  purple:  { background: 'rgba(139,92,246,0.15)', color: '#a78bfa' },
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  small = false,
  children,
  className = ''
}) => {
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontWeight: 600,
        borderRadius: 20,
        padding: small ? '2px 8px' : '3px 10px',
        fontSize: 11,
        ...variantStyles[variant],
      }}
    >
      {children}
    </span>
  )
}
