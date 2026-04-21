import React from 'react'
import { Loader2 } from 'lucide-react'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  children: React.ReactNode
}

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    background: 'var(--accent)',
    color: '#fff',
    border: 'none',
    boxShadow: '0 2px 8px rgba(46,107,230,0.25)',
  },
  secondary: {
    background: 'var(--surface)',
    color: 'var(--text-primary)',
    border: '1.5px solid var(--border)',
  },
  danger: {
    background: 'var(--danger)',
    color: '#fff',
    border: 'none',
    boxShadow: '0 2px 8px rgba(220,38,38,0.2)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--text-secondary)',
    border: '1px solid transparent',
  },
}

const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
  sm: { padding: '5px 12px', fontSize: 12, height: 32 },
  md: { padding: '0 16px', fontSize: 13, height: 40 },
  lg: { padding: '0 24px', fontSize: 14, height: 44 },
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className = '',
  style,
  onMouseEnter,
  onMouseLeave,
  ...props
}) => {
  const isDisabled = disabled || loading

  const hoverBg: Record<ButtonVariant, string> = {
    primary: 'var(--accent-hover)',
    secondary: 'var(--surface-3)',
    danger: '#B91C1C',
    ghost: 'var(--surface-3)',
  }

  return (
    <button
      {...props}
      disabled={isDisabled}
      onMouseEnter={(e) => {
        if (!isDisabled) (e.currentTarget as HTMLButtonElement).style.background = hoverBg[variant]
        onMouseEnter?.(e)
      }}
      onMouseLeave={(e) => {
        const s = variantStyles[variant]
        ;(e.currentTarget as HTMLButtonElement).style.background = (s.background as string) ?? ''
        onMouseLeave?.(e)
      }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        fontFamily: 'var(--font-body)',
        fontWeight: 600,
        borderRadius: 8,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: isDisabled ? 0.55 : 1,
        transition: 'background 150ms, opacity 150ms, transform 80ms, box-shadow 150ms',
        whiteSpace: 'nowrap',
        ...variantStyles[variant],
        ...sizeStyles[size],
        ...style,
      }}
      className={className}
    >
      {loading && <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />}
      {children}
    </button>
  )
}
